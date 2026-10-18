"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import styles from "./page.module.css"
import { useReadingProgress } from "@/components/pdf/useReadingProgress"
import { useBookAnnotations } from "@/components/pdf/useBookAnnotations"
import PageJump from "@/components/pdf/PageJump"

const PdfCanvas = dynamic(() => import("@/components/pdf/PdfCanvas"), { ssr: false })

export default function ReaderPage() {
  const { id } = useParams()
  const supabase = createClient()

  const [book, setBook] = useState<any>(null)
  const [scale, setScale] = useState(1.0)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [noteInput, setNoteInput] = useState("")
  const { pageNumber, setPageNumber, numPages, setNumPages, progressStatus } = useReadingProgress(typeof id === "string" ? id : null, userId)
  const { annotations, saveAnnotation, saving, noteStatus } = useBookAnnotations(typeof id === "string" ? id : null, userId)
  const [watermark, setWatermark] = useState("Reading copy")

  useEffect(() => { setSelectedText("") }, [pageNumber, id])

  // Measure container width for auto-fit on load
  useEffect(() => {
    if (!pdfContainerRef.current) return;
    const updateWidth = () => {
      if (pdfContainerRef.current) {
        // Leave ~40px breathing room
        const w = pdfContainerRef.current.clientWidth - 48;
        if (w > 200) setContainerWidth(w);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(pdfContainerRef.current);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setUserId(session.user.id); setWatermark(session.user.user_metadata?.username || "Member"); }
    }
    init();
  }, [supabase.auth]);

  useEffect(() => {
    async function loadBookAndProgress() {
      if (!id) return
      setLoading(true)
      const { data, error } = await supabase.from("books").select("id,title,total_pages").eq("id", id).maybeSingle()
      if (data) {
        setBook(data)
      } else {
        console.error("Book not found", error)
      }
      setLoading(false)
    }
    loadBookAndProgress()
  }, [id, supabase])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(page => Math.max(1, Math.min(page, numPages)))
  }

  async function changePage(offset: number) {
    if (isFlipping || !numPages) return; // Prevent spamming
    
    const newPage = pageNumber + offset;
    if (newPage < 1 || (numPages && newPage > numPages)) return;
    
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;

    // Trigger animation
    setIsFlipping(true);
    setTimeout(() => setIsFlipping(false), 300); // match CSS duration
    
    setPageNumber(newPage);

    requestAnimationFrame(() => {
      if (typeof window !== "undefined" && window.scrollY !== currentScrollY) {
        window.scrollTo({ top: currentScrollY, behavior: "instant" as ScrollBehavior });
      }
    });
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        changePage(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        changePage(-1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pageNumber, numPages, userId, book, isFlipping]);

  // Text selection handler
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0 &&
          pdfContainerRef.current?.contains(selection.anchorNode) &&
          pdfContainerRef.current?.contains(selection.focusNode)) {
        setSelectedText(selection.toString().trim());
      }
    };
    
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  async function handleSaveAnnotation() {
    if (await saveAnnotation(pageNumber, selectedText, noteInput)) {
      setSelectedText("")
      setNoteInput("")
      window.getSelection()?.removeAllRanges()
    }
  }

  if (loading) {
    return <div className={styles.readerContainer} style={{ justifyContent: "center", alignItems: "center" }}>Loading Book...</div>
  }

  if (!book) {
    return <div className={styles.readerContainer} style={{ justifyContent: "center", alignItems: "center" }}>Book PDF not available.</div>
  }

  const progressPercent = numPages ? Math.round((pageNumber / numPages) * 100) : 0;

  return (
    <div className={styles.readerContainer}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link href={`/library/${book.id}`} className={styles.backBtn}>
            <span>←</span> Back
          </Link>
          <div className={styles.bookTitle}>{book.title}</div>
        </div>
        <div className={styles.topRight}>
          <button className={`${styles.iconBtn} ${styles.notesToggle}`} aria-expanded={showNotes} onClick={() => setShowNotes(open => !open)}>Notes</button>
          <button className={styles.iconBtn} onClick={() => setScale(s => Math.max(0.5, s - 0.2))} title="Zoom Out">➖</button>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", minWidth: "40px", textAlign: "center" }}>
            {Math.round(scale * 100)}%
          </span>
          <button className={styles.iconBtn} onClick={() => setScale(s => Math.min(3.0, s + 0.2))} title="Zoom In">➕</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainArea}>
        {/* Left Sidebar - Table of Contents */}
        <aside className={styles.sidebarLeft}>
          <div className={styles.sidebarHeader}>📑 Contents</div>
          <div className={styles.sidebarContent}>
            <button className={styles.tocItem} onClick={() => setPageNumber(1)}>First page</button>
            <p style={{ fontSize: "0.8rem", marginTop: "1rem", color: "var(--color-text-muted)" }}>Use the page controls below to jump to any page. Saved notes also link to their pages.</p>
          </div>
        </aside>

        {/* Center - PDF Renderer */}
        <div className={styles.pdfArea} ref={pdfContainerRef}>
          <div className={`${styles.pdfWrapper} ${isFlipping ? styles.pageFlip : ""}`}>
            <PdfCanvas
              bookId={book.id}
              watermark={watermark}
              onPageChange={setPageNumber}
              pageNumber={pageNumber}
              scale={scale}
              width={containerWidth ? Math.min(containerWidth, 800) : undefined}
              pageClassName={styles.pdfPageContent}
              highlights={annotations}
              onLoadSuccess={onDocumentLoadSuccess}
            />
          </div>
        </div>

        {/* Right Sidebar - Notes & Highlights */}
        <aside className={`${styles.sidebarRight} ${showNotes ? styles.notesOpen : ""}`}>
          <div className={styles.sidebarHeader}>📝 Notes & Highlights</div>
          <div className={styles.sidebarContent}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "0.8rem" }}>
              Highlight text to quote, or add a note for <strong>Page {pageNumber}</strong> directly:
            </p>
            
            {/* Annotation Form (Shows on text select OR user clicking Add Note) */}
            <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "1px solid var(--color-border)" }}>
              {selectedText ? (
                <div style={{ fontSize: "var(--text-xs)", fontStyle: "italic", marginBottom: "0.5rem", color: "var(--color-primary)", maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  "{selectedText}"
                </div>
              ) : (
                <div style={{ fontSize: "var(--text-xs)", marginBottom: "0.5rem", color: "var(--color-text-secondary)" }}>
                  📌 Note for <strong>Page {pageNumber}</strong>
                </div>
              )}
              <textarea 
                className="input w-full" 
                placeholder="Type your notes or insights here..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                style={{ marginBottom: "0.5rem", minHeight: "65px" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  className="btn btn-primary btn-sm w-full" 
                  onClick={handleSaveAnnotation}
                  disabled={saving || (!selectedText.trim() && !noteInput.trim())}
                >
                  {saving ? "Saving…" : selectedText && !noteInput.trim() ? "Save Highlight" : "Save Note"}
                </button>
                {selectedText && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedText("")}>Clear Quote</button>
                )}
              </div>
            </div>

            <p role="status" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>{noteStatus}</p>

            {/* Saved Annotations */}
            {annotations.filter(a => a.page_number === pageNumber).length > 0 && (
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, margin: "1rem 0 0.5rem 0", color: "var(--color-text-secondary)" }}>
                On this page:
              </div>
            )}
            
            {annotations.filter(a => a.page_number === pageNumber).map((ann, idx) => (
              <div key={ann.id || idx} className={styles.noteItem}>
                <div className={styles.noteHighlight}>"{ann.selected_text}"</div>
                {ann.note && <div className={styles.noteText}>{ann.note}</div>}
              </div>
            ))}

            {annotations.filter(a => a.page_number !== pageNumber).length > 0 && (
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, margin: "1.5rem 0 0.5rem 0", color: "var(--color-text-secondary)" }}>
                Other pages:
              </div>
            )}

            {annotations.filter(a => a.page_number !== pageNumber).map((ann, idx) => (
              <div key={ann.id || idx} className={styles.noteItem} style={{ opacity: 0.7 }} onClick={() => setPageNumber(ann.page_number || 1)}>
                <div className={styles.noteHighlight} style={{ cursor: "pointer" }}>
                  (Page {ann.page_number}) "{ann.selected_text}"
                </div>
                {ann.note && <div className={styles.noteText}>{ann.note}</div>}
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* Bottom Bar - Navigation & Progress */}
      <footer className={styles.bottomBar}>
        <button 
          className="btn btn-ghost" 
          onClick={() => changePage(-1)} 
          disabled={!numPages || pageNumber <= 1}
        >
          ◀ Previous
        </button>
        
        <div className={styles.pageInfo}>
          <PageJump page={pageNumber} total={numPages} onChange={setPageNumber} />
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className={styles.progressText}>{progressPercent}% · {progressStatus}</div>
        </div>

        <button 
          className="btn btn-ghost" 
          onClick={() => changePage(1)} 
          disabled={pageNumber >= (numPages || 1)}
        >
          Next ▶
        </button>
      </footer>
    </div>
  )
}
