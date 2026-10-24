"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import styles from "./ReadingNudgeModal.module.css"

interface ActiveProgressBook {
  id: string
  book_id: string
  current_page: number
  total_pages: number
  percent: number
  bookTitle: string
  author: string
  cover_url: string | null
}

export default function ReadingNudgeModal() {
  const pathname = usePathname()
  const [candidate, setCandidate] = useState<ActiveProgressBook | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't show modal if already inside study room or reading view
  const isInReadingZone = pathname?.startsWith("/study-rooms") || pathname?.startsWith("/read/")

  useEffect(() => {
    if (isInReadingZone || isDismissed) return

    const supabase = createClient()

    async function checkHighestProgressBook() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user's in-progress books
      const { data: list } = await supabase
        .from("reading_progress")
        .select("id, book_id, current_page, total_pages, is_completed, books(id, title, author, cover_url)")
        .eq("user_id", user.id)
        .eq("is_completed", false)

      if (!list || list.length === 0) return

      // Calculate percentage and find maximum completion book
      const withPercents: ActiveProgressBook[] = list.map((item: any) => {
        const total = item.total_pages || item.current_page || 100
        const current = item.current_page || 1
        const pct = Math.min(99, Math.round((current / total) * 100))
        return {
          id: item.id,
          book_id: item.book_id || item.books?.id,
          current_page: current,
          total_pages: total,
          percent: pct,
          bookTitle: item.books?.title || "Your Reading Book",
          author: item.books?.author || "Author",
          cover_url: item.books?.cover_url || null
        }
      })

      // Sort descending by percentage
      withPercents.sort((a, b) => b.percent - a.percent)
      const topBook = withPercents[0]

      if (topBook && topBook.percent > 0) {
        setCandidate(topBook)

        // Check last prompted time from sessionStorage to prevent spamming
        const lastPrompt = typeof window !== "undefined" ? sessionStorage.getItem("anchor_last_nudge_time") : null
        const now = Date.now()

        // Prompt if 10 minutes (600,000ms) passed, or first time after 20 seconds
        if (!lastPrompt || (now - parseInt(lastPrompt, 10)) > 600000) {
          const timer = setTimeout(() => {
            setIsOpen(true)
            sessionStorage.setItem("anchor_last_nudge_time", Date.now().toString())
          }, 20000)
          return () => clearTimeout(timer)
        }
      }
    }

    checkHighestProgressBook()

    const interval = setInterval(() => {
      checkHighestProgressBook()
    }, 600000)

    return () => clearInterval(interval)
  }, [pathname, isInReadingZone, isDismissed])

  if (!isOpen || !candidate || isInReadingZone) return null

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Reading Progress Reminder">
      <div className={styles.modalCard}>
        
        {/* Glow & Sparkles */}
        <div className={styles.sparkleHeader}>
          <span className={styles.trophyIcon}>🏆</span>
          <div className={styles.fireworksText}>✦ ✧ FOCUS MOMENTUM ✧ ✦</div>
          <button 
            type="button" 
            onClick={() => { setIsOpen(false); setIsDismissed(true) }} 
            className={styles.closeBtn}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalContent}>
          <div className={styles.bookVisualRow}>
            {candidate.cover_url ? (
              <img src={candidate.cover_url} alt={candidate.bookTitle} className={styles.bookCoverThumb} />
            ) : (
              <div className={styles.bookFallbackThumb}>📖</div>
            )}
            
            <div className={styles.bookInfoCol}>
              <span className={styles.finishNudgeBadge}>Almost there! Finish &amp; Earn Rewards</span>
              <h3 className={styles.modalBookTitle}>{candidate.bookTitle}</h3>
              <p className={styles.modalAuthor}>{candidate.author}</p>
              
              <div className={styles.progressStatBox}>
                <div className={styles.progressRow}>
                  <span>Progress achieved</span>
                  <span className={styles.percentGold}>{candidate.percent}% Complete</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${candidate.percent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.encouragementQuote}>
            &ldquo;You have completed <strong>{candidate.percent}%</strong> of this book! Continue your reading session now to earn bonus reward points and keep your momentum going.&rdquo;
          </div>

          {/* Action Buttons */}
          <div className={styles.modalActions}>
            <button 
              type="button" 
              onClick={() => { setIsOpen(false); setIsDismissed(true) }}
              className={styles.cancelBtn}
            >
              Maybe Later
            </button>
            <Link 
              href={`/study-rooms/reading?book=${candidate.book_id}`}
              onClick={() => setIsOpen(false)}
              className={styles.openRoomBtn}
            >
              <span>Continue in Study Room ›</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
