import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { privateJson } from "@/lib/server/access"

const ADMIN_TARGET_EMAIL = "hpark4868@gmail.com"

export async function POST(req: NextRequest) {
  try {
    const { name, email, type, rating, message } = await req.json()

    if (!name || !email || !message) {
      return privateJson({ error: "Name, email, and message are required." }, 400)
    }

    const admin = createAdminClient()

    // Find admin user(s) to notify
    const { data: adminProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("is_admin", true)

    const payload = {
      title: `New ${type === "review" ? "Community Review" : type === "contact" ? "Contact Message" : "Feedback"} from ${name}`,
      message: message,
      sender_name: name,
      sender_email: email,
      rating: rating || 5,
      type: type || "feedback",
      target_email: ADMIN_TARGET_EMAIL,
      submitted_at: new Date().toISOString(),
    }

    if (adminProfiles && adminProfiles.length > 0) {
      const notificationsToInsert = adminProfiles.map((ap) => ({
        user_id: ap.id,
        type: "feedback_received",
        payload: payload,
        is_read: false,
      }))

      await admin.from("notifications").insert(notificationsToInsert)
    }

    return privateJson({
      success: true,
      forwardedTo: ADMIN_TARGET_EMAIL,
      message: "Feedback submitted successfully.",
    })
  } catch (error: any) {
    console.error("Feedback error:", error)
    return privateJson({ error: "Failed to submit feedback." }, 500)
  }
}
