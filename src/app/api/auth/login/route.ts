import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { privateJson } from "@/lib/server/access"

export async function POST(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return privateJson({ error: "Cross-site sign-in is not allowed." }, 403)
  try {
    const { identifier, password } = await req.json()
    if (typeof identifier !== "string" || typeof password !== "string" || !identifier.trim() || identifier.length > 254 || !password || password.length > 256) {
      return privateJson({ error: "Enter your username/email and password." }, 400)
    }
    const normalized = identifier.trim().toLowerCase()
    let email = normalized
    if (!normalized.includes("@")) {
      const admin = createAdminClient()
      const { data: profile } = await admin.from("profiles").select("id,email").eq("username", normalized).maybeSingle()
      email = profile?.email || ""
      if (!email && profile?.id) {
        const { data } = await admin.auth.admin.getUserById(profile.id)
        email = data.user?.email || ""
      }
      if (!email) return privateJson({ error: "Invalid username or password." }, 401)
    }
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return privateJson({ error: "Invalid username or password." }, 401)
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle()
    return privateJson({ success: true, isAdmin: profile?.is_admin === true })
  } catch {
    return privateJson({ error: "Sign-in is temporarily unavailable. Please retry." }, 500)
  }
}
