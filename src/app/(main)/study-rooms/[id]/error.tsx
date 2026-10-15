"use client"
import { useEffect } from "react"
import Link from "next/link"

export default function StudyRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Study room page error:", error)
  }, [error])

  return (
    <div style={{
      minHeight: "calc(100vh - 120px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
      padding: "2rem",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "3rem" }}>🏛️</div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Connection to Study Room Interrupted</h2>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "400px", fontSize: "0.9rem" }}>
        Unable to load the study room right now. You can try refreshing or choose another study room.
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => reset()}
        >
          🔄 Try Again
        </button>
        <Link href="/study-rooms" className="btn btn-secondary btn-sm">
          ← Back to Rooms
        </Link>
      </div>
    </div>
  )
}
