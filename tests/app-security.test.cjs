const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const Module = require("node:module")
const { test, beforeEach } = require("node:test")
const ts = require("typescript")
const { NextRequest } = require("next/server")

function loadTs(relativePath, aliases = {}) {
  const filename = path.resolve(__dirname, "..", relativePath)
  const compiled = new Module(filename, module)
  compiled.filename = filename
  compiled.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = compiled.require.bind(compiled)
  compiled.require = name => aliases[name] || original(name)
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
  return compiled.exports
}

const owner = "11111111-1111-4111-8111-111111111111"
const other = "22222222-2222-4222-8222-222222222222"
const thread = "33333333-3333-4333-8333-333333333333"
let user, rows, calls, isAdmin
const admin = { from(table) {
  const query = { table, op: "select", filters: [], values: null, single: false }
  const builder = {
    select() { return this },
    eq(key, value) { query.filters.push([key, value]); return this },
    neq() { return this }, gte() { return this }, order() { return this }, limit() { return this }, or() { return this }, in() { return this },
    insert(values) { query.op = "insert"; query.values = values; return this },
    update(values) { query.op = "update"; query.values = values; return this },
    delete() { query.op = "delete"; return this },
    maybeSingle() { query.single = true; return this },
    single() { query.single = true; return this },
    then(resolve, reject) {
      calls.push(structuredClone(query))
      let data = rows[table] || []
      if (table === "profiles" && !rows.profiles) data = [{ id: owner, is_admin: isAdmin }]
      if (query.op === "select") data = data.filter(row => query.filters.every(([key, value]) => row[key] === value))
      if (query.op === "insert") data = Array.isArray(query.values) ? query.values : [{ id: "fixture-created", ...query.values }]
      if (query.op === "update" || query.op === "delete") data = []
      return Promise.resolve({ data: query.single ? data[0] || null : data, error: null }).then(resolve, reject)
    },
  }
  return builder
}, auth: { admin: { deleteUser() { throw Error("No real account deletion in tests") } } } }
const server = { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) }
const access = loadTs("src/lib/server/access.ts", { "@/lib/supabase/server": server })
const aliases = { "@/lib/server/access": access, "@/lib/supabase/admin": { createAdminClient: () => admin }, "@/lib/supabase/server": server }
const messages = loadTs("src/app/api/chat/messages/route.ts", aliases)
const requests = loadTs("src/app/api/chat/request/route.ts", aliases)
const favorites = loadTs("src/app/api/favorites/route.ts", aliases)
const accounts = loadTs("src/app/api/admin/users/route.ts", aliases)
const profile = loadTs("src/app/api/user/profile/[id]/route.ts", aliases)
const notifications = loadTs("src/app/api/notifications/route.ts", aliases)
const retiredLogin = loadTs("src/app/api/auth/resolve-identifier/route.ts")
const presence = loadTs("src/lib/study-presence.ts")
const redirect = loadTs("src/lib/auth-redirect.ts")
const timer = loadTs("src/lib/focus-timer.ts")
const req = (url, method = "GET", body) => new NextRequest("https://library.example" + url, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) })
beforeEach(() => { user = { id: owner }; rows = {}; calls = []; isAdmin = false })

test("room observers and duplicate tabs never invent extra people", () => {
  assert.deepEqual(presence.uniqueStudyMembers({ observers: [{}, { id: null }], a: [{ id: owner }, { id: owner }], b: [{ id: other }] }), [owner, other])
  assert.deepEqual(presence.uniqueStudyMembers({}), [])
  assert.equal(presence.isRoomPage("/study-rooms", "silent"), false)
  assert.equal(presence.isRoomPage("/library", "silent"), false)
  assert.equal(presence.isRoomPage("/study-rooms/silent", "silent"), true)
})

test("redirects reject external, encoded external and backslash destinations", () => {
  for (const value of ["https://evil.example", "//evil.example", "/%2Fevil.example", "/\\evil.example", "/%5Cevil.example", "/%0aevil", "/%invalid"]) assert.equal(redirect.safeAuthRedirect(value), "/dashboard")
  assert.equal(redirect.safeAuthRedirect("/read/77?page=3"), "/read/77?page=3")
})

test("focus timer accounts for background-tab elapsed time across breaks", () => {
  assert.deepEqual(timer.advanceFocusTimer({ mode: "work", remaining: 60 }, 60, 25), { mode: "break", remaining: 300 })
  assert.deepEqual(timer.advanceFocusTimer({ mode: "work", remaining: 60 }, 400, 25), { mode: "work", remaining: 1460 })
  assert.deepEqual(timer.advanceFocusTimer({ mode: "work", remaining: 60 }, 2200, 25), { mode: "work", remaining: 1460 })
  assert.deepEqual(timer.advanceFocusTimer({ mode: "break", remaining: 300 }, -2, 50), { mode: "break", remaining: 300 })
})

test("client IDs cannot replace authentication on message reads or sends", async () => {
  user = null
  assert.equal((await messages.GET(req(`/api/chat/messages?conversation_id=${thread}&user_id=${owner}`))).status, 401)
  assert.equal((await messages.POST(req("/api/chat/messages", "POST", { conversation_id: thread, sender_id: owner, content: "hello" }))).status, 401)
  assert.equal(calls.length, 0)
})

test("non-participants cannot read or send private messages", async () => {
  assert.equal((await messages.GET(req(`/api/chat/messages?conversation_id=${thread}&user_id=${other}`))).status, 403)
  assert.equal((await messages.POST(req("/api/chat/messages", "POST", { conversation_id: thread, content: "hello" }))).status, 403)
  assert.ok(calls.every(call => call.table === "conversation_participants"))
  assert.ok(calls.every(call => call.filters.some(([key, value]) => key === "user_id" && value === owner)))
})

test("room message sender is the verified account, even with spoofed sender_id", async () => {
  const response = await messages.POST(req("/api/chat/messages", "POST", { conversation_id: access.ROOM_CONVERSATIONS.silent, sender_id: other, content: "  fixture message  " }))
  assert.equal(response.status, 200)
  assert.deepEqual(calls.find(call => call.table === "messages").values, { conversation_id: access.ROOM_CONVERSATIONS.silent, sender_id: owner, content: "fixture message" })
})

test("reading a private thread marks only its verified participant as read", async () => {
  rows.conversation_participants = [{ conversation_id: thread, user_id: owner }]
  rows.messages = [{ id: "latest", conversation_id: thread, is_deleted: false, created_at: "2026-10-18" }]
  const response = await messages.GET(req(`/api/chat/messages?conversation_id=${thread}`))
  assert.equal(response.status, 200)
  assert.match(response.headers.get("Cache-Control"), /no-store/)
  const update = calls.find(call => call.op === "update")
  assert.deepEqual(update.filters, [["conversation_id", thread], ["user_id", owner]])
  assert.ok(!calls.some(call => call.op === "delete"), "Reading must never globally delete history")
})

test("invalid and oversized messages cannot reach database writes", async () => {
  for (const content of ["", "   ", "x".repeat(4001), 123]) assert.equal((await messages.POST(req("/api/chat/messages", "POST", { conversation_id: thread, content }))).status, 400)
  assert.equal(calls.length, 0)
})

test("only a pending chat request's recipient may accept or decline", async () => {
  rows.chat_requests = [{ id: 7, from_user_id: owner, to_user_id: other, status: "pending" }]
  assert.equal((await requests.PUT(req("/api/chat/request", "PUT", { request_id: 7, action: "accept", to_user_id: owner }))).status, 403)
  assert.ok(!calls.some(call => call.op !== "select"))
  calls = []
  rows.chat_requests = [{ id: 7, from_user_id: other, to_user_id: owner, status: "accepted" }]
  assert.equal((await requests.PUT(req("/api/chat/request", "PUT", { request_id: 7, action: "decline" }))).status, 409)
  assert.ok(!calls.some(call => call.op !== "select"))
})

test("recipient can decline their pending request without touching another account", async () => {
  rows.chat_requests = [{ id: 7, from_user_id: other, to_user_id: owner, status: "pending" }]
  assert.equal((await requests.PUT(req("/api/chat/request", "PUT", { request_id: 7, action: "decline" }))).status, 200)
  assert.deepEqual(calls.find(call => call.op === "update").filters, [["id", 7], ["to_user_id", owner], ["status", "pending"]])
})

test("saved books require authentication and validated input", async () => {
  user = null
  assert.equal((await favorites.GET()).status, 401)
  assert.equal((await favorites.PUT(req("/api/favorites", "PUT", { bookId: 77, favorite: true, user_id: owner }))).status, 401)
  user = { id: owner }
  for (const bookId of [0, -1, "77,or", "1.2"]) assert.equal((await favorites.PUT(req("/api/favorites", "PUT", { bookId, favorite: true }))).status, 400)
  assert.equal(calls.length, 0)
})

test("saving/removing favorites always scopes records to the verified owner", async () => {
  rows.books = [{ id: 77 }]
  assert.equal((await favorites.PUT(req("/api/favorites", "PUT", { bookId: 77, favorite: true, user_id: other }))).status, 200)
  assert.deepEqual(calls.find(call => call.op === "insert").values, { user_id: owner, book_id: 77 })
  calls = []
  assert.equal((await favorites.PUT(req("/api/favorites", "PUT", { bookId: 77, favorite: false, user_id: other }))).status, 200)
  assert.deepEqual(calls.find(call => call.op === "delete").filters, [["user_id", owner], ["book_id", 77]])
})

test("repeating save does not duplicate an existing favorite", async () => {
  rows.books = [{ id: 77 }]
  rows.favorites = [{ id: 1, user_id: owner, book_id: 77 }]
  assert.equal((await favorites.PUT(req("/api/favorites", "PUT", { bookId: 77, favorite: true }))).status, 200)
  assert.ok(!calls.some(call => call.op === "insert"))
})

test("client admin flag cannot grant account-management access", async () => {
  assert.equal((await accounts.PATCH(req("/api/admin/users", "PATCH", { userId: other, isAdmin: true, actor_id: other }))).status, 403)
  assert.equal((await accounts.DELETE(req("/api/admin/users", "DELETE", { userId: other }))).status, 403)
  assert.ok(!calls.some(call => call.op !== "select"))
})

test("administrator cannot accidentally demote or delete their own account", async () => {
  isAdmin = true
  assert.equal((await accounts.PATCH(req("/api/admin/users", "PATCH", { userId: owner, isAdmin: false }))).status, 409)
  assert.equal((await accounts.DELETE(req("/api/admin/users", "DELETE", { userId: owner }))).status, 409)
})

test("another member's reading history stays private despite spoofed viewer ID", async () => {
  rows.profiles = [{ id: other, username: "fixture", reading_streak: 5 }]
  rows.reading_progress = [{ user_id: other, books: { title: "Private book" } }]
  const response = await profile.GET(req(`/api/user/profile/${other}?current_user_id=${other}`), { params: Promise.resolve({ id: other }) })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.reading_history_private, true)
  assert.deepEqual(body.books, [])
  assert.equal(body.stats.reading_streak, 0)
  assert.ok(!calls.some(call => call.table === "reading_progress"))
})

test("notification read mutation uses verified account ownership", async () => {
  const response = await notifications.PATCH(req("/api/notifications", "PATCH", { id: "notice-7", user_id: other }))
  assert.equal(response.status, 200)
  assert.deepEqual(calls.find(call => call.op === "update").filters, [["id", "notice-7"], ["user_id", owner]])
})

test("the old username lookup cannot disclose account emails", async () => {
  const response = await retiredLogin.POST(req("/api/auth/resolve-identifier", "POST", { identifier: "fixture" }))
  assert.equal(response.status, 410)
  assert.equal((await response.json()).email, undefined)
})

test("login keeps account resolution on the server and returns no email/token", async () => {
  const login = loadTs("src/app/api/auth/login/route.ts", { ...aliases,
    "@/lib/supabase/server": { createClient: async () => ({
      auth: { signInWithPassword: async credentials => {
        assert.deepEqual(credentials, { email: "fixture@example.invalid", password: "fixture-only-password" })
        return { data: { user: { id: owner } }, error: null }
      } }, from: admin.from,
    }) },
  })
  rows.profiles = [{ id: owner, username: "fixture", email: "fixture@example.invalid", is_admin: false }]
  const response = await login.POST(req("/api/auth/login", "POST", { identifier: "FIXTURE", password: "fixture-only-password" }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, isAdmin: false })
})

test("cross-site login and malformed credentials are rejected before account lookup", async () => {
  const login = loadTs("src/app/api/auth/login/route.ts", aliases)
  const crossSite = new NextRequest("https://library.example/api/auth/login", { method: "POST", headers: { "sec-fetch-site": "cross-site" } })
  assert.equal((await login.POST(crossSite)).status, 403)
  assert.equal((await login.POST(req("/api/auth/login", "POST", { identifier: {}, password: "fixture" }))).status, 400)
  assert.equal(calls.length, 0)
})
