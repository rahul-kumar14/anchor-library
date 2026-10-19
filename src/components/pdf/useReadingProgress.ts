"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

// Both readers use the same server-side progress. Do not save page 1 while a
// previous reading position is still loading, or while the page count is unknown.
export function useReadingProgress(bookId: string | number | null, userId: string | null) {
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [readyKey, setReadyKey] = useState("")
  const [progressStatus, setProgressStatus] = useState("")
  const key = `${bookId}:${userId}`

  useEffect(() => { setNumPages(null) }, [bookId])

  useEffect(() => {
    let cancelled = false
    setPageNumber(1)
    setReadyKey("")
    setProgressStatus("")
    if (bookId && userId) {
      createClient().from("reading_progress").select("current_page").eq("book_id", bookId).eq("user_id", userId)
        .maybeSingle().then(({ data, error }) => {
          if (cancelled) return
          if (error) { setProgressStatus("Could not restore reading position"); return }
          setPageNumber(Math.max(1, data?.current_page || 1))
          setReadyKey(key)
        })
    }
    return () => { cancelled = true }
  }, [bookId, userId, key])

  useEffect(() => {
    if (numPages && pageNumber > numPages) setPageNumber(numPages)
  }, [numPages, pageNumber])

  useEffect(() => {
    if (!bookId || !userId || readyKey !== key || !numPages || pageNumber > numPages) return
    let cancelled = false
    const timeout = setTimeout(async () => {
      const supabase = createClient()
      const payload = {
        user_id: userId, book_id: bookId, current_page: pageNumber, total_pages: numPages,
        progress_percent: Math.round(pageNumber / numPages * 100),
        is_completed: pageNumber === numPages, last_read_at: new Date().toISOString(),
      }
      const { data, error: lookupError } = await supabase.from("reading_progress").select("id")
        .eq("book_id", bookId).eq("user_id", userId).maybeSingle()
      if (cancelled) return
      if (lookupError) { setProgressStatus("Progress could not be saved"); return }
      const { error } = data
        ? await supabase.from("reading_progress").update(payload).eq("id", data.id).eq("user_id", userId)
        : await supabase.from("reading_progress").insert(payload)
      if (!error) await supabase.from("reading_activity_days").upsert({
        user_id: userId, activity_date: new Date().toISOString().slice(0, 10), last_read_at: new Date().toISOString(),
      }, { onConflict: "user_id,activity_date" })
      if (!cancelled) setProgressStatus(error ? "Progress could not be saved" : "Progress saved")
    }, 700)
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [bookId, userId, pageNumber, numPages, readyKey, key])

  return { pageNumber, setPageNumber, numPages, setNumPages, progressStatus }
}
