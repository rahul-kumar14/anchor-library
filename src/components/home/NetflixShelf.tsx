"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import styles from "./NetflixShelf.module.css"

export interface ShelfBookItem {
  room: {
    id: string
    name: string
    icon: string
  }
  book: {
    id: string | number
    title: string
    author?: string | null
    cover_url?: string | null
    cover_image_url?: string | null
  }
}

interface NetflixShelfProps {
  shelf: ShelfBookItem[]
}

export default function NetflixShelf({ shelf }: NetflixShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 20)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 20)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true })
      window.addEventListener("resize", checkScroll)
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [shelf])

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = Math.max(el.clientWidth * 0.75, 320)
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <div className={styles.shelfContainer}>
      {/* Netflix Left Arrow Button */}
      <button
        type="button"
        className={`${styles.navArrow} ${styles.leftArrow} ${!canScrollLeft ? styles.hidden : ""}`}
        onClick={() => scroll("left")}
        aria-label="Scroll shelf left"
      >
        <span className={styles.arrowIcon}>‹</span>
      </button>

      {/* Side-Scrolling Shelf Viewport */}
      <div ref={scrollRef} className={styles.scrollViewport}>
        <div className={styles.booksTrack}>
          {shelf.map(({ room, book }) => (
            <article className={styles.bookCard} key={room.id}>
              <Link
                href={`/library/${book.id}`}
                className={styles.coverWrap}
                aria-label={`Preview ${book.title}`}
              >
                {book.cover_url || book.cover_image_url ? (
                  <img
                    src={book.cover_url || book.cover_image_url!}
                    alt={book.title}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.coverPlaceholder}>
                    <span>📖</span>
                  </div>
                )}
                <div className={styles.coverGlare} />
                <span className={styles.roomBadge}>
                  <span>{room.icon}</span> {room.name}
                </span>
              </Link>

              <div className={styles.bookInfo}>
                <h3 className={styles.bookTitle}>
                  <Link href={`/library/${book.id}`} title={book.title}>
                    {book.title}
                  </Link>
                </h3>
                <p className={styles.bookAuthor}>{book.author || "Anchor Library"}</p>
                <div className={styles.cardActions}>
                  <Link href={`/library/${book.id}`} className={styles.readBtn}>
                    Read Now ↗
                  </Link>
                  <Link
                    href={`/study-rooms/${room.id}`}
                    className={styles.roomLink}
                    title={`Join ${room.name}`}
                  >
                    Room ↗
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Netflix Right Arrow Button */}
      <button
        type="button"
        className={`${styles.navArrow} ${styles.rightArrow} ${!canScrollRight ? styles.hidden : ""}`}
        onClick={() => scroll("right")}
        aria-label="Scroll shelf right"
      >
        <span className={styles.arrowIcon}>›</span>
      </button>
    </div>
  )
}
