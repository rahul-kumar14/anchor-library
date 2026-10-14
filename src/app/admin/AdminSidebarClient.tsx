"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import styles from "./layout.module.css"

const navItems = [
  { href: "/admin/books", icon: "📚", label: "Books Management" },
  { href: "/admin/users", icon: "👥", label: "Users Management" },
  { href: "/admin/activity", icon: "📊", label: "Activity Feed" },
]

export default function AdminSidebarClient({ signOutOnly }: { signOutOnly?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  if (signOutOnly) {
    return (
      <button onClick={handleSignOut} className={styles.navItem} id="admin-signout">
        <span className={styles.navIcon}>🚪</span>
        Sign Out
      </button>
    )
  }

  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.navItem} ${
            pathname === item.href || pathname?.startsWith(item.href + "/")
              ? styles.navItemActive
              : ""
          }`}
        >
          <span className={styles.navIcon}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </>
  )
}
