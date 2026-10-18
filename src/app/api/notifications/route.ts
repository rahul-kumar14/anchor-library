import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { privateJson, verifiedUser } from "@/lib/server/access"

export async function PATCH(req: NextRequest) {
  const user = await verifiedUser()
  if (!user) return privateJson({ error: "Please sign in." }, 401)
  try {
    const { id } = await req.json()
    if (typeof id !== "string" && typeof id !== "number") return privateJson({ error: "Invalid update." }, 400)
    const { error } = await createAdminClient().from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id)
    if (error) throw error
    return privateJson({ success: true })
  } catch { return privateJson({ error: "Unable to mark this update as read." }, 500) }
}
