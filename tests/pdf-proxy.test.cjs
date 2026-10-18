const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const Module = require("node:module")
const { test, beforeEach } = require("node:test")
const ts = require("typescript")
const { NextRequest } = require("next/server")

// Exercise the actual route with Web Request/Response streams. Transpile in
// memory so these tests need no test framework, Next server, or Drive access.
function loadTs(relativePath, aliases = {}) {
  const filename = path.resolve(__dirname, "..", relativePath)
  const compiled = new Module(filename, module)
  compiled.filename = filename
  compiled.paths = Module._nodeModulePaths(path.dirname(filename))
  const requireModule = compiled.require.bind(compiled)
  compiled.require = name => aliases[name] || requireModule(name)
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
  return compiled.exports
}

const source = loadTs("src/lib/pdf-source.ts")
let signedIn = true
let registeredSource = "https://drive.google.com/file/d/public_drive_file_123/preview"
const server = { createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: signedIn ? { id: "reader-123" } : null }, error: null }) },
  from: () => ({ select() { return this }, eq() { return this }, async maybeSingle() {
    return { data: registeredSource ? { id: 77, pdf_url: registeredSource } : null, error: null }
  } }),
}) }
beforeEach(() => { signedIn = true; registeredSource = "https://drive.google.com/file/d/public_drive_file_123/preview" })
const { GET } = loadTs("src/app/api/pdf-proxy/route.ts", { "@/lib/pdf-source": source, "@/lib/supabase/server": server })
const fileId = "public_drive_file_123"
const request = query => new NextRequest(`https://library.example/api/pdf-proxy?${query}`)

test("extracts registered Drive sources while clients address only library book IDs", () => {
  for (const url of [`https://drive.google.com/file/d/${fileId}/preview`,
    `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    `https://drive.google.com/open?id=${fileId}`]) assert.equal(source.getDriveFileId(new URL(url)), fileId)
  assert.equal(source.getDriveFileId(new URL("https://evil.example/file/d/other")), null)
  assert.equal(source.getPdfSourceUrl(77), "/api/pdf-proxy?bookId=77")
})

test("rejects missing/malformed input without fetching", async t => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw Error("must not fetch") })
  for (const query of ["", "id=bad%26id", "url=not-a-url", "url=http://files.example/book.pdf", "url=file:///etc/passwd"]) {
    assert.equal((await GET(request(query))).status, 400)
  }
  assert.equal(fetch.mock.callCount(), 0)
})

test("streams split PDF headers and non-ASCII binary bytes without alteration", async t => {
  const bytes = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from([0, 128, 255, 194, 10]), Buffer.alloc(4096, 218)])
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 2))
      controller.enqueue(bytes.subarray(2, 100))
      controller.enqueue(bytes.subarray(100))
      controller.close()
    },
  }), { headers: { "Content-Type": "application/octet-stream", "Content-Encoding": "gzip", "Content-Length": "17" } }))
  const response = await GET(request("bookId=77"))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Content-Type"), "application/pdf")
  assert.equal(response.headers.get("Content-Encoding"), null)
  assert.equal(response.headers.get("Content-Length"), null)
  assert.match(response.headers.get("Cache-Control"), /no-store/)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
})

test("rejects status-200 HTML even when upstream labels it application/pdf", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("<!doctype html><title>Sign in to Google Drive</title>", {
    headers: { "Content-Type": "application/pdf" },
  }))
  const response = await GET(request("bookId=77"))
  assert.equal(response.status, 502)
  assert.match((await response.json()).error, /web page instead of PDF/)
  assert.equal(response.headers.get("Cache-Control"), "no-store")
})

test("handles Drive download confirmation entirely on the server", async t => {
  const pdf = Buffer.from("%PDF-1.4\nserver-confirmed binary file")
  let calls = 0
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.cache, "no-store")
    if (++calls === 1) return new Response(`<form id="download-form" action="https://drive.usercontent.google.com/download" method="get">
      <input name="id" value="${fileId}"><input name="confirm" value="t"><input name="uuid" value="abc&amp;123"></form>`)
    assert.equal(url.searchParams.get("id"), fileId)
    assert.equal(url.searchParams.get("uuid"), "abc&123")
    return new Response(pdf)
  })
  const response = await GET(request("bookId=77"))
  assert.equal(calls, 2)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf)
})

test("does not follow arbitrary confirmation actions or substitute another Drive ID", async t => {
  for (const [action, id] of [["https://evil.example/download", fileId],
    ["https://drive.usercontent.google.com/download", "other_file_123"]]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => new Response(
      `<form id="download-form" action="${action}"><input name="id" value="${id}"><input name="confirm" value="t"></form>`,
    ))
    assert.equal((await GET(request("bookId=77"))).status, 502)
    assert.equal(fetch.mock.callCount(), 1)
    t.mock.restoreAll()
  }
})

test("preserves useful upstream access/quota statuses and rejects empty downloads", async t => {
  for (const status of [403, 404, 429]) {
    t.mock.method(globalThis, "fetch", async () => new Response("denied", { status }))
    const response = await GET(request("bookId=77"))
    assert.equal(response.status, status)
    assert.match((await response.json()).error, /PDF download failed/)
    t.mock.restoreAll()
  }
  t.mock.method(globalThis, "fetch", async () => new Response(""))
  assert.equal((await GET(request("bookId=77"))).status, 502)
})

test("aborting the downstream stream cancels the upstream reader", async t => {
  let cancelled = false
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(2048)])) },
    cancel() { cancelled = true },
  })))
  const response = await GET(request("bookId=77"))
  await response.body.cancel()
  assert.equal(cancelled, true)
})

test("requires verified authentication before any PDF download", async t => {
  signedIn = false
  const fetch = t.mock.method(globalThis, "fetch", () => { throw Error("must not fetch") })
  const response = await GET(request("bookId=77"))
  assert.equal(response.status, 401)
  assert.equal(fetch.mock.callCount(), 0)
})

test("rejects cross-site requests, arbitrary source parameters and unregistered books", async t => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw Error("must not fetch") })
  const crossSite = new NextRequest("https://library.example/api/pdf-proxy?bookId=77", { headers: { "sec-fetch-site": "cross-site" } })
  assert.equal((await GET(crossSite)).status, 403)
  assert.equal((await GET(request("bookId=77&url=https://evil.example/file.pdf"))).status, 400)
  registeredSource = null
  assert.equal((await GET(request("bookId=77"))).status, 404)
  assert.equal(fetch.mock.callCount(), 0)
})

test("forwards authenticated byte ranges without modifying their binary data", async t => {
  const bytes = Buffer.alloc(100, 219)
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.headers.Range, "bytes=100-199")
    return new Response(bytes, { status: 206, headers: {
      "Content-Type": "application/octet-stream", "Content-Range": "bytes 100-199/300",
      "Content-Length": "100", "Accept-Ranges": "bytes",
    } })
  })
  const response = await GET(new NextRequest("https://library.example/api/pdf-proxy?bookId=77", { headers: { Range: "bytes=100-199" } }))
  assert.equal(response.status, 206)
  assert.equal(response.headers.get("Content-Range"), "bytes 100-199/300")
  assert.equal(response.headers.get("Content-Length"), "100")
  assert.equal(response.headers.get("Cross-Origin-Resource-Policy"), "same-origin")
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
})

test("rejects HTML and malformed range responses", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>login required</html>", { status: 206, headers: {
    "Content-Type": "text/html", "Content-Range": "bytes 100-199/300",
  } }))
  assert.equal((await GET(new NextRequest("https://library.example/api/pdf-proxy?bookId=77", { headers: { Range: "bytes=100-199" } }))).status, 502)
  assert.equal((await GET(new NextRequest("https://library.example/api/pdf-proxy?bookId=77", { headers: { Range: "bytes=0-20,40-60" } }))).status, 400)
})

test("rejects a partial response for a different requested byte range", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(Buffer.alloc(100), { status: 206, headers: {
    "Content-Type": "application/pdf", "Content-Range": "bytes 200-299/500",
  } }))
  const response = await GET(new NextRequest("https://library.example/api/pdf-proxy?bookId=77", { headers: { Range: "bytes=100-199" } }))
  assert.equal(response.status, 502)
})
