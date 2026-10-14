import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ChatClient from "./ChatClient"

export const metadata = { title: "Messages — Anchor Library" }

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <ChatClient initialUser={user} />
}
