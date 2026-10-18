import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { privateJson, isUuid, findDirectConversation } from "@/lib/server/access"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params
    if (!isUuid(targetUserId)) return privateJson({ error: "Invalid member ID." }, 400)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return privateJson({ error: "Please sign in." }, 401)
    const currentUserId = user.id

    const admin = createAdminClient()

    // 1. Fetch target user's real profile
    const { data: profile, error: profError } = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, reading_streak, created_at")
      .eq("id", targetUserId)
      .maybeSingle()

    if (profError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 2. Fetch target user's real reading progress & books
    const { data: progressList } = currentUserId === targetUserId ? await admin
      .from("reading_progress")
      .select("id, current_page, total_pages, progress_percent, is_completed, last_read_at, books(id, title, cover_url, total_pages)")
      .eq("user_id", targetUserId)
      .order("last_read_at", { ascending: false }) : { data: [] }

    const books = progressList || []
    const totalCompleted = books.filter((b: any) => b.is_completed).length
    const totalReading = books.filter((b: any) => !b.is_completed).length

    // 3. Determine relationship with current user
    let chatStatus = {
      is_self: currentUserId ? currentUserId === targetUserId : false,
      request_status: null as string | null,
      request_direction: null as "sent" | "received" | null,
      request_id: null as number | null,
      conversation_id: null as string | null,
    }

    if (currentUserId && currentUserId !== targetUserId) {
      // Check for mutual chat request
      const { data: requests } = await admin
        .from("chat_requests")
        .select("*")
        .or(`and(from_user_id.eq.${currentUserId},to_user_id.eq.${targetUserId}),and(from_user_id.eq.${targetUserId},to_user_id.eq.${currentUserId})`)
        .order("created_at", { ascending: false })
        .limit(1)

      const latestReq = requests?.[0]
      if (latestReq) {
        chatStatus.request_status = latestReq.status
        chatStatus.request_id = latestReq.id
        chatStatus.request_direction = latestReq.from_user_id === currentUserId ? "sent" : "received"
      }

      // Check if conversation exists
      const conversationId = await findDirectConversation(admin, currentUserId, targetUserId)
      if (conversationId) {
        chatStatus.conversation_id = conversationId
        chatStatus.request_status = "accepted"
      }
    }

    return privateJson({
      profile,
      reading_history_private: currentUserId !== targetUserId,
      stats: {
        total_books: books.length,
        total_completed: totalCompleted,
        total_reading: totalReading,
        reading_streak: currentUserId === targetUserId ? profile.reading_streak ?? 0 : 0,
      },
      books: books.map((b: any) => ({
        id: b.id,
        title: b.books?.title || "Book",
        cover_url: b.books?.cover_url || null,
        current_page: b.current_page || 0,
        total_pages: b.total_pages || b.books?.total_pages || 100,
        progress_percent: b.progress_percent || (b.is_completed ? 100 : 0),
        is_completed: b.is_completed || false,
      })),
      chatStatus,
    })
  } catch (err: any) {
    console.error("Error in profile route:", err)
    return privateJson({ error: "Unable to load the member profile." }, 500)
  }
}
