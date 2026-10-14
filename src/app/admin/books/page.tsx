"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import styles from "./page.module.css"

export default function AdminBooksPage() {
  const supabase = createClient()
  const [books, setBooks] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form fields
  const [title, setTitle] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categoryName, setCategoryName] = useState("")
  const [description, setDescription] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [language, setLanguage] = useState("Hindi")
  const [totalPages, setTotalPages] = useState("")
  const [publishedYear, setPublishedYear] = useState(new Date().getFullYear().toString())

  // File upload state
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  
  // Edit state
  const [editingBookId, setEditingBookId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const { data: catData } = await supabase.from("categories").select("*").order("name")
    if (catData) setCategories(catData)

    const { data: bookData, error } = await supabase
      .from("books")
      .select("*, authors(name), categories(name)")
      .order("created_at", { ascending: false })

    if (!error && bookData) {
      setBooks(bookData)
    } else {
      const { data: rawBooks } = await supabase.from("books").select("*").order("created_at", { ascending: false })
      if (rawBooks) setBooks(rawBooks)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleFileUpload = async (file: File, bucketName: string) => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file)
    if (uploadError) { 
      console.warn("Storage upload error:", uploadError); 
      throw new Error(`Failed to upload ${file.name}. Ensure bucket '${bucketName}' is public. Details: ${uploadError.message}`);
    }
    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
    return data.publicUrl
  }

  const resetForm = () => {
    setTitle(""); setAuthorName(""); setDescription(""); setCoverUrl(""); setPdfUrl(""); setTotalPages("")
    setCoverFile(null); setPdfFile(null); setCategoryName(""); setCategoryId("")
    setEditingBookId(null)
  }

  const handleEditClick = (book: any) => {
    setEditingBookId(book.id)
    setTitle(book.title || "")
    setAuthorName(book.author || book.authors?.name || "")
    setCategoryId(book.category_id || "")
    setCategoryName(book.genre || book.categories?.name || "")
    setDescription(book.description || "")
    setCoverUrl(book.cover_url || "")
    setPdfUrl(book.pdf_url || "")
    setLanguage(book.language || "Hindi")
    setTotalPages(book.total_pages ? book.total_pages.toString() : "")
    setPublishedYear(book.published_year ? book.published_year.toString() : new Date().getFullYear().toString())
    setCoverFile(null)
    setPdfFile(null)
    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setStatusMsg(null)
    try {
      let finalCoverUrl = coverUrl
      let finalPdfUrl = pdfUrl

      if (coverFile) {
        const uploaded = await handleFileUpload(coverFile, "covers")
        if (uploaded) finalCoverUrl = uploaded
      }
      if (pdfFile) {
        const uploaded = await handleFileUpload(pdfFile, "books")
        if (uploaded) finalPdfUrl = uploaded
      }

      // Author
      let authorId: string | null = null
      if (authorName.trim()) {
        try {
          const { data: existing } = await supabase.from("authors").select("id").ilike("name", authorName.trim()).maybeSingle()
          if (existing) {
             authorId = existing.id
          } else {
             const { data: newAuthor } = await supabase.from("authors").insert({ name: authorName.trim() }).select().single()
             if (newAuthor) authorId = newAuthor.id
          }
        } catch (_) { /* authors table may not exist */ }
      }

      // Category
      let finalCatId: any = categoryId || null
      let selectedCatName = categoryName.trim()
      if (categoryId) {
        const found = categories.find((c) => String(c.id) === String(categoryId))
        if (found) selectedCatName = found.name
      }

      const payload: any = {
        title: title.trim(),
        author: authorName.trim(),
        description: description.trim() || null,
        cover_url: finalCoverUrl?.trim() || null,
        pdf_url: finalPdfUrl?.trim() || null,
        language,
        published_year: publishedYear ? parseInt(publishedYear) : null,
        total_pages: totalPages ? parseInt(totalPages) : null,
      }
      if (authorId) payload.author_id = authorId
      if (finalCatId) payload.category_id = finalCatId
      if (selectedCatName) payload.genre = selectedCatName

      if (editingBookId) {
        const { data: updatedData, error: updateError } = await supabase.from("books").update(payload).eq("id", editingBookId).select()
        if (updateError) throw updateError
        if (!updatedData || updatedData.length === 0) {
          throw new Error("Update blocked! You might not have UPDATE permissions in the database.")
        }
        setStatusMsg({ type: "success", text: "✅ Book updated successfully!" })
      } else {
        const { error: insertError } = await supabase.from("books").insert(payload)
        if (insertError) throw insertError
        setStatusMsg({ type: "success", text: "✅ Book published to library successfully!" })
      }

      resetForm()
      fetchData()
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save book." })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBook = async (bookId: string | number) => {
    if (!confirm("Delete this book? This action cannot be undone.")) return
    const { error } = await supabase.from("books").delete().eq("id", bookId)
    if (!error) {
      setBooks((prev) => prev.filter((b) => b.id !== bookId))
      setStatusMsg({ type: "success", text: "Book deleted successfully." })
      if (editingBookId === bookId) resetForm()
    } else {
      setStatusMsg({ type: "error", text: "Could not delete book." })
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Book Management</h1>
          <p className={styles.pageSubtitle}>Upload PDF books, add metadata and manage library catalog</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{books.length}</span>
            <span className={styles.statLbl}>Total Books</span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`${styles.alert} ${statusMsg.type === "success" ? styles.alertSuccess : styles.alertError}`}>
          {statusMsg.text}
        </div>
      )}

      <div className={styles.grid}>
        {/* Upload Form */}
        <div className={styles.formCard}>
          <h2 className={styles.cardTitle}>{editingBookId ? "✏️ Edit Book" : "➕ Upload New Book"}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Book Title *</label>
              <input
                type="text" className={styles.input}
                placeholder="e.g. Godan, Atomic Habits, UPSC GS Paper 1"
                value={title} onChange={(e) => setTitle(e.target.value)} required
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Author Name *</label>
                <input
                  type="text" className={styles.input}
                  placeholder="e.g. Munshi Premchand"
                  value={authorName} onChange={(e) => setAuthorName(e.target.value)} required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Category / Genre</label>
                {categories.length > 0 ? (
                  <select className={styles.input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text" className={styles.input}
                    placeholder="e.g. Novel, UPSC, Poetry"
                    value={categoryName} onChange={(e) => setCategoryName(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description / Summary</label>
              <textarea
                className={styles.input} rows={3}
                placeholder="Brief synopsis of the book..."
                value={description} onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Cover Image</label>
              <input type="file" accept="image/*" className={styles.fileInput}
                key={`cover-${editingBookId || 'new'}-${statusMsg ? 1 : 0}`}
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              <input type="url" className={styles.input}
                placeholder="Or paste image URL (https://...)"
                value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>PDF Book File</label>
              <input type="file" accept="application/pdf" className={styles.fileInput}
                key={`pdf-${editingBookId || 'new'}-${statusMsg ? 1 : 0}`}
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
              <input type="url" className={styles.input}
                placeholder="Or paste PDF / Google Drive URL"
                value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
            </div>

            <div className={styles.row3}>
              <div className={styles.field}>
                <label className={styles.label}>Language</label>
                <select className={styles.input} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="English">English</option>
                  <option value="Sanskrit">Sanskrit (संस्कृत)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Total Pages</label>
                <input type="number" className={styles.input} placeholder="e.g. 280"
                  value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Published Year</label>
                <input type="number" className={styles.input} placeholder="e.g. 2024"
                  value={publishedYear} onChange={(e) => setPublishedYear(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button
                id="publish-book-btn"
                type="submit" className={styles.publishBtn} disabled={submitting}
                style={{ flex: 1, margin: 0 }}
              >
                {submitting ? "Saving..." : editingBookId ? "💾 Update Book" : "🚀 Publish Book to Library"}
              </button>
              {editingBookId && (
                <button
                  type="button"
                  className={styles.publishBtn}
                  style={{ flex: 1, margin: 0, background: "transparent", border: "1px solid var(--adm-border)", color: "var(--adm-text)", boxShadow: "none" }}
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Books List */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <h2 className={styles.cardTitle}>📚 Published Books ({books.length})</h2>
            <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
              {loading ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>

          {loading ? (
            <div className={styles.empty}>Loading catalog...</div>
          ) : books.length === 0 ? (
            <div className={styles.empty}>
              <p>No books in library yet.</p>
              <p className={styles.emptyHint}>Upload your first book using the form →</p>
            </div>
          ) : (
            <div className={styles.bookList}>
              {books.map((b) => (
                <div key={b.id} className={styles.bookItem}>
                  <div className={styles.bookThumb}>
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} />
                    ) : (
                      <span>📖</span>
                    )}
                  </div>
                  <div className={styles.bookInfo}>
                    <div className={styles.bookTitle}>{b.title}</div>
                    <div className={styles.bookMeta}>
                      <span>✍️ {b.author || b.authors?.name || "Unknown"}</span>
                      <span>• {b.genre || b.categories?.name || b.language || "General"}</span>
                      {b.total_pages && <span>• {b.total_pages}p</span>}
                    </div>
                  </div>
                  <div className={styles.bookActions}>
                    <Link href={`/library/${b.id}`} className={styles.viewBtn} target="_blank" title="View Book">👁️</Link>
                    <button className={styles.editBtn} onClick={() => handleEditClick(b)} title="Edit Book">✏️</button>
                    <button className={styles.deleteBtn} onClick={() => handleDeleteBook(b.id)} title="Delete Book">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}