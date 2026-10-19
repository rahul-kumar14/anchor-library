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
    .select("id,username,full_name,avatar_url,bio,is_admin,created_at,reading_streak")
    .eq("id", user.id)
    .single()

  const { data: readingProgress, count: readingCount } = await supabase
    .from("reading_progress")
    .select("*, books(title, cover_url)", { count: "exact" })
    .eq("is_completed", false)
    .eq("user_id", user.id)
    .order("last_read_at", { ascending: false })
    .limit(5)

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", user.id)
    .limit(6)

  const { count: completedCount } = await supabase
    .from("reading_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_completed", true)

  const { data: activityDays } = await supabase
    .from("reading_activity_days")
    .select("activity_date")
    .eq("user_id", user.id)
    .gte("activity_date", dateKey(daysAgo(365)))
    .order("activity_date", { ascending: true })

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .limit(5)

  const displayName = profile?.full_name || profile?.username || user.email?.split("@")[0]
  const activeBook = readingProgress?.[0]
  const activeBookPercent = activeBook ? Math.round((activeBook.current_page / (activeBook.total_pages || 1)) * 100) : 0
  const activeDates = new Set((activityDays ?? []).map((day: { activity_date: string }) => day.activity_date))
  const streak = activeDates.size ? calculateStreak(activeDates) : profile?.reading_streak ?? 0
  const week = Array.from({ length: 7 }, (_, index) => daysAgo(6 - index))
  const weekActivity = week.map(day => ({ date: day, active: activeDates.has(dateKey(day)) }))
  const weeklySessions = weekActivity.filter(day => day.active).length
  const nextAchievement = getNextAchievement({ streak, readingBooks: readingCount ?? 0, completedBooks: completedCount ?? 0, achievementCount: achievements?.length ?? 0 })

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

        <section className={styles.ritualGrid} aria-label="Your reading ritual">
          <div className={styles.todayCard}>
            <div className={styles.todayTopline}><span className={styles.kicker}>YOUR READING RITUAL</span><span className={styles.streakPill}>🔥 {streak} day{streak === 1 ? "" : "s"}</span></div>
            <h2>{activeBook ? "Pick up your next chapter." : "Your next chapter starts small."}</h2>
            <p>{activeBook ? <><strong>{activeBook.books?.title}</strong> is waiting at {activeBookPercent}%.</> : "Choose one book and make fifteen quiet minutes count."}</p>
            <div className={styles.ritualActions}>
              <Link href={activeBook ? `/read/${activeBook.book_id}` : "/library"} className="btn btn-primary">{activeBook ? "Resume reading →" : "Choose a book →"}</Link>
              <Link href="/study-rooms/pomodoro?minutes=25" className="btn btn-secondary">Start 25 min focus</Link>
            </div>
            <p className={styles.ritualHint}>One reading update or focused session keeps your ritual alive.</p>
          </div>
          <div className={styles.weekCard}>
            <div className={styles.cardEyebrow}>THIS WEEK</div>
            <div className={styles.weekDays}>{weekActivity.map(({ date, active }) => <div key={date.toISOString()} className={styles.day}><span>{date.toLocaleDateString("en-US", { weekday: "narrow" })}</span><i className={active ? styles.dayActive : undefined} aria-label={active ? "Reading activity" : "No reading activity"} /></div>)}</div>
            <p><strong>{weeklySessions}</strong> reading day{weeklySessions === 1 ? "" : "s"} this week</p>
            <span className={styles.weekNote}>{weeklySessions ? "Small, consistent sessions add up." : "Your first session starts the chain."}</span>
          </div>
        </section>

        {/* Quick Stats */}
        <div className={styles.statsGrid}>
          {[
            { icon: "🔥", label: "Reading Streak", value: `${streak}d`, color: "var(--color-primary)" },
            { icon: "📚", label: "Books Reading", value: readingCount ?? 0, color: "var(--color-secondary)" },
            { icon: "📖", label: "Books Finished", value: completedCount ?? 0, color: "var(--color-secondary)" },
            { icon: "🏆", label: "Achievements", value: achievements?.length ?? 0, color: "var(--color-accent)" },
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
              <div className={styles.nextAchievement}>
                <div className={styles.achievementIcon}>{nextAchievement.icon}</div>
                <div className={styles.achievementCopy}><span>UP NEXT</span><strong>{nextAchievement.title}</strong><p>{nextAchievement.description}</p></div>
                <div className={styles.achievementProgress}><div><span>{nextAchievement.current}</span> / {nextAchievement.target}</div><div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${Math.min(100, nextAchievement.current / nextAchievement.target * 100)}%` }} /></div></div>
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

function daysAgo(days: number) { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - days); return date }
function dateKey(date: Date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-") }
function calculateStreak(activeDates: Set<string>) { let streak = 0; for (let offset = 0; offset < 366; offset += 1) { if (!activeDates.has(dateKey(daysAgo(offset)))) break; streak += 1 }; return streak }
function getNextAchievement({ streak, readingBooks, completedBooks, achievementCount }: { streak: number, readingBooks: number, completedBooks: number, achievementCount: number }) {
  if (!achievementCount && readingBooks > 0) return { icon: "🧭", title: "First Anchor", description: "Complete your first focused reading session.", current: 0, target: 1 }
  if (streak < 7) return { icon: "🔥", title: "Seven-day rhythm", description: "Read on seven different days to make the habit feel like yours.", current: streak, target: 7 }
  if (completedBooks < 3) return { icon: "📚", title: "Shelf builder", description: "Finish three books and give your shelf a story.", current: completedBooks, target: 3 }
  return { icon: "✍️", title: "Reading regular", description: "Keep returning to the ideas worth holding on to.", current: readingBooks, target: Math.max(5, readingBooks + 1) }
}
