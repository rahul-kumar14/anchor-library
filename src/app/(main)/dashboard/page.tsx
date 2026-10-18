import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import styles from "./page.module.css"

export const metadata = { title: "Dashboard — Your Study Hub" }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,full_name,avatar_url,bio,is_admin,created_at")
    .eq("id", user.id)
    .single()

  const { data: readingProgress, count: readingCount } = await supabase
    .from("reading_progress")
    .select("*, books(title, cover_url)", { count: "exact" })
    .eq("is_completed", false)
    .eq("user_id", user.id)
    .order("last_read_at", { ascending: false })
    .limit(5)

  const { data: favorites, count: favoriteCount } = await supabase
    .from("favorites")
    .select("*, books(id, title, cover_url, authors(name))", { count: "exact" })
    .eq("user_id", user.id)
    .limit(6)

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", user.id)
    .limit(6)

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .limit(5)

  const displayName = profile?.full_name || profile?.username || user.email?.split("@")[0]

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Welcome Header */}
        <div className={styles.welcomeBar}>
          <div className={styles.welcomeLeft}>
            <div className="avatar-placeholder avatar-lg" style={{ width: 56, height: 56, fontSize: 20, flexShrink: 0 }}>
              {displayName?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className={styles.welcomeTitle}>
                Good {getGreeting()}, <span className="text-gradient">{displayName}</span>! 👋
              </h1>
              <p className={styles.welcomeSub}>Ready to study today? Your community is waiting.</p>
            </div>
          </div>
          <Link href="/study-rooms" className="btn btn-primary">
            🏛️ Join Study Room
          </Link>
        </div>

        {/* Quick Stats */}
        <div className={styles.statsGrid}>
          {[
            { icon: "📚", label: "Books Reading", value: readingCount ?? 0, color: "var(--color-primary)" },
            { icon: "❤️", label: "Favorites", value: favoriteCount ?? 0, color: "var(--color-danger)" },
            { icon: "🏆", label: "Achievements", value: achievements?.length ?? 0, color: "var(--color-accent)" },
            { icon: "🔔", label: "Notifications", value: notifications?.length ?? 0, color: "var(--color-secondary)" },
          ].map((s, i) => (
            <div key={i} className={`${styles.statCard} card`}>
              <div className={styles.statIcon} style={{ color: s.color }}>{s.icon}</div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className={styles.contentGrid}>
          {/* Continue Reading */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>📖 Continue Reading</h2>
              <Link href="/library" className="btn btn-ghost btn-sm">View Library →</Link>
            </div>
            {readingProgress && readingProgress.length > 0 ? (
              <div className={styles.readingList}>
                {readingProgress.map((item: any) => (
                  <Link key={item.id} href={`/read/${item.book_id}`} className={`${styles.readingItem} card`}>
                    <div className={styles.readingCover}>
                      {item.books?.cover_url ? (
                        <img src={item.books.cover_url} alt={item.books?.title} />
                      ) : (
                        <span>📚</span>
                      )}
                    </div>
                    <div className={styles.readingInfo}>
                      <div className={styles.readingTitle}>{item.books?.title}</div>
                      <div className={styles.readingProgress}>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill}
                            style={{ width: `${Math.min(100, (item.current_page / (item.total_pages || 1)) * 100)}%` }} />
                        </div>
                        <span className={styles.readingPercent}>
                          {Math.round((item.current_page / (item.total_pages || 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptySection}>
                <span>📭</span>
                <p>Start reading a book from the library!</p>
                <Link href="/library" className="btn btn-primary btn-sm">Browse Books</Link>
              </div>
            )}
          </div>

          {/* Favorites + Achievements */}
          <div className={styles.rightCol}>
            {/* Achievements */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>🏆 Achievements</h2>
              </div>
              {achievements && achievements.length > 0 ? (
                <div className={styles.achievementsGrid}>
                  {achievements.map((a: any) => (
                    <div key={a.id} className={styles.achievementBadge} title={a.description}>
                      <span>{a.icon ?? "🏅"}</span>
                      <span className={styles.achievementTitle}>{a.title || a.type?.replace(/_/g, " ") || "Milestone"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptySection}>
                  <span>🏅</span>
                  <p>Study to earn achievements!</p>
                </div>
              )}
            </div>

            {/* Notifications */}
            {notifications && notifications.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>🔔 Notifications</h2>
                </div>
                <div className={styles.notifList}>
                  {notifications.map((n: any) => (
                    <div key={n.id} className={styles.notifItem}>
                      <div className={styles.notifTitle}>{n.payload?.title || "Study update"}</div>
                      <div className={styles.notifBody}>{n.payload?.body || "Open your inbox for details."}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}
