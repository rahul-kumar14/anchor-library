import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import FavoriteButton from "@/components/library/FavoriteButton"
import styles from "../library/page.module.css"

export const metadata = { title: "Saved Books — Anchor Library" }

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?redirect=/favorites")

  const { data: items, error } = await supabase
    .from("favorites")
    .select("book_id,books(id,title,author,cover_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className={styles.page}>
      <div className={styles.libraryBackdrop} aria-hidden="true" />
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={`${styles.title} heading-serif`}>
              Your Saved Books
            </h1>
            <p className={styles.subtitle}>
              Your private sanctuary of books saved to read anytime.
            </p>
          </div>
          <Link href="/library" className={styles.searchBtn} style={{ textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Explore Library</span>
          </Link>
        </div>

        {error ? (
          <div className={styles.emptyState}>
            <p>Your saved shelf could not be loaded. Please refresh to retry.</p>
          </div>
        ) : !items?.length ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3>Your saved shelf is empty</h3>
            <p>Save books from the library to build your personal reading list.</p>
            <div className="flex gap-3" style={{ marginTop: "1rem" }}>
              <Link href="/library" className="btn btn-primary btn-sm">Find Books</Link>
            </div>
          </div>
        ) : (
          <div className="book-grid">
            {items.map((item) => {
              const book = item.books as unknown as { id: number; title: string; author: string; cover_url: string | null } | null
              if (!book) return null
              return (
                <div key={item.book_id} className={styles.savedBookCard}>
                  <Link href={"/library/" + book.id} className={styles.bookCardInner}>
                    <div className={styles.coverWrap}>
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className={styles.cover} />
                      ) : (
                        <div className={styles.coverPlaceholder}>
                          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={styles.bookInfo}>
                      <h3 className={styles.bookTitle}>{book.title}</h3>
                      <p className={styles.bookAuthor}>{book.author || "Author Unknown"}</p>
                    </div>
                  </Link>

                  {/* Clean bottom action row to completely prevent cover overlap */}
                  <div className={styles.savedCardFooter}>
                    <FavoriteButton bookId={book.id} initialSaved variant="pill" />
                    <Link href={`/library/${book.id}`} className={styles.readRoomLink}>
                      <span>Read</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
