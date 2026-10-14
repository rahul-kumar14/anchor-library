import { createClient } from "@/lib/supabase/server"
import styles from "./page.module.css"

export const metadata = { title: "Activity — Admin" }

export default async function AdminActivityPage() {
  const supabase = await createClient()

  // Fetch recent signups
  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("id, username, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10)

  // Fetch recent books added
  const { data: recentBooks } = await supabase
    .from("books")
    .select("id, title, author, created_at, language")
    .order("created_at", { ascending: false })
    .limit(10)

  // Fetch recent reading activity
  const { data: recentReads } = await supabase
    .from("reading_progress")
    .select("id, user_id, book_id, current_page, last_read_at, books(title), profiles(username, full_name)")
    .order("last_read_at", { ascending: false })
    .limit(15)

  // Merge into a single timeline
  const timeline: { time: string; icon: string; color: string; text: string }[] = []

  recentUsers?.forEach((u) => {
    timeline.push({
      time: u.created_at,
      icon: "👤",
      color: "#059669",
      text: `New member joined: ${u.full_name || u.username || u.id.slice(0, 8)}`,
    })
  })

  recentBooks?.forEach((b) => {
    timeline.push({
      time: b.created_at,
      icon: "📚",
      color: "#D97706",
      text: `Book added: "${b.title}" by ${b.author || "Unknown"} (${b.language})`,
    })
  })

  recentReads?.forEach((r: any) => {
    const name = r.profiles?.full_name || r.profiles?.username || "A user"
    const bookTitle = r.books?.title || "a book"
    timeline.push({
      time: r.last_read_at,
      icon: "📖",
      color: "#7C3AED",
      text: `${name} read page ${r.current_page} of "${bookTitle}"`,
    })
  })

  // Sort by time descending
  timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  const formatTime = (t: string) => {
    const d = new Date(t)
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    })
  }

  const totalCount = recentUsers?.length ?? 0
  const booksCount = recentBooks?.length ?? 0
  const readsCount = recentReads?.length ?? 0

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Activity Feed</h1>
          <p className={styles.pageSubtitle}>Real-time view of what&apos;s happening on the platform</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{totalCount}</span>
            <span className={styles.statLbl}>New Members</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{booksCount}</span>
            <span className={styles.statLbl}>Books Added</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{readsCount}</span>
            <span className={styles.statLbl}>Read Sessions</span>
          </div>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📊</span>
          <p>No activity recorded yet.</p>
          <p className={styles.emptyHint}>Activity will appear here as users join and interact.</p>
        </div>
      ) : (
        <div className={styles.timelineCard}>
          <div className={styles.timelineList}>
            {timeline.map((item, i) => (
              <div key={i} className={styles.timelineItem}>
                <div className={styles.timelineDot} style={{ background: item.color, boxShadow: `0 0 8px ${item.color}50` }}>
                  {item.icon}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineText}>{item.text}</div>
                  <div className={styles.timelineTime}>{formatTime(item.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
