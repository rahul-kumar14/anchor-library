import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"

export const metadata = { title: "Dashboard — Your Reading & Study Sanctuary" }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,full_name,avatar_url,bio,is_admin,created_at,reading_streak")
    .eq("id", user.id)
    .single()

  // Currently reading books
  const { data: readingProgress, count: readingCount } = await supabase
    .from("reading_progress")
    .select("*, books(id, title, cover_url, author)", { count: "exact" })
    .eq("is_completed", false)
    .eq("user_id", user.id)
    .order("last_read_at", { ascending: false })

  // Find book with the MAXIMUM percentage progress to feature prominently
  const inProgressSortedByPercent = [...(readingProgress || [])].sort((a: any, b: any) => {
    const pctA = Math.round(((a.current_page || 0) / (a.total_pages || 100)) * 100)
    const pctB = Math.round(((b.current_page || 0) / (b.total_pages || 100)) * 100)
    return pctB - pctA
  })
  const activeBook = inProgressSortedByPercent[0] || null
  const activeBookPercent = activeBook ? Math.min(99, Math.round(((activeBook.current_page || 1) / (activeBook.total_pages || 100)) * 100)) : 0

  // Finished books with full details
  const { data: completedBooks, count: completedCount } = await supabase
    .from("reading_progress")
    .select("id, book_id, current_page, total_pages, last_read_at, books(id, title, author, cover_url)", { count: "exact" })
    .eq("user_id", user.id)
    .eq("is_completed", true)
    .order("last_read_at", { ascending: false })

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", user.id)
    .limit(8)

  // Fetch reader rewards earned in study rooms
  const { data: readerRewards } = await supabase
    .from("reader_rewards")
    .select("id, points, section_number, target_pages, earned_at, books(id, title, cover_url)")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false })

  const totalRewardPoints = (readerRewards || []).reduce((acc: number, r: any) => acc + (r.points || 0), 0)

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
  const activeDates = new Set((activityDays ?? []).map((day: { activity_date: string }) => day.activity_date))
  const streak = activeDates.size ? calculateStreak(activeDates) : profile?.reading_streak ?? 0
  const week = Array.from({ length: 7 }, (_, index) => daysAgo(6 - index))
  const weekActivity = week.map(day => ({
    weekday: day.toLocaleDateString("en-US", { weekday: "narrow" }),
    active: activeDates.has(dateKey(day))
  }))

  const nextAchievement = getNextAchievement({
    streak,
    readingBooks: readingCount ?? 0,
    completedBooks: completedCount ?? 0,
    achievementCount: (achievements?.length || 0) + (readerRewards?.length || 0),
    rewardPoints: totalRewardPoints
  })

  return (
    <DashboardClient
      displayName={displayName}
      greeting={getGreeting()}
      streak={streak}
      readingCount={readingCount ?? 0}
      completedCount={completedCount ?? 0}
      totalRewardPoints={totalRewardPoints}
      achievementCount={achievements?.length || 0}
      weekActivity={weekActivity}
      activeBook={activeBook}
      activeBookPercent={activeBookPercent}
      readingProgress={inProgressSortedByPercent || []}
      completedBooks={completedBooks || []}
      readerRewards={readerRewards || []}
      nextAchievement={nextAchievement}
      notifications={notifications || []}
    />
  )
}

function daysAgo(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
}

function calculateStreak(activeDates: Set<string>) {
  // If user read today or yesterday, streak is actively intact
  const hasToday = activeDates.has(dateKey(daysAgo(0)));
  const hasYesterday = activeDates.has(dateKey(daysAgo(1)));

  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  // Start from today if already active today, otherwise count continuously from yesterday backwards
  const startOffset = hasToday ? 0 : 1;
  for (let offset = startOffset; offset < 366; offset += 1) {
    if (!activeDates.has(dateKey(daysAgo(offset)))) break;
    streak += 1;
  }
  return streak;
}

function getNextAchievement({
  streak,
  readingBooks,
  completedBooks,
  achievementCount,
  rewardPoints,
}: {
  streak: number
  readingBooks: number
  completedBooks: number
  achievementCount: number
  rewardPoints: number
}) {
  if (rewardPoints < 100) {
    return {
      icon: "⚡",
      title: "Centurion Reader",
      description: "Earn 100 reward points by reading sections inside study rooms.",
      current: rewardPoints,
      target: 100
    }
  }
  if (!achievementCount && readingBooks > 0) {
    return {
      icon: "🎯",
      title: "First Anchor",
      description: "Complete your first focused reading session in a room.",
      current: 0,
      target: 1
    }
  }
  if (streak < 7) {
    return {
      icon: "🔥",
      title: "Seven-Day Rhythm",
      description: "Read on seven distinct days to cement your reading ritual.",
      current: streak,
      target: 7
    }
  }
  if (completedBooks < 3) {
    return {
      icon: "📚",
      title: "Shelf Builder",
      description: "Finish 3 full books and grow your personal treasury.",
      current: completedBooks,
      target: 3
    }
  }
  return {
    icon: "👑",
    title: "Master Scholar",
    description: "Read consistently and unlock your maximum potential.",
    current: readingBooks,
    target: Math.max(5, readingBooks + 1)
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
