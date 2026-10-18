import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifiedUser, privateJson } from "@/lib/server/access"

export async function GET() {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in to view saved books." }, 401)
    const { data, error } = await createAdminClient().from("favorites").select("book_id").eq("user_id", user.id)
    if (error) throw error
    return privateJson({ bookIds: (data || []).map(item => item.book_id) })
  } catch (error) {
    console.error("Favorite list failed:", error)
    return privateJson({ error: "Unable to load saved books." }, 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifiedUser()
    if (!user) return privateJson({ error: "Please sign in to save a book." }, 401)
    const { bookId, favorite } = await req.json()
    if (!/^[1-9]\d{0,15}$/.test(String(bookId)) || typeof favorite !== "boolean") return privateJson({ error: "Invalid book selection." }, 400)
    const admin = createAdminClient()
    if (favorite) {
      const { data: book, error: bookError } = await admin.from("books").select("id").eq("id", bookId).maybeSingle()
      if (bookError) throw bookError
      if (!book) return privateJson({ error: "Book not found." }, 404)
      const { data: existing, error: lookupError } = await admin.from("favorites").select("id").eq("user_id", user.id).eq("book_id", bookId).maybeSingle()
      if (lookupError) throw lookupError
      if (!existing) {
        const { error } = await admin.from("favorites").insert({ user_id: user.id, book_id: bookId })
        if (error && error.code !== "23505") throw error
      }
    } else {
      const { error } = await admin.from("favorites").delete().eq("user_id", user.id).eq("book_id", bookId)
      if (error) throw error
    }
    return privateJson({ favorite })
  } catch (error) {
    console.error("Favorite update failed:", error)
    return privateJson({ error: "Unable to update saved books. Please retry." }, 500)
  }
}
