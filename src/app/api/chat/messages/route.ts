import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifiedUser, privateJson, isUuid, canAccessConversation, isRoomConversation } from "@/lib/server/access"

const fields = "id,conversation_id,sender_id,content,created_at,profiles:sender_id(id,username,full_name,avatar_url)"
const historySince = () => new Date(Date.now() - 7 * 86400000).toISOString()

export async function GET(req: NextRequest) {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in." }, 401)
    const id = req.nextUrl.searchParams.get("conversation_id")
    if (!isUuid(id)) return privateJson({ error: "Valid conversation_id required." }, 400)
    const admin = createAdminClient()
    if (!await canAccessConversation(admin, id, user.id)) return privateJson({ error: "Conversation access denied." }, 403)
    const { data, error } = await admin.from("messages").select(fields).eq("conversation_id", id)
      .eq("is_deleted", false).gte("created_at", historySince()).order("created_at", { ascending: false }).limit(100)
    if (error) throw error
    let partner = null
    if (!isRoomConversation(id)) {
      const { data: other } = await admin.from("conversation_participants")
        .select("profiles:user_id(id,username,full_name,avatar_url)").eq("conversation_id", id).neq("user_id", user.id).limit(1).maybeSingle()
      partner = other?.profiles || null
      // Reading a private thread marks only this user's participation as read.
      const { error: readError } = await admin.from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", user.id)
      if (readError) throw readError
    }
    return privateJson({ messages: (data || []).reverse(), partner, user_id: user.id, history_notice: "Showing the last 7 days of messages." })
  } catch (error) {
    console.error("Message read failed:", error)
    return privateJson({ error: "Unable to load messages." }, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in." }, 401)
    const { conversation_id: id, content } = await req.json()
    if (!isUuid(id) || typeof content !== "string" || !content.trim() || content.length > 4000) {
      return privateJson({ error: "Choose a conversation and enter a message of 1–4000 characters." }, 400)
    }
    const admin = createAdminClient()
    if (!await canAccessConversation(admin, id, user.id)) return privateJson({ error: "Conversation access denied." }, 403)
    const { data, error } = await admin.from("messages").insert({ conversation_id: id, sender_id: user.id, content: content.trim() }).select(fields).single()
    if (error) throw error
    await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id)
    return privateJson({ success: true, message: data })
  } catch (error) {
    console.error("Message send failed:", error)
    return privateJson({ error: "Unable to send the message. Please retry." }, 500)
  }
}
