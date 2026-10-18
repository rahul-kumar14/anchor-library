import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifiedUser, privateJson, isRoomConversation } from "@/lib/server/access"

export async function GET(_req: NextRequest) {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in." }, 401)
    const admin = createAdminClient()
    const { data: memberships, error } = await admin.from("conversation_participants")
      .select("conversation_id,last_read_at").eq("user_id", user.id).limit(100)
    if (error) throw error
    const mine = (memberships || []).filter(p => !isRoomConversation(p.conversation_id))
    const ids = mine.map(p => p.conversation_id)
    let conversations: any[] = []
    if (ids.length) {
      const { data: partners, error: partnerError } = await admin.from("conversation_participants")
        .select("conversation_id,profiles:user_id(id,username,full_name,avatar_url)")
        .in("conversation_id", ids).neq("user_id", user.id)
      if (partnerError) throw partnerError
      const since = new Date(Date.now() - 7 * 86400000).toISOString()
      conversations = await Promise.all(mine.map(async membership => {
        const { data: last, error: messageError } = await admin.from("messages").select("content,created_at,sender_id")
          .eq("conversation_id", membership.conversation_id).eq("is_deleted", false).gte("created_at", since)
          .order("created_at", { ascending: false }).limit(1).maybeSingle()
        if (messageError) throw messageError
        return {
          id: membership.conversation_id, partner: partners?.find(p => p.conversation_id === membership.conversation_id)?.profiles || null,
          last_message: last,
          has_unread: !!last && last.sender_id !== user.id && (!membership.last_read_at || Date.parse(last.created_at) > Date.parse(membership.last_read_at)),
        }
      }))
      conversations.sort((a, b) => (b.last_message?.created_at || "").localeCompare(a.last_message?.created_at || ""))
    }
    const [{ data: incoming, error: incomingError }, { data: outgoing, error: outgoingError }] = await Promise.all([
      admin.from("chat_requests").select("id,from_user_id,status,created_at,profiles:from_user_id(id,username,full_name,avatar_url)")
        .eq("to_user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(50),
      admin.from("chat_requests").select("id,to_user_id,status,created_at,profiles:to_user_id(id,username,full_name,avatar_url)")
        .eq("from_user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    ])
    if (incomingError || outgoingError) throw incomingError || outgoingError
    const { data: notifications, error: notificationError } = await admin.from("notifications").select("id,type,payload,created_at")
      .eq("user_id", user.id).eq("is_read", false).order("created_at", { ascending: false }).limit(20)
    if (notificationError) throw notificationError
    return privateJson({ conversations, incomingRequests: incoming || [], outgoingRequests: outgoing || [], notifications: notifications || [], user_id: user.id })
  } catch (error) {
    console.error("Conversation list failed:", error)
    return privateJson({ error: "Unable to load your inbox." }, 500)
  }
}
