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
  const { data: items, error } = await supabase.from("favorites")
    .select("book_id,books(id,title,author,cover_url)").eq("user_id", user.id).order("created_at", { ascending: false })
  return <div className={styles.page}><div className="container">
    <div className={styles.header}><div><h1 className="heading-serif">Your next good read, saved.</h1><p className={styles.subtitle}>A private bookshelf you can return to anytime.</p></div><Link href="/library" className="btn btn-secondary">Browse Library</Link></div>
    {error ? <p role="alert">Your shelf could not be loaded. Please refresh to retry.</p> : !items?.length ? <div className={styles.emptyState}><h2>Start your reading shelf</h2><p>Use “Add to Favorites” on a book to save it here.</p><Link href="/library" className="btn btn-primary">Find a book</Link></div> :
      <div className="book-grid">{items.map(item => {
        const book = item.books as unknown as { id: number; title: string; author: string; cover_url: string | null } | null
        if (!book) return null
        return <article key={item.book_id}><Link href={"/library/" + book.id} className={styles.bookCard}>
          <div className={styles.coverWrap}>{book.cover_url ? <img src={book.cover_url} alt={book.title} className={styles.cover} /> : <span>📖</span>}</div>
          <div className={styles.bookInfo}><h2 className={styles.bookTitle}>{book.title}</h2><p className={styles.bookAuthor}>{book.author}</p></div>
        </Link><FavoriteButton bookId={book.id} initialSaved /></article>
      })}</div>}
  </div></div>
}
