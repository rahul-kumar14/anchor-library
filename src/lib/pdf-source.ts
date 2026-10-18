const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com", "drive.usercontent.google.com"])

export function getDriveFileId(url: URL): string | null {
  if (!DRIVE_HOSTS.has(url.hostname)) return null
  const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get("id")
  return id && /^[\w-]+$/.test(id) ? id : null
}

export function getPdfSourceUrl(bookId: string | number): string {
  return `/api/pdf-proxy?${new URLSearchParams({ bookId: String(bookId) })}`
}

// PDF.js permits a header within the first 1024 bytes. Never trust MIME alone:
// Drive can return a status-200 HTML login/confirmation page for a download URL.
export function hasPdfHeader(bytes: Uint8Array): boolean {
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-
  const limit = Math.min(bytes.length - header.length, 1019)
  for (let i = 0; i <= limit; i++) {
    if (header.every((value, offset) => bytes[i + offset] === value)) return true
  }
  return false
}
