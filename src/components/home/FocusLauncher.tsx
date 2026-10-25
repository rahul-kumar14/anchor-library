"use client"

import { useRouter } from "next/navigation"
import styles from "./FocusLauncher.module.css"

export default function FocusLauncher() {
  const router = useRouter()
  return <section className={styles.card} aria-label="Study room preview">
    <div className={styles.top}>
      <span className={styles.mark}>⚓</span>
      <span className={styles.roomName}>Silent Study Room</span>
      <span className={styles.live}><span className={styles.pulseDot} /> 2 online</span>
      <span className={styles.tag}>⏱ 25:00</span>
    </div>
    <div className={styles.workspace}>
      <article className={styles.reader}>
        <div className={styles.bookSpineGlow} />
        <div className={styles.bookmarkRibbon} />
        <div className={styles.editionTag}>Anchor Library Edition</div>
        <h2>The Psychology<br />of Money</h2>
        <p>Most people don’t make financial decisions on a spreadsheet. They make them at the dinner table, or in a meeting room.</p>
        <p>What seems crazy to one person might make perfect sense to another.</p>
        <div className={styles.pageTurnCorner} title="Page 18 of 248">
          <span className={styles.pageNo}>p. 18</span>
          <span className={styles.turnFold}>↷</span>
        </div>
      </article>
      <aside className={styles.chat}>
        <div className={styles.chatHead}>
          <span className={styles.activeTab}>Chat</span>
          <span>People (2)</span>
        </div>
        <div className={styles.messages}>
          <div className={styles.message}>
            <span className={styles.avatar}>Y</span>
            <div>
              <strong>You</strong>
              <p>This chapter is making me rethink my habits.</p>
            </div>
          </div>
          <div className={styles.message}>
            <span className={styles.avatar} style={{ background: "#97b977" }}>S</span>
            <div>
              <strong>Study buddy</strong>
              <p>Totally agree! Let&apos;s read the next one together.</p>
            </div>
          </div>
        </div>
        <div className={styles.composer}>
          <span>Type a message…</span>
          <span className={styles.sendIcon}>↵</span>
        </div>
      </aside>
    </div>
    <button className={styles.start} type="button" onClick={() => router.push("/study-rooms/pomodoro?goal=Read+with+focus&minutes=25")}>
      Start your focus session →
    </button>
    <div className={styles.bottom}>
      <span>📖 Open a book</span>
      <span>👥 Read together</span>
      <span>💡 Keep the idea</span>
    </div>
  </section>
}
