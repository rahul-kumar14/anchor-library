import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import styles from "./page.module.css"
import FavoriteButton from "@/components/library/FavoriteButton"
import BookReadModal from "@/components/library/BookReadModal"

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: book } = await supabase
    .from("books")
    .select("*, authors(name, bio), ratings(rating, user_id), categories(name)")
    .eq("id", id)
    .single()

  if (!book) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: favorite } = user ? await supabase.from("favorites").select("id").eq("user_id", user.id).eq("book_id", book.id).maybeSingle() : { data: null }

  const avgRating = book.ratings?.length
    ? (book.ratings.reduce((s: number, r: any) => s + r.rating, 0) / book.ratings.length).toFixed(1)
    : null

  const categoryName = book.categories?.name || ""

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/library" className={styles.back}>← Back to Library</Link>
        <div className={styles.layout}>
          <div className={styles.coverSection}>
            <div className={styles.coverWrap}>
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className={styles.cover} />
              ) : (
                <div className={styles.coverPlaceholder}>📖</div>
              )}
            </div>
            
            <div className={styles.coverActions}>
              {/* Study Room Reading Modal Trigger */}
              <BookReadModal
                book={book}
                categoryName={categoryName}
                hasPdf={!!book.pdf_url}
              />
              <FavoriteButton bookId={book.id} initialSaved={!!favorite} variant="full" />
            </div>

            <div className={styles.metaCard}>
              {avgRating && <div className={styles.metaRow}><span className={styles.metaLabel}>Rating</span><span>⭐ {avgRating}</span></div>}
              {book.published_year && <div className={styles.metaRow}><span className={styles.metaLabel}>Published</span><span>{book.published_year}</span></div>}
              {book.total_pages && <div className={styles.metaRow}><span className={styles.metaLabel}>Pages</span><span>{book.total_pages}</span></div>}
              <div className={styles.metaRow}><span className={styles.metaLabel}>Language</span><span>{book.language ?? "English"}</span></div>
            </div>
          </div>

          <div className={styles.infoSection}>
            <h1 className={`${styles.bookTitle} heading-serif`}>{book.title}</h1>
            {(book.authors?.name || book.author) && (
              <p className={styles.bookAuthor}>by {book.authors?.name || book.author}</p>
            )}
            {book.description && (
              <div className={styles.descSection}>
                <h2 className={styles.descTitle}>About this Book</h2>
                <p className={styles.desc}>{book.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
