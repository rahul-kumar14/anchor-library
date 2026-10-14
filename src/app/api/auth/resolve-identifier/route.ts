import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json()
    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 })
    }

    const trimmed = identifier.trim().toLowerCase()

    // If it's already an email, return directly
    if (trimmed.includes("@")) {
      return NextResponse.json({ email: trimmed })
    }

    const admin = createAdminClient()

    // 1. Check in profiles table by username (case-insensitive)
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, username")
      .ilike("username", trimmed)
      .maybeSingle()

    if (profile?.email) {
      return NextResponse.json({ email: profile.email })
    }

    // 2. If profile exists but email is null, look up user in auth.users by id
    if (profile?.id) {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
      if (authUser?.user?.email) {
        // Also update profiles table so it's cached for future
        await admin.from("profiles").update({ email: authUser.user.email }).eq("id", profile.id)
        return NextResponse.json({ email: authUser.user.email })
      }
    }

    // 3. Fallback: Search auth.users directly by user_metadata->>username
    const { data: { users } } = await admin.auth.admin.listUsers()
    const matchedUser = users.find((u) => {
      const uName = (u.user_metadata?.username || "").toLowerCase()
      return uName === trimmed
    })

    if (matchedUser?.email) {
      // Sync to profile if exists
      await admin.from("profiles").update({ email: matchedUser.email }).eq("id", matchedUser.id)
      return NextResponse.json({ email: matchedUser.email })
    }

    return NextResponse.json({ error: "Username not found. Please check spelling or use your email." }, { status: 404 })
  } catch (err: any) {
    console.error("Resolve identifier error:", err)
    return NextResponse.json({ error: err.message || "Failed to resolve identifier" }, { status: 500 })
  }
}
