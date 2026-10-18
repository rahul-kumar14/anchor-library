"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function FavoriteButton({ bookId, initialSaved = false }: { bookId: string | number; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  return <div>
    <button className="btn btn-secondary w-full" aria-pressed={saved} disabled={busy} onClick={async () => {
      setBusy(true); setError("")
      try {
        const response = await fetch("/api/favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId, favorite: !saved }) })
        const data = await response.json()
        if (response.status === 401) { router.push("/login?redirect=" + encodeURIComponent("/library/" + bookId)); return }
        if (!response.ok) throw new Error(data.error || "Unable to save this book.")
        setSaved(data.favorite)
        router.refresh()
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Please retry.") }
      finally { setBusy(false) }
    }}>{busy ? "Updating…" : saved ? "♥ Saved to Favorites" : "♡ Add to Favorites"}</button>
    {error && <p role="alert" style={{ fontSize: "0.8rem", marginTop: 8 }}>{error}</p>}
  </div>
}
