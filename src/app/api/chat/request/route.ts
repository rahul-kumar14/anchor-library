import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifiedUser, privateJson, isUuid, findDirectConversation } from "@/lib/server/access"

export async function POST(req: NextRequest) {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in." }, 401)
    const { to_user_id: target } = await req.json()
    if (!isUuid(target) || target === user.id) return privateJson({ error: "Invalid target user." }, 400)
    const admin = createAdminClient()
    const { data: profile } = await admin.from("profiles").select("id").eq("id", target).maybeSingle()
    if (!profile) return privateJson({ error: "Member not found." }, 404)
    const existingConversation = await findDirectConversation(admin, user.id, target)
    if (existingConversation) return privateJson({ message: "Already connected.", conversation_id: existingConversation })
    const { data: existing, error: lookupError } = await admin.from("chat_requests").select("id,from_user_id,to_user_id,status")
      .or("and(from_user_id.eq." + user.id + ",to_user_id.eq." + target + "),and(from_user_id.eq." + target + ",to_user_id.eq." + user.id + ")")
      .eq("status", "pending").limit(1).maybeSingle()
    if (lookupError) throw lookupError
    if (existing) return privateJson({ message: "A chat request is already pending.", request: existing })
    const { data, error } = await admin.from("chat_requests")
      .insert({ from_user_id: user.id, to_user_id: target, status: "pending" }).select().single()
    if (error) throw error
    return privateJson({ success: true, request: data })
  } catch (error) {
    console.error("Chat request failed:", error)
    return privateJson({ error: "Unable to send the request." }, 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in." }, 401)
    const { request_id: id, action } = await req.json()
    if (!id || !["accept", "decline"].includes(action)) return privateJson({ error: "Invalid request action." }, 400)
    const admin = createAdminClient()
    const { data: request, error } = await admin.from("chat_requests").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    if (!request) return privateJson({ error: "Request not found." }, 404)
    if (request.to_user_id !== user.id) return privateJson({ error: "Only the recipient can respond." }, 403)
    if (request.status !== "pending") return privateJson({ error: "This request has already been handled." }, 409)
    let conversationId = null
    if (action === "accept") {
      conversationId = await findDirectConversation(admin, request.from_user_id, user.id)
      if (!conversationId) {
        const { data: conversation, error: createError } = await admin.from("conversations").insert({}).select("id").single()
        if (createError) throw createError
        const { error: participantError } = await admin.from("conversation_participants").insert([
          { conversation_id: conversation.id, user_id: request.from_user_id },
          { conversation_id: conversation.id, user_id: user.id },
        ])
        if (participantError) {
          await admin.from("conversations").delete().eq("id", conversation.id)
          throw participantError
        }
        conversationId = conversation.id
      }
    }
    const status = action === "accept" ? "accepted" : "declined"
    const { error: updateError } = await admin.from("chat_requests").update({ status })
      .eq("id", id).eq("to_user_id", user.id).eq("status", "pending")
    if (updateError) throw updateError
    return privateJson({ success: true, status, conversation_id: conversationId })
  } catch (error) {
    console.error("Chat request response failed:", error)
    return privateJson({ error: "Unable to process this request." }, 500)
  }
}
