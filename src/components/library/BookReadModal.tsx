"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface BookRoomModalProps {
  book: {
    id: number | string
    title: string
    author?: string
    cover_url?: string | null
    genre?: string | null
    description_hindi?: string | null
    language?: string | null
    description?: string | null
    category_id?: number | string | null
  }
  categoryName?: string
  hasPdf: boolean
}

// Map each study room to its details and keywords
const ROOM_MAP: Record<string, { id: string; name: string; icon: string; theme: string; keywords: string[] }> = {
  silent: { id: "silent", name: "Silent Study", icon: "🤫", theme: "Deep Focus & Philosophy", keywords: ["philosophy", "meditations", "classic"] },
  pomodoro: { id: "pomodoro", name: "Pomodoro Focus", icon: "⏱️", theme: "Productivity & Self-Help", keywords: ["productivity", "habit", "focus", "self-help", "self help"] },
  "night-owl": { id: "night-owl", name: "Night Owl Study", icon: "🦉", theme: "Mystery, Thriller & Fiction", keywords: ["mystery", "thriller", "dracula", "science fiction", "horror"] },
  reading: { id: "reading", name: "Hindi Literature & Books", icon: "📖", theme: "Hindi Sahitya, Fiction & Poetry", keywords: ["hindi", "premchand", "poetry", "kavita", "godan"] },
  "english-lit": { id: "english-lit", name: "English Literature", icon: "🏛️", theme: "English Classics & Critical Analysis", keywords: ["classic", "literature", "pride and prejudice", "fiction", "novel"] },
  upsc: { id: "upsc", name: "UPSC / Civil Services", icon: "⚖️", theme: "History, Polity & General Studies", keywords: ["history", "polity", "upsc", "civil", "geography", "nationalist", "social"] },
  gate: { id: "gate", name: "GATE / Engineering", icon: "⚙️", theme: "Engineering, Mathematics & Science", keywords: ["engineering", "science", "math", "signal", "statistics", "data science"] },
  coding: { id: "coding", name: "Coding & DSA", icon: "💻", theme: "Algorithms, Python & Systems", keywords: ["programming", "coding", "dsa", "javascript", "python", "algorithms", "tech", "computer"] },
  language: { id: "language", name: "Language Learning", icon: "🌍", theme: "Grammar, Vocabulary & Drills", keywords: ["language", "grammar", "vocabulary", "english learning", "words"] },
}

export function detectBestRoom(book: BookRoomModalProps["book"], categoryName: string = ""): { id: string; name: string; icon: string; theme: string } {
  // 1. Explicit admin assignment
  if (book.description_hindi && ROOM_MAP[book.description_hindi]) {
    return ROOM_MAP[book.description_hindi]
  }

  // 2. Language check: Hindi books belong to Hindi Literature room
  if (book.language?.toLowerCase() === "hindi" || /hindi/i.test(categoryName)) {
    return ROOM_MAP["reading"]
  }

  // 3. Search combined text
  const text = [book.title, book.author, book.genre, book.description, categoryName].filter(Boolean).join(" ").toLowerCase()

  if (/coding|programming|dsa|algorithm|python|javascript|data structure|developer/i.test(text)) return ROOM_MAP["coding"]
  if (/engineering|gate|signal processing|complexity science|circuit|calculus|physics/i.test(text)) return ROOM_MAP["gate"]
  if (/upsc|polity|constitution|civil services|indian history|geography/i.test(text)) return ROOM_MAP["upsc"]
  if (/mystery|thriller|dracula|horror|vampire|crime/i.test(text)) return ROOM_MAP["night-owl"]
  if (/vocabulary|grammar|spoken english|language/i.test(text)) return ROOM_MAP["language"]
  if (/self-help|habit|atomic|productivity|mindset/i.test(text)) return ROOM_MAP["pomodoro"]
  if (/meditations|stoic|philosophy|seneca|epictetus|marcus aurelius/i.test(text)) return ROOM_MAP["silent"]

  // Default for general English classics/novels
  return ROOM_MAP["english-lit"]
}

export default function BookReadModal({
  book,
  categoryName = "",
  hasPdf = true,
}: BookRoomModalProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const targetRoom = detectBestRoom(book, categoryName)

  const handleJoinAndRead = () => {
    router.push(`/study-rooms/${targetRoom.id}?book=${book.id}`)
  }

  return (
    <>
      {hasPdf ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-primary w-full"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            height: "44px",
            fontWeight: 700,
            fontSize: "0.95rem",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Read in Study Room</span>
        </button>
      ) : (
        <button className="btn btn-primary w-full" disabled style={{ height: "44px" }}>
          Coming Soon
        </button>
      )}

      {/* Ambiance Modal Dialog */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
            background: "rgba(10, 6, 3, 0.85)",
            backdropFilter: "blur(12px)",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "480px",
              width: "100%",
              background: "linear-gradient(135deg, rgba(34, 18, 8, 0.96) 0%, rgba(20, 10, 4, 0.98) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "20px",
              padding: "28px 24px 24px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 32px rgba(245, 158, 11, 0.2)",
              color: "#fffdfa",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Cross */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close modal"
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#e2e8f0",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            {/* Room Badge Icon */}
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                margin: "0 auto 16px",
                background: "radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(30, 15, 6, 0.9) 100%)",
                border: "2px solid rgba(245, 158, 11, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.2rem",
                boxShadow: "0 0 20px rgba(245, 158, 11, 0.35)",
              }}
            >
              {targetRoom.icon}
            </div>

            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: "#fbbf24",
                textTransform: "uppercase",
              }}
            >
              STUDY ROOM EXCLUSIVE
            </span>

            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginTop: "6px",
                marginBottom: "8px",
                fontFamily: "var(--font-heading)",
                lineHeight: 1.25,
                color: "#fffdfa",
              }}
            >
              This book belongs to <br />
              <span style={{ color: "#fbbf24" }}>{targetRoom.name}</span>
            </h3>

            <p
              style={{
                fontSize: "0.85rem",
                color: "#d8c3ad",
                lineHeight: 1.5,
                marginBottom: "20px",
                padding: "0 10px",
              }}
            >
              To give you deep focus, camera-free company, highlight notes, and <strong>+20 reward points per reading section</strong>, this book opens directly inside the study room canvas!
            </p>

            {/* Book Mini Info Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "rgba(48, 25, 12, 0.65)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "12px",
                padding: "10px 14px",
                marginBottom: "22px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "50px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  background: "#140a04",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {book.cover_url ? (
                  <img src={book.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "1.2rem" }}>📖</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {book.title}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#b09c88" }}>
                  {book.author ? `By ${book.author}` : targetRoom.theme}
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleJoinAndRead}
              style={{
                width: "100%",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                border: "1px solid rgba(255, 220, 150, 0.4)",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(180, 83, 9, 0.45)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(217, 119, 6, 0.6)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(180, 83, 9, 0.45)"
              }}
            >
              <span>Join Room & Open Book Canvas</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
