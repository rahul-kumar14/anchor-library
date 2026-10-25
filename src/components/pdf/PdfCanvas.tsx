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

    // 1. Restore original text in all spans first
    textSpans.forEach(span => {
      const originalText = (span as any).__originalText
      if (typeof originalText === "string") {
        span.textContent = originalText
      } else {
        (span as any).__originalText = span.textContent || ""
      }
      span.style.backgroundColor = ""
      span.style.borderBottom = ""
      span.style.borderRadius = ""
    })

    if (pageHighlights.length === 0) return

    const colors: Record<string, [string, string]> = {
      amber: ["rgba(245, 158, 11, 0.40)", "#d97706"],
      blue: ["rgba(96, 165, 250, 0.40)", "#2563eb"],
      pink: ["rgba(244, 114, 182, 0.40)", "#db2777"],
      green: ["rgba(74, 222, 128, 0.40)", "#16a34a"],
    }

    // Build full text map across all text spans to handle multi-span selections accurately
    const spanList = Array.from(textSpans)
    let fullPageText = ""
    const spanCharRanges: { span: HTMLSpanElement; start: number; end: number; originalText: string }[] = []

    for (const span of spanList) {
      const text = (span as any).__originalText ?? span.textContent ?? ""
      const start = fullPageText.length
      const end = start + text.length
      spanCharRanges.push({ span, start, end, originalText: text })
      fullPageText += text
    }

    // Per-span slice highlights to apply: map each span to its highlighted segments
    const spanHighlightSegments = new Map<HTMLSpanElement, { startInSpan: number; endInSpan: number; color: [string, string] }[]>()

    const textOccurrenceCounts: Record<string, number> = {}

    pageHighlights.forEach(item => {
      const rawQuote = (item.selected_text || "").trim()
      if (!rawQuote) return

      let quote = rawQuote
      let targetOccurrence: number | null = null
      let targetCharStart: number | null = null
      let targetCharEnd: number | null = null

      const rangePosMatch = rawQuote.match(/⟦#pos=(\d+):(\d+)⟧$/)
      const singlePosMatch = rawQuote.match(/⟦#pos=(\d+)⟧$/)
      const occMatch = rawQuote.match(/⟦#occ=(\d+)⟧$/)

      if (rangePosMatch) {
        quote = rawQuote.replace(/⟦#pos=\d+:\d+⟧$/, "").trim()
        targetCharStart = parseInt(rangePosMatch[1], 10)
        targetCharEnd = parseInt(rangePosMatch[2], 10)
      } else if (singlePosMatch) {
        quote = rawQuote.replace(/⟦#pos=\d+⟧$/, "").trim()
        targetCharStart = parseInt(singlePosMatch[1], 10)
      } else if (occMatch) {
        quote = rawQuote.replace(/⟦#occ=\d+⟧$/, "").trim()
        targetOccurrence = parseInt(occMatch[1], 10)
      } else {
        const normKey = quote.toLowerCase().replace(/\s+/g, " ")
        textOccurrenceCounts[normKey] = (textOccurrenceCounts[normKey] || 0) + 1
        targetOccurrence = textOccurrenceCounts[normKey] - 1
      }

      if (!quote) return

      const colorPair = colors[item.color || "amber"] || colors.amber
      let targetRange: { start: number; end: number } | null = null

      // Path 1: If we have explicit character start and end, use it directly!
      if (targetCharStart !== null && targetCharEnd !== null && targetCharEnd > targetCharStart) {
        targetRange = { start: targetCharStart, end: targetCharEnd }
      } else {
        // Path 2: Search via flexible regex
        const cleanQuote = quote.replace(/\s+/g, " ")
        const words = cleanQuote.split(/\s+/).filter(Boolean)
        const isSingleWord = words.length === 1

        let regex: RegExp | null = null
        try {
          if (isSingleWord) {
            const escaped = words[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            regex = new RegExp(`(?:^|[^\\p{L}\\p{N}_])(${escaped})(?:$|[^\\p{L}\\p{N}_])`, "gui")
          } else {
            // Match words separated by ANY characters (spaces, linebreaks, hyphens, punctuation)
            const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]{0,10}?")
            regex = new RegExp(escapedWords, "gi")
          }
        } catch {
          regex = null
        }

        if (regex) {
          const allMatches: { start: number; end: number }[] = []
          let match: RegExpExecArray | null
          while ((match = regex.exec(fullPageText)) !== null) {
            const matchText = match[1] || match[0]
            const matchStart = match.index + (match[1] ? match[0].indexOf(match[1]) : 0)
            const matchEnd = matchStart + matchText.length
            allMatches.push({ start: matchStart, end: matchEnd })
          }

          if (allMatches.length > 0) {
            if (targetCharStart !== null && targetCharStart >= 0) {
              let bestMatch = allMatches[0]
              let minDiff = Math.abs(bestMatch.start - targetCharStart)
              for (const m of allMatches) {
                const diff = Math.abs(m.start - targetCharStart)
                if (diff < minDiff) {
                  minDiff = diff
                  bestMatch = m
                }
              }
              targetRange = bestMatch
            } else {
              const chosenIndex = (targetOccurrence !== null && targetOccurrence >= 0 && targetOccurrence < allMatches.length)
                ? targetOccurrence
                : 0
              targetRange = allMatches[chosenIndex]
            }
          }
        }

        // Path 3: If still not matched (e.g. multi-line or split paragraphs), search first & last word anchor
        if (!targetRange && words.length > 1) {
          const firstWord = words[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          const lastWord = words[words.length - 1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          try {
            const firstRegex = new RegExp(firstWord, "gi")
            let fMatch: RegExpExecArray | null
            while ((fMatch = firstRegex.exec(fullPageText)) !== null) {
              const sPos = fMatch.index
              const subAfter = fullPageText.substring(sPos, sPos + cleanQuote.length + 100)
              const lIdx = subAfter.toLowerCase().lastIndexOf(words[words.length - 1].toLowerCase())
              if (lIdx >= 0) {
                targetRange = { start: sPos, end: sPos + lIdx + words[words.length - 1].length }
                break
              }
            }
          } catch {}
        }
      }

      if (targetRange) {
        for (const r of spanCharRanges) {
          const overlapStart = Math.max(r.start, targetRange.start)
          const overlapEnd = Math.min(r.end, targetRange.end)
          if (overlapStart < overlapEnd) {
            const startInSpan = overlapStart - r.start
            const endInSpan = overlapEnd - r.start
            if (!spanHighlightSegments.has(r.span)) {
              spanHighlightSegments.set(r.span, [])
            }
            spanHighlightSegments.get(r.span)!.push({ startInSpan, endInSpan, color: colorPair })
          }
        }
      }
    })

    // Now render each span with exact sub-string <mark> tags without coloring the whole line!
    spanHighlightSegments.forEach((segments, span) => {
      const orig = (span as any).__originalText || span.textContent || ""
      if (!orig) return

      // Sort segments by startInSpan
      segments.sort((a, b) => a.startInSpan - b.startInSpan)

      // Build fragment nodes
      const fragment = document.createDocumentFragment()
      let currentIndex = 0

      for (const seg of segments) {
        if (seg.startInSpan > currentIndex) {
          fragment.appendChild(document.createTextNode(orig.substring(currentIndex, seg.startInSpan)))
        }
        const mark = document.createElement("mark")
        mark.style.backgroundColor = seg.color[0]
        mark.style.borderBottom = `2px solid ${seg.color[1]}`
        mark.style.borderRadius = "2px"
        mark.style.color = "inherit"
        mark.textContent = orig.substring(seg.startInSpan, seg.endInSpan)
        fragment.appendChild(mark)
        currentIndex = Math.max(currentIndex, seg.endInSpan)
      }

      if (currentIndex < orig.length) {
        fragment.appendChild(document.createTextNode(orig.substring(currentIndex)))
      }

      span.textContent = ""
      span.appendChild(fragment)
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
