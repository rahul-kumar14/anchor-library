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

  const applyHighlights = useCallback(() => {
    const quotes = highlights.filter(a => a.page_number === pageNumber && a.selected_text)
      .map(a => ({ quote: a.selected_text!.replace(/\s+/g, ""), color: a.color || "amber" }))
    container.current?.querySelectorAll<HTMLSpanElement>(".react-pdf__Page__textContent span").forEach(span => {
      const text = (span.textContent || "").replace(/\s+/g, "")
      const highlight = text.length >= 2 ? quotes.find(item => item.quote.includes(text) || text.includes(item.quote)) : undefined
      const colors: Record<string, [string, string]> = { amber: ["rgba(245, 158, 11, 0.30)", "#d97706"], blue: ["rgba(96, 165, 250, 0.32)", "#2563eb"], pink: ["rgba(244, 114, 182, 0.28)", "#db2777"], green: ["rgba(74, 222, 128, 0.28)", "#16a34a"] }
      const color = highlight ? colors[highlight.color] || colors.amber : undefined
      span.style.backgroundColor = color?.[0] || ""
      span.style.borderBottom = color ? `3px solid ${color[1]}` : ""
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
