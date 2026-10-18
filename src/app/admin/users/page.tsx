import { createClient } from "@/lib/supabase/server"
import styles from "./page.module.css"
import AdminUsersClient from "./AdminUsersClient"

export const metadata = { title: "Users — Admin" }

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, created_at, is_admin, avatar_url")
    .order("created_at", { ascending: false })

  const { count: totalCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })

  const { count: adminCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true)

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Users Management</h1>
          <p className={styles.pageSubtitle}>View, manage and moderate registered members</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{totalCount ?? 0}</span>
            <span className={styles.statLbl}>Total Users</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{adminCount ?? 0}</span>
            <span className={styles.statLbl}>Admins</span>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          Could not fetch users. Make sure the profiles table has the correct columns.
        </div>
      )}

      <AdminUsersClient initialUsers={users ?? []} />
    </div>
  )
}
