import { NextRequest, NextResponse } from "next/server"
import { getDriveFileId, hasPdfHeader } from "@/lib/pdf-source"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } })
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function attributes(tag: string) {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g),
    match => [match[1].toLowerCase(), decodeHtml(match[2] ?? match[3])]))
}

function matchesRequestedRange(range: string, partial: RegExpMatchArray) {
  const [start, end, total] = partial.slice(1).map(Number)
  if (![start, end, total].every(Number.isSafeInteger) || start > end || end >= total) return false
  const requested = range.match(/^bytes=(\d*)-(\d*)$/)!
  const expectedStart = requested[1] ? Number(requested[1]) : Math.max(0, total - Number(requested[2]))
  const expectedEnd = requested[1] && requested[2] ? Math.min(Number(requested[2]), total - 1) : total - 1
  return start === expectedStart && end === expectedEnd
}

// Resolve Drive's virus-scan confirmation on the server. Never send its HTML,
// preview iframe, or sign-in redirects to the reader.
function confirmationUrl(html: string, fileId: string): URL | null {
  for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const form = attributes(match[1])
    if (form.id !== "download-form" || (form.method && form.method.toLowerCase() !== "get")) continue
    const url = new URL(form.action || "", "https://drive.usercontent.google.com")
    if (url.protocol !== "https:" || url.hostname !== "drive.usercontent.google.com" || url.pathname !== "/download") continue
    for (const input of match[2].matchAll(/<input\b[^>]*>/gi)) {
      const { name, value } = attributes(input[0])
      if (name && value !== undefined) url.searchParams.set(name, value)
    }
    if (url.searchParams.get("id") === fileId && url.searchParams.has("confirm")) return url
  }
  return null
}

async function inspectBody(response: Response) {
  if (!response.body) throw new Error("The PDF download was empty.")
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    // Read only the prefix before streaming the remaining bytes unchanged.
    while (size < 1024) {
      const { value, done } = await reader.read()
      if (done) break
      chunks.push(value)
      size += value.length
    }
    if (hasPdfHeader(Buffer.concat(chunks))) {
      return { stream: new ReadableStream<Uint8Array>({
        start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)) },
        async pull(controller) {
          try {
            const { value, done } = await reader.read()
            if (done) { reader.releaseLock(); controller.close() }
            else controller.enqueue(value)
          } catch (error) { controller.error(error) }
        },
        cancel(reason) { return reader.cancel(reason) },
      }), html: "" }
    }
    // Bound buffering for unexpected HTML/error responses.
    while (size < 65536) {
      const { value, done } = await reader.read()
      if (done) break
      chunks.push(value)
      size += value.length
    }
    await reader.cancel()
    return { stream: null, html: Buffer.concat(chunks).subarray(0, 65536).toString("utf8") }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
}

export async function GET(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return failure("Cross-site PDF access is not allowed.", 403)
  const { searchParams } = new URL(request.url)
  const bookId = searchParams.get("bookId")
  if (!bookId || !/^[1-9]\d{0,15}$/.test(bookId) || searchParams.has("id") || searchParams.has("url")) {
    return failure("A library book ID is required.", 400)
  }
  const range = request.headers.get("range")
  if (range && (!/^bytes=(?:\d+-\d*|-\d+)$/.test(range) ||
    !range.match(/\d+/g)!.map(Number).every(Number.isSafeInteger))) return failure("Invalid byte range.", 400)

  const supabase = await createClient()
  // Validate against the auth server; never trust client-supplied user IDs.
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return failure("Please sign in to read this book.", 401)
  const { data: book, error: bookError } = await supabase.from("books").select("id,pdf_url").eq("id", bookId).maybeSingle()
  if (bookError) return failure("Unable to check book access. Please retry.", 503)
  if (!book?.pdf_url) return failure("This book has no available PDF.", 404)

  let target: URL
  let fileId: string | null = null
  try {
    const external = new URL(book.pdf_url)
    if (external.protocol !== "https:" || external.username || external.password) return failure("The book's PDF source is invalid.", 502)
    fileId = getDriveFileId(external)
    const resourceKey = external.searchParams.get("resourcekey")
    target = fileId ? new URL("https://drive.usercontent.google.com/download") : external
    if (fileId) {
      target.search = new URLSearchParams({ id: fileId, export: "download", confirm: "t" }).toString()
      if (resourceKey) target.searchParams.set("resourcekey", resourceKey)
    }
  } catch {
    return failure("The book's PDF source is invalid.", 502)
  }

  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45000)])
    for (let attempt = 0; attempt < 2; attempt++) {
      const upstream = await fetch(target, {
        cache: "no-store", signal,
        headers: { Accept: "application/pdf, application/octet-stream;q=0.9, */*;q=0.5", "Accept-Encoding": "identity", ...(range ? { Range: range } : {}) },
      })
      if (upstream.status === 416) {
        await upstream.body?.cancel()
        return new NextResponse(null, { status: 416, headers: {
          "Content-Range": upstream.headers.get("content-range") || "bytes */0", "Cache-Control": "no-store",
        } })
      }
      if (!upstream.ok) {
        await upstream.body?.cancel()
        return failure(`PDF download failed (${upstream.status}). Check that the file is shared publicly and its download quota is available.`,
          [403, 404, 429].includes(upstream.status) ? upstream.status : 502)
      }
      const contentRange = upstream.headers.get("content-range")
      const partial = contentRange?.match(/^bytes (\d+)-(\d+)\/(\d+)$/)
      const encoding = upstream.headers.get("content-encoding")
      const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase()
      if (upstream.status === 206 && (!range || !partial || !matchesRequestedRange(range, partial) || encoding || !["application/pdf", "application/octet-stream"].includes(contentType || ""))) {
        await upstream.body?.cancel()
        return failure("The PDF server returned an invalid partial response.", 502)
      }
      // A nonzero range cannot contain the PDF header. Its Content-Range and
      // binary MIME are checked above; full/initial responses are signature-checked.
      const { stream, html } = upstream.status === 206 && partial && Number(partial[1]) > 0
        ? { stream: upstream.body, html: "" } : await inspectBody(upstream)
      if (stream) {
        const headers = new Headers({
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="book.pdf"',
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-origin",
          "X-Frame-Options": "DENY",
          "Content-Security-Policy": "frame-ancestors 'none'",
          "Accept-Ranges": !encoding && upstream.headers.get("accept-ranges") === "bytes" ? "bytes" : "none",
          "Vary": "Cookie",
        })
        // Length is safe only for identity responses; fetch otherwise decompresses.
        const length = upstream.headers.get("content-length")
        if (!encoding && length && /^\d+$/.test(length)) headers.set("Content-Length", length)
        if (upstream.status === 206 && contentRange) headers.set("Content-Range", contentRange)
        return new NextResponse(stream, { status: upstream.status, headers })
      }
      const confirmed = fileId && attempt === 0 ? confirmationUrl(html, fileId) : null
      if (!confirmed) return failure("The source returned a web page instead of PDF bytes. Check the file's public sharing permissions and Google Drive download quota.", 502)
      target = confirmed
    }
    return failure("Google Drive did not return a PDF after download confirmation.", 502)
  } catch (error) {
    console.error("PDF proxy download failed:", error instanceof Error ? error.message : error)
    return failure("Unable to download the PDF. Please retry.", 502)
  }
}
