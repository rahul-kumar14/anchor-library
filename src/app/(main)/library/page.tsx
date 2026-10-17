import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import styles from "./page.module.css"

export const metadata = { title: "Library — Browse 1000+ Books | Anchor Library" }

export const dynamic = 'force-dynamic'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const { search, category } = await searchParams
  const supabase = await createClient()

  const { data: categories } = await supabase.from("categories").select("*").order("name")

  let query = supabase
    .from("books")
    .select("*, authors(name), ratings(rating)")
    .order("created_at", { ascending: false })
    .limit(200)

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,author.ilike.%${search}%`)
  }
  if (category) {
    query = query.eq("category_id", category)
  }

  let { data: books, error } = await query

  if (error) {
    // Fallback if relations not set
    const { data: rawBooks } = await supabase.from("books").select("*").order("created_at", { ascending: false }).limit(200)
    if (rawBooks) {
      books = rawBooks
      error = null
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={`${styles.title} heading-serif`}>
              📚 Library
            </h1>
            <p className={styles.subtitle}>Browse our collection of books across all categories</p>
          </div>
        </div>

        <form className={styles.filterBar} method="GET">
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              name="search"
              type="text"
              className={`input ${styles.searchInput}`}
              placeholder="Search books by title, author..."
              defaultValue={search}
            />
          </div>
          <div className={styles.categoryScroll}>
            <Link
              href="/library"
              className={`${styles.categoryChip} ${!category ? styles.categoryActive : ""}`}
            >
              All
            </Link>
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                href={`/library?${search ? `search=${search}&` : ""}category=${cat.id}`}
                className={`${styles.categoryChip} ${category === String(cat.id) ? styles.categoryActive : ""}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </form>

        {error && (
          <div className={styles.emptyState}>
            <p>⚠️ Error loading books.</p>
          </div>
        )}

        {!error && books && books.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <h3>No books found</h3>
            <p>{search ? `No results for "${search}"` : "No books uploaded yet."}</p>
            <div className="flex gap-3">
              <Link href="/library" className="btn btn-secondary btn-sm">Clear Filters</Link>
            </div>
          </div>
        )}

        {!error && books && books.length > 0 && (
          <div className="book-grid">
            {books.map((book) => {
              const avgRating = book.ratings?.length
                ? (book.ratings.reduce((s: number, r: any) => s + r.rating, 0) / book.ratings.length).toFixed(1)
                : null
              const authorDisplay = book.author || book.authors?.name || "Author Unknown"
              return (
                <Link key={book.id} href={`/library/${book.id}`} className={styles.bookCard}>
                  <div className={styles.coverWrap}>
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className={styles.cover} />
                    ) : (
                      <div className={styles.coverPlaceholder}>
                        <span className={styles.coverEmoji}>📖</span>
                      </div>
                    )}
                    {avgRating && (
                      <div className={styles.ratingBadge}>⭐ {avgRating}</div>
                    )}
                  </div>
                  <div className={styles.bookInfo}>
                    <h3 className={styles.bookTitle}>{book.title}</h3>
                    <p className={styles.bookAuthor}>{authorDisplay}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}