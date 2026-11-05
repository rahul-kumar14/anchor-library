import type { Metadata } from "next"
import Link from "next/link"
import styles from "../guide.module.css"

export const metadata: Metadata = {
  title: "Study With Me Online — Virtual Accountability & Pomodoro Sessions",
  description:
    "Looking for a Study With Me session online? Join Anchor Library's live virtual study rooms. Study together with timers, soundscapes, and body doubling.",
  keywords: [
    "study with me online",
    "study with me live",
    "virtual study buddy",
    "online study group",
    "pomodoro study with me",
    "study stream online",
  ],
}

export default function StudyWithMeGuide() {
  return (
    <article className={styles.guideContainer}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/study-rooms">Study Rooms</Link>
        <span>/</span>
        <span>Study With Me</span>
      </nav>

      <span className={styles.badge}>Productivity &amp; Habits</span>
      <h1 className={styles.title}>Study With Me Online: Your 24/7 Virtual Accountability Space</h1>
      <p className={styles.lead}>
        No more studying alone. Experience the focus boost of "Study With Me" sessions in real-time virtual rooms equipped with synchronized timers and ambient focus sounds.
      </p>

      <section className={styles.articleSection}>
        <h2>The Power of "Study With Me" for Focus</h2>
        <p>
          "Study With Me" has become a global phenomenon because working alongside someone else naturally anchors your attention. When you sit down in an Anchor Library room, you immediately see fellow learners setting session goals, tracking Pomodoro intervals, and making consistent progress.
        </p>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <span className={styles.cardIcon}>⏱️</span>
            <h3>Sync Pomodoro Clock</h3>
            <p>Work in 25-minute sprints with automatic audio cues for breaks to avoid mental burnout.</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.cardIcon}>🎯</span>
            <h3>Session Goal Setting</h3>
            <p>Declare your goal before you begin to reinforce commitment and track completion.</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.cardIcon}>🌧️</span>
            <h3>Built-In Ambient Sounds</h3>
            <p>Choose gentle rain, white noise, cafe murmur, or brown noise to block background sounds.</p>
          </div>
        </div>
      </section>

      <section className={styles.articleSection}>
        <h2>How to Get Started in 3 Steps</h2>
        <ol style={{ paddingLeft: 20, fontSize: "1.05rem" }}>
          <li style={{ marginBottom: 12 }}>
            <strong>Pick your study room:</strong> Select Silent, Pomodoro, Night Owl, or a specialized exam prep room.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Set your session goal:</strong> Type what you plan to accomplish in the next 1-2 hours.
          </li>
          <li style={{ marginBottom: 12 }}>
            <strong>Start your timer:</strong> Immerse in your books, notes, or tasks with zero camera anxiety.
          </li>
        </ol>
      </section>

      <div className={styles.ctaBox}>
        <h3>Begin your study session today</h3>
        <p>Find your focus and study with motivated students and readers worldwide.</p>
        <Link href="/study-rooms" className={styles.ctaButton}>
          Join a Live Session Now ↗
        </Link>
      </div>
    </article>
  )
}

