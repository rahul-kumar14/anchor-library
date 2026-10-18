# Native book reader

Both readers share `PdfCanvas`, `useReadingProgress`, and `useBookAnnotations`.
PDF.js uses a bundled, same-origin worker from the installed dependency. Keep
React-PDF and its PDF.js dependency aligned; avoid overriding workerSrc elsewhere.

The browser requests `/api/pdf-proxy?bookId=<library ID>`. The route verifies the
Supabase user on every request and resolves the stored PDF source on the server.
Caller-provided Drive IDs and arbitrary URLs are rejected. The route validates
full-file PDF signatures, resolves Drive's download confirmation server-side,
and preserves valid binary byte ranges for PDF.js streaming. Responses are
private and not stored in shared caches. Notes are confirmed by Supabase before
the draft is cleared. Reading progress saves only after the previous position
and the actual PDF page count are known.

## Protection boundaries

Login checks, registered-book checks, same-origin response restrictions,
watermarks, suppressed PDF context menus and a print stylesheet deter casual
download/redistribution. These are **not DRM**. A browser rendering a PDF receives
its bytes; an authenticated user can extract them or take screenshots. Do not
claim that downloads are impossible.

Existing Google Drive files remain publicly shared. Their URLs may also remain
available through the existing Supabase books table policies and other catalog
queries. This change does not alter Drive sharing or database column grants.
For source confidentiality, migrate PDFs to private storage and restrict source
metadata in Supabase. A system that never sends PDF bytes would require server
rendering pages and a different text/annotation architecture.

## Validation

Run `npm run test:pdf` and `npm run build`. Test with a normal signed-in account:
open a room book, jump pages, zoom, save a note and highlight, reopen the book,
and confirm progress/notes also appear in the full reader. Enter Zen Mode and
confirm the book stays visible. Test mobile notes access and book switching.
Anonymous PDF requests must return 401 and arbitrary source requests 400.
