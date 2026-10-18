"use client"
import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

export interface ActiveStudySession {
  roomId: string
  roomName: string
  roomIcon: string
  status: string
  readingBook?: string | null
  joinedAt: string
}

interface StudyRoomContextType {
  activeSession: ActiveStudySession | null
  joinSession: (session: ActiveStudySession) => void
  leaveSession: () => void
  updateSessionStatus: (status: string, readingBook?: string | null) => void
}

const StudyRoomContext = createContext<StudyRoomContextType>({
  activeSession: null,
  joinSession: () => {},
  leaveSession: () => {},
  updateSessionStatus: () => {},
})

const STORAGE_KEY = "anchor_active_study_session"

export function StudyRoomProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveStudySession | null>(null)
  const channelRef = useRef<any>(null)
  const supabase = createClient()
  const sessionRef = useRef(activeSession)
  sessionRef.current = activeSession
  const identityRef = useRef<{ id: string; username: string } | null>(null)

  // Load active session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setActiveSession(parsed)
      }
    } catch (err) {
      console.error("Failed to load study session from localStorage", err)
    }
  }, [])

  // Keep one presence subscription for this room. Status/book changes update
  // its payload instead of reconnecting and briefly counting a member twice.
  useEffect(() => {
    if (!activeSession?.roomId) return
    let disposed = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || disposed) return
      identityRef.current = { id: user.id, username: user.user_metadata?.username || user.email?.split("@")[0] || "User" }
      const ch = supabase.channel(`room:${activeSession.roomId}`, { config: { presence: { key: user.id } } })
      channel = ch
      channelRef.current = ch
      ch.subscribe(async status => {
        const session = sessionRef.current
        if (status === "SUBSCRIBED" && !disposed && session) {
          await ch.track({ ...identityRef.current, status: session.status,
            readingBook: session.readingBook || null, joined_at: session.joinedAt })
        }
      })
    })
    return () => {
      disposed = true
      if (channel) supabase.removeChannel(channel)
      if (channelRef.current === channel) channelRef.current = null
    }
  }, [activeSession?.roomId, supabase])

  useEffect(() => {
    const ch = channelRef.current
    if (ch?.state === "joined" && activeSession && identityRef.current) {
      ch.track({ ...identityRef.current, status: activeSession.status,
        readingBook: activeSession.readingBook || null, joined_at: activeSession.joinedAt }).catch(console.error)
    }
  }, [activeSession?.status, activeSession?.readingBook])

  const joinSession = useCallback((session: ActiveStudySession) => {
    setActiveSession(previous => previous?.roomId === session.roomId ? previous : session)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {}
  }, [])

  const updateSessionStatus = useCallback((status: string, readingBook?: string | null) => {
    setActiveSession((prev) => {
      if (!prev) return null
      if (prev.status === status && (readingBook === undefined || prev.readingBook === readingBook)) return prev
      const updated = {
        ...prev,
        status,
        readingBook: readingBook !== undefined ? readingBook : prev.readingBook,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const leaveSession = useCallback(() => {
    setActiveSession(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [supabase])

  return (
    <StudyRoomContext.Provider value={{ activeSession, joinSession, leaveSession, updateSessionStatus }}>
      {children}
    </StudyRoomContext.Provider>
  )
}

export function useStudyRoomSession() {
  return useContext(StudyRoomContext)
}
