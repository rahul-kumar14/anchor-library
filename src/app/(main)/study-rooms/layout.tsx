import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Virtual Study Rooms — Silent, Pomodoro & Focus Co-Working Online",
  description:
    "Join quiet virtual study rooms with learners across the globe. Camera-free focus spaces for reading, UPSC, GATE, coding, and Pomodoro sessions.",
}

export default function StudyRoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
