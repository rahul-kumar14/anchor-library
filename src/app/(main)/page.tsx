import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import styles from "./page.module.css"

const features = [
  {
    icon: "📚",
    title: "Massive Library",
    desc: "Access hundreds of books across all genres — fiction, science, history, competitive exams, and more. Free to read.",
  },
  {
    icon: "🏛️",
    title: "Virtual Study Rooms",
    desc: "Join silent study rooms, Pomodoro sessions, UPSC, GATE, coding rooms. Study with real people, globally.",
  },
  {
    icon: "💬",
    title: "Private Chat",
    desc: "Connect with study partners. Messages auto-delete after 3 days — privacy-first, just like studying together.",
  },
  {
    icon: "🔥",
    title: "Streaks & Goals",
    desc: "Track study hours, maintain daily streaks, join community challenges. Stay accountable, stay consistent.",
  },
  {
    icon: "🌍",
    title: "Global Community",
    desc: "Students worldwide studying together in real-time. Never study alone again.",
  },
  {
    icon: "🤖",
    title: "AI Recommendations",
    desc: "Personalized book suggestions and study plans powered by AI. Coming soon.",
  },
]

const rooms = [
  { icon: "🔕", name: "Silent Study", desc: "Zero distraction zone", color: "#D97706" },
  { icon: "🍅", name: "Pomodoro", desc: "25/5 focus sessions", color: "#DC2626" },
  { icon: "🌙", name: "Night Owl", desc: "Late night grind", color: "#7C3AED" },
  { icon: "📋", name: "UPSC / GATE", desc: "Exam preparation", color: "#B45309" },
  { icon: "💻", name: "Coding", desc: "DSA & development", color: "#059669" },
  { icon: "📖", name: "Reading Club", desc: "Read together", color: "#0284C7" },
]

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch real counts from DB
  const [{ count: bookCount }, { count: userCount }] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ])

  const stats = [
    { value: bookCount ? `${bookCount}+` : "—", label: "Books Available" },
    { value: "50+", label: "Categories" },
    { value: "∞", label: "Study Rooms" },
    { value: userCount ? `${userCount.toLocaleString()}+` : "—", label: "Members" },
  ]

  return (
    <div className={styles.page}>
      {/* Ambient background orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      {/* ===== HERO ===== */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroBadge}>
            <span className="badge badge-gold">🌐 Now Open to the World</span>
          </div>
          <h1 className={`${styles.heroTitle} heading-serif`}>
            The Library Where<br />
            <span className="text-gradient">You Never Study Alone</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Join thousands of students studying together in virtual rooms.
            Read books, track your progress, and build the habit of consistency —
            <strong> one focused session at a time.</strong>
          </p>
          <div className={styles.heroCta}>
            <Link href="/register" className="btn btn-primary btn-lg">
              🚀 Start Studying Free
            </Link>
            <Link href="/library" className="btn btn-secondary btn-lg">
              Browse Library
            </Link>
          </div>

          {/* Live preview mockup */}
          <div className={styles.heroPreview}>
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <span className={styles.liveDot}></span>
                <span className={styles.previewTitle}>Silent Study Room</span>
                <span className={styles.previewCount}>Live now</span>
              </div>
              <div className={styles.previewUsers}>
                {["R", "A", "K", "S", "M", "P"].map((l, i) => (
                  <div
                    key={i}
                    className="avatar-placeholder"
                    style={{
                      width: 36, height: 36, fontSize: 13,
                      background: `hsl(${i * 40 + 30}, 70%, 55%)`,
                      border: "2px solid #FFF8E7",
                      marginLeft: i > 0 ? -8 : 0,
                    }}
                  >
                    {l}
                  </div>
                ))}
                <span className={styles.previewMore}>+more</span>
              </div>
              <div className={styles.previewTimer}>02:34:18</div>
              <div className={styles.previewTimerLabel}>Session Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className={styles.statsSection}>
        <div className="container">
          <div className={styles.statsGrid}>
            {stats.map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className={`${styles.featuresSection} section`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="badge badge-primary">✨ Features</span>
            <h2 className={`${styles.sectionTitle} heading-serif`}>
              Everything You Need to<br /><span className="text-gradient">Study Smarter</span>
            </h2>
            <p className={styles.sectionDesc}>
              Built for students who want more than just books — they want community, accountability, and results.
            </p>
          </div>
          <div className={styles.featuresGrid}>
            {features.map((f, i) => (
              <div key={i} className={`${styles.featureCard} card animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STUDY ROOMS ===== */}
      <section className={`${styles.roomsSection} section`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="badge badge-secondary">🏛️ Study Rooms</span>
            <h2 className={`${styles.sectionTitle} heading-serif`}>
              Find Your <span className="text-gradient">Focus Zone</span>
            </h2>
            <p className={styles.sectionDesc}>
              Different rooms for different needs. Pick one and study with people just like you.
            </p>
          </div>
          <div className={styles.roomsGrid}>
            {rooms.map((r, i) => (
              <Link href="/study-rooms" key={i} className={styles.roomCard}>
                <div className={styles.roomIcon} style={{ background: `${r.color}18`, border: `1.5px solid ${r.color}35` }}>
                  {r.icon}
                </div>
                <div>
                  <div className={styles.roomName}>{r.name}</div>
                  <div className={styles.roomDesc}>{r.desc}</div>
                </div>
                <div className={styles.roomArrow} style={{ color: r.color }}>→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className={`${styles.ctaSection} section`}>
        <div className="container">
          <div className={styles.ctaCard}>
            <div className={styles.ctaGlow} />
            <h2 className={`${styles.ctaTitle} heading-serif`}>
              Ready to Study with the World?
            </h2>
            <p className={styles.ctaDesc}>
              Join Anchor Library today. Free forever for core features.
            </p>
            <Link href="/register" className="btn btn-primary btn-lg">
              🚀 Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <span>⚓</span>
              <span className="heading-serif" style={{ fontSize: "var(--text-lg)", color: "var(--color-primary-dark)" }}>
                Anchor Library
              </span>
            </div>
            <div className={styles.footerLinks}>
              <Link href="/library">Library</Link>
              <Link href="/study-rooms">Study Rooms</Link>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </div>
            <p className={styles.footerCopy}>© 2026 Anchor Library. Built for the world.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
