"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import styles from "./page.module.css"
import { uniqueStudyMembers } from "@/lib/study-presence"
import { useStudyRoomSession } from "@/context/StudyRoomContext"

const ROOM_TYPES = [
  { id: "silent", icon: "🔕", name: "Silent Study", desc: "Zero distraction. Pure focus.", color: "#6C63FF" },
  { id: "pomodoro", icon: "🍅", name: "Pomodoro Focus", desc: "25 min work, 5 min break cycles.", color: "#FF6B6B" },
  { id: "night-owl", icon: "🌙", name: "Night Owl Study", desc: "Late night grind. You are not alone.", color: "#4A90D9" },
  { id: "reading", icon: "📖", name: "Hindi Literature & Books", desc: "Read Hindi literature, fiction, novels & poetry.", color: "#F59E0B" },
  { id: "english-lit", icon: "📚", name: "English Literature", desc: "English classics, novels, prose & world literature.", color: "#0D9488" },
  { id: "upsc", icon: "📋", name: "UPSC / Civil Services", desc: "IAS/IPS aspirants study room.", color: "#FFB347" },
  { id: "coding", icon: "💻", name: "Coding & DSA", desc: "DSA, development, tech & algorithms.", color: "#00D4AA" },
  { id: "gate", icon: "⚙️", name: "GATE / Engineering", desc: "Engineering & science exam prep.", color: "#A78BFA" },
  { id: "language", icon: "🌐", name: "Language Learning", desc: "Grammar, vocabulary & linguistic practice.", color: "#EC4899" },
]

export default function StudyRoomsPage() {
  const supabase = createClient()
  const { activeSession } = useStudyRoomSession()
  const [roomMembers, setRoomMembers] = useState<Record<string, string[]>>({})
  const roomCounts = Object.fromEntries(Object.entries(roomMembers).map(([room, ids]) => [room, ids.length]))
  const totalOnline = new Set(Object.values(roomMembers).flat()).size

  useEffect(() => {
    // Connect to all room channels to get presence counts
    const channels = ROOM_TYPES.map(room => {
      const channel = supabase.channel(`room:${room.id}`, {
        config: { presence: { key: "" } }
      })
      
      channel.on("presence", { event: "sync" }, () => {
        const ids = uniqueStudyMembers(channel.presenceState())
        setRoomMembers(previous => ({ ...previous, [room.id]: ids }))
      })

      channel.subscribe(status => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRoomMembers(previous => ({ ...previous, [room.id]: [] }))
      })
      return channel
    })

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [supabase])

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header} style={{ marginTop: "2rem" }}>
          <div className={styles.badge}>
            <span className="badge badge-secondary">🏛️ Virtual Rooms</span>
          </div>
          <h1 className={`${styles.title} heading-serif`}>
            Find Your <span className="text-gradient">Study Room</span>
          </h1>
          <p className={styles.subtitle}>
            Pick a room that matches your goal. Study with real people in real-time.
            <br />Stay consistent. Stay accountable.
          </p>
        </div>

        {/* Live stats bar */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <div className={styles.liveDot} />
            <span><strong style={{ color: "var(--color-secondary)" }}>{totalOnline}</strong> {totalOnline === 1 ? "person" : "people"} studying right now</span>
          </div>
          <div className={styles.statItem}>
            <span>⏱️ <strong style={{ color: "var(--color-accent)" }}>Live</strong> sync enabled</span>
          </div>
          <div className={styles.statItem}>
            <span>🎧 Camera-free study rooms</span>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className={styles.roomsGrid}>
          {ROOM_TYPES.map((room) => {
            const isMyRoom = activeSession?.roomId === room.id
            const count = roomCounts[room.id] || 0
            
            return (
              <Link
                href={`/study-rooms/${room.id}`}
                key={room.id}
                className={styles.roomCard}
                style={{ "--room-color": room.color } as any}
              >
                <div className={styles.roomCardTop}>
                  <div
                    className={styles.roomIcon}
                    style={{ background: `${room.color}22`, border: `1px solid ${room.color}44` }}
                  >
                    {room.icon}
                  </div>
                  <div className={styles.roomMeta}>
                    <div className={styles.roomName}>{room.name}</div>
                    <div className={styles.roomDesc}>{room.desc}</div>
                  </div>
                </div>
                <div className={styles.roomCardBottom}>
                  <div className={styles.roomParticipants}>
                    {count > 0 ? (
                      <div className={styles.liveIndicator}>
                        <div className={styles.liveDot} />
                        <span style={{ color: "var(--color-secondary)", fontSize: "var(--text-xs)" }}>LIVE</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>🟢 Open</span>
                    )}
                    <span className={styles.participantCount}>
                      {count} {count === 1 ? 'person' : 'people'} studying
                    </span>
                  </div>
                  <span
                    className={`btn btn-sm ${styles.joinBtn}`}
                    style={{
                      background: isMyRoom ? "rgba(16, 185, 129, 0.2)" : `${room.color}22`,
                      color: isMyRoom ? "#10b981" : room.color,
                      border: `1px solid ${isMyRoom ? "#10b981" : `${room.color}55`}`,
                      fontWeight: isMyRoom ? 700 : undefined,
                    }}
                  >
                    {isMyRoom ? "In Session 🟢" : "Join Room →"}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}