import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifiedUser, privateJson, isUuid } from "@/lib/server/access"

async function changeUser(req: NextRequest, remove: boolean) {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in." }, 401)
    const admin = createAdminClient()
    const { data: actor, error } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
    if (error || !actor?.is_admin) return privateJson({ error: "Admin access required." }, 403)
    const { userId, isAdmin } = await req.json()
    if (!isUuid(userId) || (!remove && typeof isAdmin !== "boolean")) return privateJson({ error: "Invalid account update." }, 400)
    if (userId === user.id) return privateJson({ error: "Use another administrator to change or remove your own account." }, 409)
    if (remove) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError
    } else {
      const { error: updateError } = await admin.from("profiles").update({ is_admin: isAdmin }).eq("id", userId)
      if (updateError) throw updateError
    }
    return privateJson({ success: true })
  } catch (error) {
    console.error("Admin account update failed:", error)
    return privateJson({ error: "Unable to update this account." }, 500)
  }
}
export const PATCH = (req: NextRequest) => changeUser(req, false)
export const DELETE = (req: NextRequest) => changeUser(req, true)
