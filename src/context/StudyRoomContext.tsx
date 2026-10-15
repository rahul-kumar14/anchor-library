"use client"
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react"
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

  // Sync Supabase presence whenever activeSession changes
  useEffect(() => {
    if (!activeSession) {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      return
    }

    let isMounted = true

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isMounted) return

      const username = user.user_metadata?.username || user.email?.split("@")[0] || "User"
      
      // Cleanup previous channel if roomId changed
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }

      const ch = supabase.channel(`room:${activeSession.roomId}`, {
        config: { presence: { key: "" } },
      })

      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            id: user.id,
            username,
            status: activeSession.status || "Studying quietly ✍️",
            readingBook: activeSession.readingBook || null,
            joined_at: activeSession.joinedAt || new Date().toISOString(),
          })
        }
      })

      channelRef.current = ch
    })

    return () => {
      isMounted = false
      // Do NOT unsubscribe here when navigating to another page!
      // Unsubscribe only happens when activeSession is cleared via leaveSession().
    }
  }, [activeSession?.roomId, activeSession?.status, activeSession?.readingBook])

  const joinSession = (session: ActiveStudySession) => {
    setActiveSession(session)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {}
  }

  const updateSessionStatus = (status: string, readingBook?: string | null) => {
    setActiveSession((prev) => {
      if (!prev) return null
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
  }

  const leaveSession = () => {
    setActiveSession(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
  }

  return (
    <StudyRoomContext.Provider value={{ activeSession, joinSession, leaveSession, updateSessionStatus }}>
      {children}
    </StudyRoomContext.Provider>
  )
}

export function useStudyRoomSession() {
  return useContext(StudyRoomContext)
}
