"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { detectBestRoom } from "@/components/library/BookReadModal"

export default function ReaderRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const bookId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) {
      router.replace("/study-rooms")
      return
    }

    async function redirectBookToRoom() {
      const supabase = createClient()
      const { data: book } = await supabase
        .from("books")
        .select("id,title,author,genre,description,description_hindi,language,category_id,categories(name)")
        .eq("id", bookId)
        .single()

      if (book) {
        const categoryName = (book as any).categories?.name || ""
        const targetRoom = detectBestRoom(book, categoryName)
        router.replace(`/study-rooms/${targetRoom.id}?book=${book.id}`)
      } else {
        router.replace(`/study-rooms/silent?book=${bookId}`)
      }
    }

    redirectBookToRoom()
  }, [bookId, router])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #120904 0%, #1e1006 100%)",
        color: "#fffdfa",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "3px solid rgba(245, 158, 11, 0.25)",
          borderTopColor: "#f59e0b",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
        Entering Study Room Canvas...
      </h3>
      <p style={{ color: "#d8c3ad", fontSize: "0.85rem", margin: 0 }}>
        Loading focused reading, camera-free company & reward points.
      </p>
    </div>
  )
}
