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
  const { annotations, saveAnnotation, removeAnnotation, saving, noteStatus } = useBookAnnotations(typeof id === "string" ? id : null, userId)
  const [selectionMenu, setSelectionMenu] = useState<{ top: number; left: number } | null>(null)
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
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

  // Text selection handler matching Study Room
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (!text) return;

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      const container = pdfContainerRef.current;

      if (container && anchorNode && focusNode && container.contains(anchorNode) && container.contains(focusNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Calculate exact character start and end offsets within the PDF page text layer
        let startChar = -1;
        let endChar = -1;
        try {
          const spans = Array.from(container.querySelectorAll<HTMLSpanElement>(".react-pdf__Page__textContent span"));
          let accumulated = 0;
          for (const s of spans) {
            const sText = (s as any).__originalText ?? s.textContent ?? "";
            if (startChar < 0 && (s.contains(range.startContainer) || s === range.startContainer)) {
              startChar = accumulated + range.startOffset;
            }
            if (endChar < 0 && (s.contains(range.endContainer) || s === range.endContainer)) {
              endChar = accumulated + range.endOffset;
            }
            accumulated += sText.length;
          }
        } catch {
          startChar = -1;
          endChar = -1;
        }

        const tag = (startChar >= 0 && endChar > startChar)
          ? `⟦#pos=${startChar}:${endChar}⟧`
          : (startChar >= 0 ? `⟦#pos=${startChar}⟧` : "");

        setSelectedText(`${text}${tag}`);
        setSelectionMenu({
          top: Math.max(12, rect.top - 54),
          left: Math.min(window.innerWidth - 190, Math.max(12, rect.left + rect.width / 2 - 90))
        });
      }
    };
    
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  async function saveHighlight(color: "amber" | "blue" | "pink" | "green") {
    if (await saveAnnotation(pageNumber, selectedText, "", color)) {
      setSelectedText("");
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  }

  async function clearOrRemoveSelection() {
    const existing = annotations.find(annotation => annotation.page_number === pageNumber && annotation.selected_text === selectedText);
    if (existing) await removeAnnotation(existing.id);
    setSelectedText("");
    setSelectionMenu(null);
    setNoteComposerOpen(false);
    window.getSelection()?.removeAllRanges();
  }

  async function handleSaveAnnotation() {
    if (await saveAnnotation(pageNumber, selectedText, noteInput)) {
      setSelectedText("");
      setNoteInput("");
      setSelectionMenu(null);
      setNoteComposerOpen(false);
      window.getSelection()?.removeAllRanges();
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
          <button className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowNotes(open => !open)}>
            <span style={{ marginRight: "6px" }}>??</span>{showNotes ? "Hide notes" : `Notes (${annotations.length})`}
          </button>
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
              watermark="Anchor Library"
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

        {/* Floating Highlight & Note Selection Menu */}
        {selectionMenu && (
          <div className={styles.selectionMenu} style={{ top: selectionMenu.top, left: selectionMenu.left }} role="toolbar" aria-label="Selected text actions">
            <button type="button" onClick={() => saveHighlight("amber")} title="Amber highlight" className={styles.highlightAmber}><span className={styles.colorDot} style={{ background: '#f59e0b' }} /></button>
            <button type="button" onClick={() => saveHighlight("blue")} title="Blue highlight" className={styles.highlightBlue}><span className={styles.colorDot} style={{ background: '#3b82f6' }} /></button>
            <button type="button" onClick={() => saveHighlight("pink")} title="Pink highlight" className={styles.highlightPink}><span className={styles.colorDot} style={{ background: '#ec4899' }} /></button>
            <button type="button" onClick={() => saveHighlight("green")} title="Green highlight" className={styles.highlightGreen}><span className={styles.colorDot} style={{ background: '#10b981' }} /></button>
            <button type="button" className={styles.selectionAction} onClick={() => setNoteComposerOpen(value => !value)}>Add note</button>
            <button type="button" className={styles.selectionAction} onClick={clearOrRemoveSelection}>Remove</button>
            {noteComposerOpen && (
              <div className={styles.notePopover}>
                <textarea autoFocus value={noteInput} onChange={event => setNoteInput(event.target.value)} placeholder="What do you want to remember?" />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveAnnotation} disabled={saving || !noteInput.trim()}>
                  {saving ? "Saving..." : "Save note"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Clean Notes Drawer matching Study Room */}
        {showNotes && (
          <aside className={styles.notesDrawer} aria-label="Saved notes">
            <div>
              <strong>Notes &amp; highlights</strong>
              <button type="button" onClick={() => setShowNotes(false)}>?</button>
            </div>
            {annotations.length ? (
              annotations.map(annotation => (
                <div
                  key={annotation.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "#FFFFFF",
                    border: "1px solid rgba(180, 83, 9, 0.2)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    marginBottom: "10px",
                    boxShadow: "0 2px 6px rgba(120, 53, 15, 0.05)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Top row: Page number on the left, Delete button right beside it */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                      paddingBottom: "4px",
                      borderBottom: "1px dashed rgba(180, 83, 9, 0.15)"
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setPageNumber(annotation.page_number);
                        setShowNotes(false);
                      }}
                      title="Jump to this page"
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#B45309",
                          background: "#FEF3C7",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          letterSpacing: "0.02em"
                        }}
                      >
                        📄 Page {annotation.page_number}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Delete this highlight note?")) {
                          await removeAnnotation(annotation.id);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "#FEE2E2",
                        border: "1px solid #FCA5A5",
                        color: "#DC2626",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#DC2626";
                        e.currentTarget.style.color = "#FFFFFF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#FEE2E2";
                        e.currentTarget.style.color = "#DC2626";
                      }}
                      title="Delete this note"
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  {/* Note Body: Clickable to jump to page */}
                  <div
                    style={{ cursor: "pointer", textAlign: "left" }}
                    onClick={() => {
                      setPageNumber(annotation.page_number);
                      setShowNotes(false);
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#374151",
                        lineHeight: 1.45,
                        fontStyle: "italic",
                        background: "rgba(254, 243, 199, 0.4)",
                        borderLeft: "3px solid #D97706",
                        padding: "4px 8px",
                        borderRadius: "0 4px 4px 0",
                        marginBottom: annotation.note ? "6px" : "0",
                        wordBreak: "break-word"
                      }}
                    >
                      "{annotation.selected_text.replace(/⟦#(?:occ|pos)=\d+⟧$/, "")}"
                    </div>
                    {annotation.note && (
                      <div
                        style={{
                          fontSize: "0.84rem",
                          fontWeight: 600,
                          color: "#1C1917",
                          lineHeight: 1.4,
                          paddingLeft: "4px",
                          wordBreak: "break-word"
                        }}
                      >
                        📝 {annotation.note}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No saved notes yet. Highlight text to save notes.
              </p>
            )}
          </aside>
        )}
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
