import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export const ROOM_CONVERSATIONS: Record<string, string> = {
  silent: "00000000-0000-0000-0000-000000000001",
  pomodoro: "00000000-0000-0000-0000-000000000002",
  "night-owl": "00000000-0000-0000-0000-000000000003",
  upsc: "00000000-0000-0000-0000-000000000004",
  gate: "00000000-0000-0000-0000-000000000005",
  coding: "00000000-0000-0000-0000-000000000006",
  reading: "00000000-0000-0000-0000-000000000007",
  language: "00000000-0000-0000-0000-000000000008",
  "english-lit": "00000000-0000-0000-0000-000000000009",
}

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const isRoomConversation = (id: string) => Object.values(ROOM_CONVERSATIONS).includes(id)
export const privateJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } })

export async function verifiedUser() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  return error ? null : user
}

export async function canAccessConversation(admin: SupabaseClient, id: string, userId: string) {
  if (isRoomConversation(id)) return true // Public room chat is for signed-in members.
  const { data, error } = await admin.from("conversation_participants").select("user_id")
    .eq("conversation_id", id).eq("user_id", userId).maybeSingle()
  return !error && !!data
}

export async function findDirectConversation(admin: SupabaseClient, userA: string, userB: string) {
  const { data: mine, error } = await admin.from("conversation_participants").select("conversation_id").eq("user_id", userA)
  if (error) throw error
  const ids = (mine || []).map(p => p.conversation_id).filter(id => !isRoomConversation(id))
  if (!ids.length) return null
  const { data, error: partnerError } = await admin.from("conversation_participants").select("conversation_id")
    .eq("user_id", userB).in("conversation_id", ids).limit(1).maybeSingle()
  if (partnerError) throw partnerError
  return data?.conversation_id || null
}
