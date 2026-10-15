import Navbar from "@/components/layout/Navbar"
import styles from "./layout.module.css"
import { StudyRoomProvider } from "@/context/StudyRoomContext"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudyRoomProvider>
      <Navbar />
      <main className={styles.main}>
        {children}
      </main>
    </StudyRoomProvider>
  )
}
