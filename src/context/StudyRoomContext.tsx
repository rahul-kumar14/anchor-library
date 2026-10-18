"use client"
import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { isRoomPage } from "@/lib/study-presence"

export interface ActiveStudySession {
  roomId: string; roomName: string; roomIcon: string; status: string
  readingBook?: string | null; joinedAt: string
}
export interface StudyMember { id: string; username: string; status: string; readingBook?: string; joined_at: string }
interface StudyRoomContextType {
  activeSession: ActiveStudySession | null
  members: Record<string, StudyMember>
  joinSession: (session: ActiveStudySession) => void
  leaveSession: () => void
  updateSessionStatus: (status: string, readingBook?: string | null) => void
}
const StudyRoomContext = createContext<StudyRoomContextType>({
  activeSession: null, members: {}, joinSession: () => {}, leaveSession: () => {}, updateSessionStatus: () => {},
})
export function StudyRoomProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [session, setSession] = useState<ActiveStudySession | null>(null)
  const [members, setMembers] = useState<Record<string, StudyMember>>({})
  const activeSession = session && isRoomPage(pathname, session.roomId) ? session : null
  const channelRef = useRef<any>(null)
  const sessionRef = useRef(activeSession)
  sessionRef.current = activeSession
  const supabase = createClient()

  // Legacy persisted sessions must never silently rejoin a room on another page.
  useEffect(() => { localStorage.removeItem("anchor_active_study_session") }, [])
  const leaveSession = useCallback(() => {
    setSession(null)
    setMembers({})
    const ch = channelRef.current
    if (ch) { ch.untrack(); supabase.removeChannel(ch); channelRef.current = null }
  }, [supabase])
  const joinSession = useCallback((next: ActiveStudySession) => {
    if (isRoomPage(pathname, next.roomId)) setSession(previous => previous?.roomId === next.roomId ? previous : next)
  }, [pathname])
  const updateSessionStatus = useCallback((status: string, readingBook?: string | null) => {
    setSession(previous => {
      if (!previous || (previous.status === status && (readingBook === undefined || previous.readingBook === readingBook))) return previous
      return { ...previous, status, readingBook: readingBook === undefined ? previous.readingBook : readingBook }
    })
  }, [])
  useEffect(() => {
    if (session && !isRoomPage(pathname, session.roomId)) leaveSession()
  }, [pathname, session?.roomId, leaveSession])
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") leaveSession()
    })
    return () => subscription.unsubscribe()
  }, [supabase, leaveSession])

  useEffect(() => {
    if (!activeSession) return
    let disposed = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let identity: { id: string; username: string } | null = null
    const track = () => {
      const current = sessionRef.current
      if (!disposed && channel?.state === "joined" && current && identity) {
        channel.track({ ...identity, status: current.status, readingBook: null, joined_at: current.joinedAt }).catch(console.error)
      }
    }
    const untrack = () => { channel?.untrack() }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || disposed) return
      identity = { id: user.id, username: user.user_metadata?.username || "Member" }
      channel = supabase.channel("room:" + activeSession.roomId, { config: { presence: { key: user.id } } })
      channel.on("presence", { event: "sync" }, () => {
        if (disposed || !channel) return
        const next: Record<string, StudyMember> = {}
        for (const entries of Object.values(channel.presenceState())) for (const entry of entries) {
          const member = entry as unknown as StudyMember
          if (member.id) next[member.id] = member
        }
        setMembers(next)
      })
      channelRef.current = channel
      channel.subscribe(status => {
        if (status === "SUBSCRIBED") track()
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setMembers({})
      })
    })
    window.addEventListener("pagehide", untrack)
    window.addEventListener("pageshow", track)
    return () => {
      disposed = true
      window.removeEventListener("pagehide", untrack)
      window.removeEventListener("pageshow", track)
      if (channel) { channel.untrack(); supabase.removeChannel(channel) }
      if (channelRef.current === channel) channelRef.current = null
    }
  }, [activeSession?.roomId, supabase])
  useEffect(() => {
    const ch = channelRef.current
    if (ch?.state === "joined" && activeSession) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && sessionRef.current?.roomId === activeSession.roomId && ch.state === "joined") ch.track({
          id: user.id, username: user.user_metadata?.username || "Member", status: activeSession.status,
          readingBook: null, joined_at: activeSession.joinedAt,
        })
      })
    }
  }, [activeSession?.status, activeSession?.readingBook, supabase])
  return <StudyRoomContext.Provider value={{ activeSession, members: activeSession ? members : {}, joinSession, leaveSession, updateSessionStatus }}>{children}</StudyRoomContext.Provider>
}
export function useStudyRoomSession() { return useContext(StudyRoomContext) }
