import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import styles from "./layout.module.css"
import AdminSidebarClient from "./AdminSidebarClient"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in at all
  if (!user) {
    return (
      <div className={styles.denied}>
        <div className={styles.deniedCard}>
          <div className={styles.deniedIcon}>🔐</div>
          <h1 className={styles.deniedTitle}>Admin Access Required</h1>
          <p className={styles.deniedDesc}>
            Sign in with your admin account to access the admin panel.
          </p>
          <Link href="/login" className={styles.deniedBtn}>
            🛡️ Sign In
          </Link>
        </div>
      </div>
    )
  }

  // Check is_admin flag in profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, username, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return (
      <div className={styles.denied}>
        <div className={styles.deniedCard}>
          <div className={styles.deniedIcon}>⛔</div>
          <h1 className={styles.deniedTitle}>Access Denied</h1>
          <p className={styles.deniedDesc}>
            Your account does not have admin privileges. Contact the site owner to get access.
          </p>
          <Link href="/" className={styles.deniedBtn}>
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // displayName: prefer full_name > username > email prefix (email comes from auth, not profiles)
  const displayName = profile.full_name || profile.username || user.email?.split("@")[0] || "Admin"

  return (
    <div className={styles.adminShell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandBadge}>🛡️ Admin Portal</div>
          <div className={styles.brandName}>⚓ Anchor Library</div>
          <div className={styles.brandSub}>Management Dashboard</div>
        </div>

        <nav className={styles.sidebarNav}>
          <AdminSidebarClient />
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminEmail}>{profile.username || user.email || "Admin"}</div>
          <AdminSidebarClient signOutOnly />
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.topBar}>
          <span className={styles.topBarTitle}>Welcome back, {displayName} 👋</span>
          <div className={styles.topBarRight}>
            <Link href="/library" className={styles.viewPublicBtn} target="_blank">
              👁️ View Public Site
            </Link>
          </div>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}