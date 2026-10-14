import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Send a chat request
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const fromUserId = user?.id || body.from_user_id || body.user_id
    const toUserId = body.to_user_id

    if (!fromUserId) {
      return NextResponse.json({ error: "Sender user ID is required" }, { status: 401 })
    }

    if (!toUserId || toUserId === fromUserId) {
      return NextResponse.json({ error: "Invalid target user" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if a request already exists between them
    const { data: existing } = await admin
      .from("chat_requests")
      .select("*")
      .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
      .order("created_at", { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      const prev = existing[0]
      if (prev.status === "pending") {
        return NextResponse.json({ message: "Chat request already pending", request: prev })
      }
      if (prev.status === "accepted") {
        return NextResponse.json({ message: "Chat already connected", request: prev })
      }
    }

    // Insert new request
    const { data: newReq, error: insErr } = await admin
      .from("chat_requests")
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: "pending",
      })
      .select()
      .single()

    if (insErr) throw insErr

    return NextResponse.json({ success: true, request: newReq })
  } catch (err: any) {
    console.error("Error sending chat request:", err)
    return NextResponse.json({ error: err.message || "Failed to send chat request" }, { status: 500 })
  }
}

// Accept or decline a chat request
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { request_id, action } = body
    const currentUserId = user?.id || body.user_id

    if (!request_id || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch the request
    const { data: request, error: reqErr } = await admin
      .from("chat_requests")
      .select("*")
      .eq("id", request_id)
      .single()

    if (reqErr || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (action === "decline") {
      await admin.from("chat_requests").update({ status: "declined" }).eq("id", request_id)
      return NextResponse.json({ success: true, status: "declined" })
    }

    // ACCEPT:
    await admin.from("chat_requests").update({ status: "accepted" }).eq("id", request_id)

    const userA = request.from_user_id
    const userB = request.to_user_id

    // Check if conversation already exists between userA and userB
    const { data: convsA } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userA)

    let convId: string | null = null

    if (convsA && convsA.length > 0) {
      const convIds = convsA.map((c: any) => c.conversation_id)
      const { data: convsB } = await admin
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userB)
        .in("conversation_id", convIds)
        .limit(1)
        .maybeSingle()

      if (convsB) {
        convId = convsB.conversation_id
      }
    }

    // If no existing conversation, create one
    if (!convId) {
      const { data: newConv, error: newConvErr } = await admin
        .from("conversations")
        .insert({})
        .select("id")
        .single()

      if (newConvErr) throw newConvErr
      convId = newConv.id

      // Add both participants
      await admin.from("conversation_participants").insert([
        { conversation_id: convId, user_id: userA },
        { conversation_id: convId, user_id: userB },
      ])
    }

    return NextResponse.json({ success: true, status: "accepted", conversation_id: convId })
  } catch (err: any) {
    console.error("Error processing chat request:", err)
    return NextResponse.json({ error: err.message || "Failed to process chat request" }, { status: 500 })
  }
}
