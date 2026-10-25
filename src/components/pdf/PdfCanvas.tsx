"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { getPdfSourceUrl } from "@/lib/pdf-source"
import styles from "./PdfCanvas.module.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Configure synchronously in the module rendering Document/Page. Bundling gives
// us a same-origin, hashed worker from the exact installed PDF.js version.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url,
).toString()

type Props = {
  bookId: string | number
  watermark?: string
  pageNumber: number
  scale: number
  width?: number
  pageClassName?: string
  highlights: { page_number: number; selected_text?: string; color?: string | null }[]
  onLoadSuccess: (pdf: { numPages: number }) => void
  onPageChange: (page: number) => void
}

// Keep options and file identity stable: zoom, timer and note updates must not
// destroy PDF.js loading tasks. Range/stream loading avoids full-file buffering.
const PDF_OPTIONS = { isEvalSupported: false, rangeChunkSize: 262144 }

export default function PdfCanvas(props: Props) {
  // Page and zoom changes keep Document mounted; switching books replaces it.
  return <PdfCanvasSource key={props.bookId} {...props} />
}

function PdfCanvasSource({ bookId, watermark, pageNumber, scale, width, pageClassName, highlights, onLoadSuccess, onPageChange }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [progress, setProgress] = useState(0)
  const container = useRef<HTMLDivElement>(null)
  const file = useMemo(() => ({ url: `${getPdfSourceUrl(bookId)}&attempt=${attempt}`, withCredentials: true }), [bookId, attempt])

  // Precision Highlight Algorithm:
  // Replaces the naive `quote.includes(text) || text.includes(quote)` check which previously
  // highlighted every single line/span that contained generic words like 'the', 'is', 'a', etc.
  // Now only highlights spans that actually contain the exact word/phrase selected by user.
  const applyHighlights = useCallback(() => {
    const pageHighlights = highlights.filter(a => a.page_number === pageNumber && a.selected_text?.trim())
    const textSpans = container.current?.querySelectorAll<HTMLSpanElement>(".react-pdf__Page__textContent span")
    if (!textSpans || textSpans.length === 0) return

    // 1. Reset all spans first
    textSpans.forEach(span => {
      span.style.backgroundColor = ""
      span.style.borderBottom = ""
      span.style.borderRadius = ""
    })

    if (pageHighlights.length === 0) return

    const colors: Record<string, [string, string]> = {
      amber: ["rgba(245, 158, 11, 0.35)", "#d97706"],
      blue: ["rgba(96, 165, 250, 0.35)", "#2563eb"],
      pink: ["rgba(244, 114, 182, 0.32)", "#db2777"],
      green: ["rgba(74, 222, 128, 0.32)", "#16a34a"],
    }

    // Build full text map across all text spans to handle multi-span selections accurately
    const spanList = Array.from(textSpans)
    let fullPageText = ""
    const spanCharRanges: { span: HTMLSpanElement; start: number; end: number }[] = []

    for (const span of spanList) {
      const text = span.textContent || ""
      const start = fullPageText.length
      const end = start + text.length
      spanCharRanges.push({ span, start, end })
      fullPageText += text
    }

    const cleanFullText = fullPageText.replace(/\s+/g, " ")

    pageHighlights.forEach(item => {
      const quote = (item.selected_text || "").trim()
      if (!quote) return

      const colorPair = colors[item.color || "amber"] || colors.amber
      const cleanQuote = quote.replace(/\s+/g, " ")

      // If selection is a single word (e.g. 'the', 'chapter', 'swami')
      const words = cleanQuote.split(/\s+/).filter(Boolean)
      const isSingleWord = words.length === 1

      // Strategy 1: Check full-page character offset matches
      // Build safe regex: whole-word boundary if single word, or phrase boundary
      let regex: RegExp | null = null
      try {
        if (isSingleWord) {
          const escaped = words[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          regex = new RegExp(`(?:^|[^\\p{L}\\p{N}_])(${escaped})(?:$|[^\\p{L}\\p{N}_])`, "gui")
        } else {
          const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\n]+")
          regex = new RegExp(escapedWords, "gi")
        }
      } catch {
        regex = null
      }

      let matchedSpans = new Set<HTMLSpanElement>()

      if (regex) {
        let match: RegExpExecArray | null
        while ((match = regex.exec(fullPageText)) !== null) {
          // If regex captured a group (like word without boundary punctuation), use group index
          const matchText = match[1] || match[0]
          const matchStart = match.index + (match[1] ? match[0].indexOf(match[1]) : 0)
          const matchEnd = matchStart + matchText.length

          for (const range of spanCharRanges) {
            if (Math.max(range.start, matchStart) < Math.min(range.end, matchEnd)) {
              matchedSpans.add(range.span)
            }
          }
        }
      }

      // Strategy 2: If multi-span regex didn't catch due to PDF text chunking, fallback to individual span exact word match
      if (matchedSpans.size === 0) {
        spanList.forEach(span => {
          const spanText = (span.textContent || "").trim()
          if (!spanText) return

          if (isSingleWord) {
            // Strict exact match or bounded word match in this span ONLY
            const cleanSpan = spanText.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "")
            if (cleanSpan.toLowerCase() === words[0].toLowerCase()) {
              matchedSpans.add(span)
            }
          } else {
            // Multi-word quote: only match if span is meaningfully part of the phrase
            if (cleanQuote.toLowerCase().includes(spanText.toLowerCase()) && spanText.length >= 4) {
              matchedSpans.add(span)
            }
          }
        })
      }

      // Apply styling only to genuine matched spans
      matchedSpans.forEach(span => {
        span.style.backgroundColor = colorPair[0]
        span.style.borderBottom = `2px solid ${colorPair[1]}`
        span.style.borderRadius = "2px"
      })
    })
  }, [highlights, pageNumber])

  useEffect(applyHighlights, [applyHighlights])

  function renderFailed(cause: Error) {
    console.error("Native PDF rendering failed:", cause)
    setError(cause.message || "Unable to render this PDF.")
  }

  const loading = <div role="status" style={{ padding: "2rem" }}>📖 Loading Book{progress > 0 ? `… ${progress}%` : "…"}</div>
  return <><div ref={container} className={styles.reader} tabIndex={0} aria-label="Book reader"
    onContextMenu={event => event.preventDefault()}
    onKeyDown={event => {
      if ((event.ctrlKey || event.metaKey) && ["s", "p"].includes(event.key.toLowerCase())) event.preventDefault()
    }}>
    {error ? <div role="alert" style={{ padding: "2rem", textAlign: "center" }}>
      <p>{error}</p>
      <button className="btn btn-primary btn-sm" style={{ marginTop: "1rem" }} onClick={() => {
        setError(null)
        setProgress(0)
        setAttempt(value => value + 1)
      }}>Retry PDF</button>
    </div> : <Document key={attempt} file={file} options={PDF_OPTIONS} onLoadSuccess={onLoadSuccess} onLoadError={renderFailed}
      onLoadProgress={({ loaded, total }) => setProgress(total > 0 ? Math.min(100, Math.round(loaded / total * 100)) : 0)}
      onItemClick={({ pageNumber: page }) => { if (page) onPageChange(page) }}
      onSourceError={renderFailed} loading={loading} error={null}>
      {({ pdf }) => <Page pageNumber={Math.max(1, Math.min(pageNumber, pdf.numPages))}
        renderMode="canvas" renderTextLayer renderAnnotationLayer scale={width ? undefined : scale} width={width ? Math.round(width * scale) : undefined}
        className={pageClassName} onRenderTextLayerSuccess={applyHighlights}
        onLoadError={renderFailed} onRenderError={renderFailed} loading={loading} />}
    </Document>}
    {!error && <div className={styles.watermark} aria-hidden="true"><span>Anchor Library</span></div>}
  </div><p className={styles.printNotice}>This book is available for in-app reading only.</p></>
}
