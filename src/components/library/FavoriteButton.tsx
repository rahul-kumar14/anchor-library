"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function FavoriteButton({
  bookId,
  initialSaved = false,
  variant = "pill",
}: {
  bookId: string | number
  initialSaved?: boolean
  variant?: "pill" | "icon" | "full"
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/favorites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, favorite: !saved }),
      })
      const data = await response.json()
      if (response.status === 401) {
        router.push("/login?redirect=" + encodeURIComponent("/library/" + bookId))
        return
      }
      if (!response.ok) throw new Error(data.error || "Unable to save this book.")
      setSaved(data.favorite)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please retry.")
    } finally {
      setBusy(false)
    }
  }

  // Floating Bookmark/Heart badge variant for book covers
  if (variant === "pill" || variant === "icon") {
    return (
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          title={saved ? "Remove from Saved" : "Save to Favorites"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "9999px",
            background: saved ? "rgba(24, 13, 6, 0.85)" : "rgba(32, 18, 9, 0.75)",
            border: saved ? "1px solid rgba(245, 158, 11, 0.6)" : "1px solid rgba(255, 255, 255, 0.18)",
            color: saved ? "#fcd34d" : "#e2e8f0",
            backdropFilter: "blur(10px)",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
            boxShadow: saved ? "0 4px 12px rgba(245, 158, 11, 0.25)" : "0 4px 10px rgba(0, 0, 0, 0.35)",
            transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: busy ? "scale(0.95)" : "scale(1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)"
            e.currentTarget.style.borderColor = "#f59e0b"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.borderColor = saved ? "rgba(245, 158, 11, 0.6)" : "rgba(255, 255, 255, 0.18)"
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={saved ? "#ef4444" : "none"}
            stroke={saved ? "#ef4444" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: saved ? "scale(1.1)" : "scale(1)",
            }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{busy ? "..." : saved ? "Saved" : "Save"}</span>
        </button>
        {error && (
          <p role="alert" style={{ fontSize: "0.7rem", color: "#f87171", marginTop: "4px" }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  // Full button variant (for detail page)
  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary w-full"
        aria-pressed={saved}
        disabled={busy}
        onClick={handleToggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={saved ? "#ef4444" : "none"}
          stroke={saved ? "#ef4444" : "currentColor"}
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span>{busy ? "Updating..." : saved ? "Saved to Favorites" : "Add to Favorites"}</span>
      </button>
      {error && <p role="alert" style={{ fontSize: "0.8rem", marginTop: 8, color: "#f87171" }}>{error}</p>}
    </div>
  )
}
