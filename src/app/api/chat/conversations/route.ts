import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(req.url)
    const userId = user?.id || searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 })
    }

    const admin = createAdminClient()

    // 1. Fetch conversations for this user
    const { data: participations } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId)

    const convIds = (participations || []).map((p: any) => p.conversation_id)

    let conversations: any[] = []

    if (convIds.length > 0) {
      const { data: partners } = await admin
        .from("conversation_participants")
        .select("conversation_id, user_id, profiles:user_id(id, username, full_name, avatar_url, bio)")
        .in("conversation_id", convIds)
        .neq("user_id", userId)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const convMap: Record<string, any> = {}
      for (const p of partners || []) {
        convMap[p.conversation_id] = {
          id: p.conversation_id,
          partner: p.profiles,
          last_message: null,
        }
      }

      for (const cid of convIds) {
        const { data: lastMsg } = await admin
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", cid)
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (convMap[cid]) {
          convMap[cid].last_message = lastMsg || null
        }
      }

      conversations = Object.values(convMap)
    }

    // 2. Fetch pending incoming chat requests
    const { data: incomingRequests } = await admin
      .from("chat_requests")
      .select("id, from_user_id, status, created_at, profiles:from_user_id(id, username, full_name, avatar_url)")
      .eq("to_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    // 3. Fetch pending outgoing chat requests
    const { data: outgoingRequests } = await admin
      .from("chat_requests")
      .select("id, to_user_id, status, created_at, profiles:to_user_id(id, username, full_name, avatar_url)")
      .eq("from_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    return NextResponse.json({
      conversations,
      incomingRequests: incomingRequests || [],
      outgoingRequests: outgoingRequests || [],
      user_id: userId,
    })
  } catch (err: any) {
    console.error("Error fetching conversations:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch conversations" }, { status: 500 })
  }
}
