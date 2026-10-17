"use client"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"

const StudyRoomClient = dynamic(() => import("@/components/study-room/StudyRoomClient"), {
  ssr: false,
  loading: () => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 100px)",
      color: "var(--color-text-secondary)",
      fontSize: "0.95rem",
      gap: "8px"
    }}>
      <span>🏛️</span>
      <span>Entering Study Room...</span>
    </div>
  ),
})

const ROOM_DATA: Record<string, { name: string; icon: string; desc: string; color: string; defaultGoal: string }> = {
  silent: { name: "Silent Study", icon: "🔕", desc: "Strictly silent. Maximum focus and zero distractions.", color: "#6C63FF", defaultGoal: "Deep reading & note taking" },
  pomodoro: { name: "Pomodoro Focus", icon: "🍅", desc: "25 minutes deep focus followed by 5 minutes mindful break.", color: "#FF6B6B", defaultGoal: "Complete 4 Pomodoro cycles" },
  "night-owl": { name: "Night Owl Study", icon: "🌙", desc: "Late night grinding community. Keep each other awake and motivated.", color: "#4A90D9", defaultGoal: "Late night syllabus revision" },
  reading: { name: "Hindi Literature & Books", icon: "📖", desc: "Immerse in Hindi literature, fiction, novels and poetry.", color: "#F59E0B", defaultGoal: "Read 50 pages of chosen book" },
  "english-lit": { name: "English Literature", icon: "📚", desc: "English classics, novels, critical analysis and essays.", color: "#0D9488", defaultGoal: "Read English literature & take notes" },
  upsc: { name: "UPSC / Civil Services", icon: "📋", desc: "General studies, NCERT, answer writing & current affairs.", color: "#FFB347", defaultGoal: "Daily answer writing & GS revision" },
  gate: { name: "GATE / Engineering", icon: "⚙️", desc: "Problem solving, core engineering concepts and mock tests.", color: "#A78BFA", defaultGoal: "Solve 25 numerical problems" },
  coding: { name: "Coding & DSA Room", icon: "💻", desc: "Algorithms, system design, projects and bug squash.", color: "#00D4AA", defaultGoal: "2 LeetCode Mediums + 1 feature build" },
  language: { name: "Language Learning", icon: "🌐", desc: "Vocabulary drills, grammar and reading practice.", color: "#EC4899", defaultGoal: "Learn 30 new words + speaking practice" },
}

export default function StudyRoomInsidePage() {
  const params = useParams()
  const rawId = params?.id
  const roomId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "silent"

  const room = ROOM_DATA[roomId] || {
    name: roomId.toUpperCase() + " Study Room",
    icon: "🏛️",
    desc: "Collaborative quiet study zone",
    color: "#6C63FF",
    defaultGoal: "Deep focused study session",
  }

  return <StudyRoomClient room={room} roomId={roomId} />
}