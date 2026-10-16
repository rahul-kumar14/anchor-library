"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Document, Page, pdfjs } from "react-pdf"
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from "./page.module.css"

// Initialize pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function ReaderPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [book, setBook] = useState<any>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [noteInput, setNoteInput] = useState("")
  const [annotations, setAnnotations] = useState<any[]>([])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserId(session.user.id)
    }
    init()
  }, [supabase.auth])

  useEffect(() => {
    async function loadBookAndProgress() {
      if (!id) return
      setLoading(true)
      const { data, error } = await supabase.from("books").select("*").eq("id", id).single()
      if (data) {
        setBook(data)
        
        // Fetch reading progress
        if (userId) {
          const { data: prog } = await supabase
            .from("reading_progress")
            .select("current_page")
            .eq("book_id", id)
            .eq("user_id", userId)
            .single()
            
          if (prog && prog.current_page) {
            setPageNumber(prog.current_page)
          }

          // Fetch annotations
          const { data: annots } = await supabase
            .from("annotations")
            .select("*")
            .eq("book_id", id)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            
          if (annots) setAnnotations(annots)
        }
      } else {
        console.error("Book not found", error)
      }
      setLoading(false)
    }
    if (userId !== null) {
      loadBookAndProgress()
    }
  }, [id, userId, supabase])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    // Note: For Phase 2, we update total_pages in reading_progress here if needed
  }

  async function changePage(offset: number) {
    if (isFlipping) return; // Prevent spamming
    
    const newPage = pageNumber + offset;
    if (newPage < 1 || (numPages && newPage > numPages)) return;
    
    // Trigger animation
    setIsFlipping(true);
    setTimeout(() => setIsFlipping(false), 300); // match CSS duration
    
    setPageNumber(newPage);
  }

  // Save reading progress whenever pageNumber changes
  useEffect(() => {
    async function saveProgress() {
      if (userId && book) {
        const progressPercent = (numPages || book.total_pages) 
          ? Math.round((pageNumber / (numPages || book.total_pages)) * 100) 
          : 0;
          
        const payload = {
          user_id: userId,
          book_id: book.id,
          current_page: pageNumber,
          total_pages: numPages || book.total_pages || 0,
          is_completed: pageNumber === (numPages || book.total_pages),
          progress_percent: progressPercent,
          last_read_at: new Date().toISOString()
        };

        // First check if a record exists
        const { data: existingRecord } = await supabase
          .from("reading_progress")
          .select("id")
          .eq("user_id", userId)
          .eq("book_id", book.id)
          .single();

        if (existingRecord) {
          // Update existing
          const { error: updateError } = await supabase
            .from("reading_progress")
            .update(payload)
            .eq("id", existingRecord.id);
            
          if (updateError) console.error("Failed to update progress:", updateError);
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from("reading_progress")
            .insert([payload]);
            
          if (insertError) console.error("Failed to insert progress:", insertError);
        }
      }
    }
    
    // Debounce the save to prevent spamming the DB if user flips quickly
    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [pageNumber, userId, book, numPages, supabase]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") changePage(1);
      if (e.key === "ArrowLeft") changePage(-1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pageNumber, numPages, userId, book, isFlipping]);

  // Text selection handler
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        setSelectedText(selection.toString().trim());
      }
    };
    
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  async function handleSaveAnnotation() {
    if (!book || !selectedText) return;
    
    if (!userId) {
      alert("Please login to save notes and highlights permanently.");
      return;
    }

    const tempId = Date.now().toString();
    const newAnnotation = {
      id: tempId,
      user_id: userId,
      book_id: book.id,
      page_number: pageNumber,
      selected_text: selectedText,
      note: noteInput,
      created_at: new Date().toISOString()
    };

    // Optimistic UI Update (so user sees it immediately)
    setAnnotations([newAnnotation, ...annotations]);
    setSelectedText("");
    setNoteInput("");
    window.getSelection()?.removeAllRanges();

    if (userId) {
      try {
        const { data, error } = await supabase.from("annotations").insert({
          user_id: userId,
          book_id: book.id,
          page_number: pageNumber,
          selected_text: newAnnotation.selected_text,
          note: newAnnotation.note
        }).select().single();
        
        if (error) throw error;
        
        if (data) {
          // Replace temp annotation with real one from DB
          setAnnotations(prev => prev.map(a => a.id === tempId ? data : a));
        }
      } catch (err) {
        console.error("Failed to save annotation to DB", err);
        alert("Failed to save annotation to DB. Did you run the SQL script?");
      }
    }
  }

  // Apply visual highlights manually via DOM
  useEffect(() => {
    const applyHighlights = () => {
      const pageAnnotations = annotations.filter(a => a.page_number === pageNumber);
      const textLayers = document.querySelectorAll('.react-pdf__Page__textContent');
      
      textLayers.forEach(layer => {
        const spans = layer.querySelectorAll('span');
        spans.forEach(span => {
          // Reset
          span.style.borderBottom = '';
          span.style.backgroundColor = '';
          
          const str = span.textContent || "";
          if (str.trim().length < 2) return;
          
          // Check if this span is part of any annotation
          for (const ann of pageAnnotations) {
            if (!ann.selected_text) continue;
            
            // Remove spaces to handle weird PDF whitespace
            const hlText = ann.selected_text.replace(/\s+/g, '');
            const spanText = str.replace(/\s+/g, '');
            
            if (hlText.includes(spanText) || spanText.includes(hlText)) {
              span.style.borderBottom = '3px solid #3b82f6'; // Blue underline
              span.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'; // Light blue bg for better visibility
              break;
            }
          }
        });
      });
    };

    // Run when annotations/page changes, use a small delay to ensure text layer is rendered
    const timeout = setTimeout(applyHighlights, 800);
    
    return () => clearTimeout(timeout);
  }, [annotations, pageNumber, scale]);

  if (loading) {
    return <div className={styles.readerContainer} style={{ justifyContent: "center", alignItems: "center" }}>Loading Book...</div>
  }

  if (!book || !book.pdf_url) {
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
            {/* Placeholder for real TOC parsing */}
            <div className={styles.tocItem} onClick={() => setPageNumber(1)}>Cover</div>
            <div className={styles.tocItem} onClick={() => setPageNumber(5)}>Chapter 1</div>
            <div className={styles.tocItem} onClick={() => setPageNumber(15)}>Chapter 2</div>
            <div className={styles.tocItem} onClick={() => setPageNumber(30)}>Chapter 3</div>
          </div>
        </aside>

        {/* Center - PDF Renderer */}
        <div className={styles.pdfArea}>
          <div className={`${styles.pdfWrapper} ${isFlipping ? styles.pageFlip : ''}`}>
            <Document
              file={(() => {
                if (book.pdf_url && book.pdf_url.includes("drive.google.com")) {
                  const m = book.pdf_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                  if (m && m[1]) return `/api/pdf-proxy?id=${m[1]}`;
                }
                return book.pdf_url;
              })()}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div style={{ padding: "2rem" }}>Loading PDF from Google Drive...</div>}
              error={
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <p style={{ color: "red", marginBottom: "1rem" }}>Failed to load PDF directly.</p>
                  {book.pdf_url && book.pdf_url.includes("drive.google.com") && (
                    <iframe
                      src={book.pdf_url.includes("/preview") ? book.pdf_url : book.pdf_url.replace(/\/view(\?.*)?$/, "/preview")}
                      style={{ width: "100%", height: "70vh", border: "none" }}
                      allow="autoplay"
                      title={book.title}
                    />
                  )}
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={true} 
                renderAnnotationLayer={true}
                scale={scale}
                className={styles.pdfPageContent}
              />
            </Document>
          </div>
        </div>

        {/* Right Sidebar - Notes & Highlights */}
        <aside className={styles.sidebarRight}>
          <div className={styles.sidebarHeader}>📝 Notes & Highlights</div>
          <div className={styles.sidebarContent}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              Select text in the PDF to highlight it and add a note.
            </p>
            
            {/* New Annotation Form */}
            {selectedText && (
              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "1px solid var(--color-primary)" }}>
                <div style={{ fontSize: "var(--text-xs)", fontStyle: "italic", marginBottom: "0.5rem", color: "var(--color-text-muted)", maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  "{selectedText}"
                </div>
                <textarea 
                  className="input w-full" 
                  placeholder="Add a note (optional)..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  style={{ marginBottom: "0.5rem", minHeight: "60px" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-primary btn-sm w-full" onClick={handleSaveAnnotation}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedText("")}>Cancel</button>
                </div>
              </div>
            )}

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
          disabled={pageNumber <= 1}
        >
          ◀ Previous
        </button>
        
        <div className={styles.pageInfo}>
          Page {pageNumber} {numPages ? `/ ${numPages}` : ""}
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className={styles.progressText}>{progressPercent}%</div>
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
