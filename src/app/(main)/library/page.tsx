import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import styles from "./page.module.css"

export const metadata = { title: "Browse Books" }

export const dynamic = 'force-dynamic'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const { search, category } = await searchParams
  const supabase = await createClient()

  const { data: categories } = await supabase.from("categories").select("*").order("name")

  const term = (search || "").normalize("NFKC").replace(/[%,()"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)
  const applyFilters = (query: any) => {
    if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,author.ilike.%${term}%`)
    if (category) query = query.eq("category_id", /^[1-9]\d*$/.test(category) ? category : -1)
    return query
  }

  let query = supabase
    .from("books")
    .select("*, authors(name), ratings(rating)")
    .order("created_at", { ascending: false })
    .limit(200)

  query = applyFilters(query)

  let { data: books, error } = await query

  if (error) {
    // Fallback if relations not set
    const { data: rawBooks, error: fallbackError } = await applyFilters(supabase.from("books").select("id,title,author,description,cover_url,category_id,created_at").order("created_at", { ascending: false }).limit(200))
    if (!fallbackError && rawBooks) {
      books = rawBooks
      error = null
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.libraryBackdrop} aria-hidden="true" />
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={`${styles.title} heading-serif`}>
              <span className={styles.animatedTitleWrap}>
                <span className={styles.animatedLibraryLogo}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </span>
                <span className={styles.animatedGradientText}>Anchor Library</span>
              </span>
            </h1>
            <p className={styles.subtitle}>Browse our collection of books across all categories</p>
          </div>
        </div>

                <form className={styles.filterBar} method="GET">
          {category && <input type="hidden" name="category" value={category} />}
          
          {/* Main Search Row with side-by-side Action Buttons */}
          <div className={styles.searchRow}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon} aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', opacity: 0.85 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
              <input
                aria-label="Search books by title or author"
                name="search"
                type="text"
                className={`input ${styles.searchInput}`}
                placeholder="Search books by title, author, keyword..."
                defaultValue={search}
              />
            </div>
            
            <button type="submit" className={styles.searchBtn} title="Search books"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><span>Search</span></button>

            <Link href="/favorites" className={styles.savedBtn} title="View your saved books">
              <span className={styles.savedHeart}><svg width="16" height="16" viewBox="0 0 24 24" fill="#f87171" stroke="#f87171" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg></span>
              <span>Saved Books</span>
            </Link>
          </div>

          {/* Category Chips Scroll */}
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
                href={"/library?" + new URLSearchParams({ ...(search ? { search } : {}), category: String(cat.id) })}
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
