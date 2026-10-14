import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import styles from "./page.module.css"

export const metadata = { title: "Profile — Anchor Library" }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={`${styles.title} heading-serif`}>Your Profile</h1>
        <p className={styles.subtitle}>Manage your account details and preferences.</p>

        <div className={`${styles.card} card`}>
          <div className={styles.avatarSection}>
            <div className="avatar-placeholder avatar-xl" style={{ width: 80, height: 80, fontSize: 32 }}>
              {profile?.full_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className={styles.name}>{profile?.full_name || "No name provided"}</h2>
              <p className={styles.username}>@{profile?.username || "user"}</p>
            </div>
          </div>

          <div className={styles.details}>
            <div className={styles.field}>
              <label>Email Address (Private)</label>
              <div className={styles.value}>{user.email}</div>
            </div>
            <div className={styles.field}>
              <label>Account Role</label>
              <div className={styles.value}>{profile?.is_admin ? "🛡️ Administrator" : "👤 Member"}</div>
            </div>
            <div className={styles.field}>
              <label>Joined Date</label>
              <div className={styles.value}>
                {new Date(profile?.created_at || user.created_at).toLocaleDateString("en-IN", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </div>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button className="btn btn-primary" disabled>Edit Profile (Coming Soon)</button>
          </div>
        </div>
      </div>
    </div>
  )
}
