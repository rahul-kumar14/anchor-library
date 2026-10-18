import { NextResponse } from "next/server"

// Username lookup belongs inside the sign-in endpoint. Never publish account
// email addresses or enumerate auth users in an unauthenticated lookup API.
export async function POST() {
  return NextResponse.json({ error: "Use the sign-in form." }, { status: 410, headers: { "Cache-Control": "no-store" } })
}
