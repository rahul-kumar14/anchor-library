import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversation_id")
    const userId = user?.id || searchParams.get("user_id")

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // AUTO-DELETE: Purge all messages older than 7 days (1 week) permanently
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await admin
      .from("messages")
      .delete()
      .lt("created_at", sevenDaysAgo)

    // Fetch messages for this conversation within 7 days, including sender profile
    const { data: messages, error: msgErr } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, profiles:sender_id(id, username, full_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: true })

    if (msgErr) throw msgErr

    // Fetch partner details if 1-on-1
    let partner = null
    if (userId) {
      const { data: otherParticipant } = await admin
        .from("conversation_participants")
        .select("user_id, profiles:user_id(id, username, full_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .neq("user_id", userId)
        .maybeSingle()

      partner = (otherParticipant as any)?.profiles || null
    }

    return NextResponse.json({
      messages: messages || [],
      partner,
      auto_delete_notice: "All messages in this chat are automatically deleted after 7 days.",
      user_id: userId,
    })
  } catch (err: any) {
    console.error("Error fetching messages:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { conversation_id, content } = body
    const senderId = user?.id || body.sender_id || body.user_id

    if (!senderId) {
      return NextResponse.json({ error: "Sender ID is required" }, { status: 401 })
    }

    if (!conversation_id || !content || !content.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Insert message into database with sender profile join
    const { data: newMessage, error: insErr } = await admin
      .from("messages")
      .insert({
        conversation_id,
        sender_id: senderId,
        content: content.trim(),
      })
      .select("id, conversation_id, sender_id, content, created_at, profiles:sender_id(id, username, full_name, avatar_url)")
      .single()

    if (insErr) {
      console.error("Insert message error:", insErr)
      throw insErr
    }

    // Update conversation updated_at
    await admin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id)

    return NextResponse.json({ success: true, message: newMessage })
  } catch (err: any) {
    console.error("Error sending message:", err)
    return NextResponse.json({ error: err.message || "Failed to send message" }, { status: 500 })
  }
}
