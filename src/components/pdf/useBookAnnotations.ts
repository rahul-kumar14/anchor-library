"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type HighlightColor = "amber" | "blue" | "pink" | "green"
export type BookAnnotation = { id: string; page_number: number; selected_text: string; note: string | null; color: HighlightColor | null }

export function useBookAnnotations(bookId: string | number | null, userId: string | null) {
  const [annotations, setAnnotations] = useState<BookAnnotation[]>([])
  const [saving, setSaving] = useState(false)
  const [noteStatus, setNoteStatus] = useState("")
  const currentKey = `${bookId}:${userId}`
  const keyRef = useRef(currentKey)
  keyRef.current = currentKey

  useEffect(() => {
    let cancelled = false
    setAnnotations([])
    setNoteStatus("")
    setSaving(false)
    if (bookId && userId) {
      createClient().from("annotations").select("id,page_number,selected_text,note,color")
        .eq("book_id", bookId).eq("user_id", userId).order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (cancelled) return
          if (error) setNoteStatus("Unable to load saved notes. Please reopen the book to retry.")
          else setAnnotations(data || [])
        })
    }
    return () => { cancelled = true }
  }, [bookId, userId])

  async function saveAnnotation(page: number, quote: string, note: string, color: HighlightColor = "amber") {
    if (!bookId || !userId || saving || (!quote.trim() && !note.trim())) return false
    const key = currentKey
    setSaving(true)
    setNoteStatus("")
    try {
      const { data, error } = await createClient().from("annotations").insert({
        user_id: userId, book_id: bookId, page_number: page,
        selected_text: quote.trim() || `Page ${page} Note`, note: note.trim(), color,
      }).select("id,page_number,selected_text,note,color").single()
      if (error || !data) throw error || new Error("No saved note was returned")
      if (keyRef.current !== key) return false
      setAnnotations(previous => [data, ...previous])
      setNoteStatus("Note saved")
      return true
    } catch (error) {
      console.error("Unable to save annotation:", error)
      if (keyRef.current === key) setNoteStatus("Note could not be saved. Your draft is still here; please retry.")
      return false
    } finally {
      if (keyRef.current === key) setSaving(false)
    }
  }

  async function removeAnnotation(annotationId: string) {
    if (!annotationId || !userId) return false
    const { error } = await createClient().from("annotations").delete().eq("id", annotationId).eq("user_id", userId)
    if (error) { setNoteStatus("Could not remove highlight"); return false }
    setAnnotations(previous => previous.filter(annotation => annotation.id !== annotationId))
    setNoteStatus("Highlight removed")
    return true
  }

  return { annotations, saveAnnotation, removeAnnotation, saving, noteStatus }
}
