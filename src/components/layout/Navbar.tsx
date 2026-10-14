"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import styles from "./Navbar.module.css"

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener?.subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    const checkBadge = async () => {
      try {
        const res = await fetch(`/api/chat/conversations?user_id=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          const reqCount = (data.incomingRequests || []).length
          let unreadMsg = 0
          for (const conv of (data.conversations || [])) {
            if (conv.last_message && conv.last_message.sender_id !== user.id) {
              unreadMsg += 1
            }
          }
          setUnreadCount(reqCount + unreadMsg)
        }
      } catch {}
    }
    checkBadge()
    const timer = setInterval(checkBadge, 6000)
    return () => clearInterval(timer)
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/library", label: "Library", icon: "📚" },
    { href: "/study-rooms", label: "Study Rooms", icon: "🏛️" },
    { href: "/chat", label: "Messages", icon: "💬" },
  ]

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/")

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>⚓</span>
          <span className={styles.logoText}>Anchor Library</span>
        </Link>

        {/* Desktop Nav */}
        <div className={styles.navLinks}>
          {navLinks.map((link) => {
            const isMessages = link.href === "/chat"
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ""}`}
                style={{ position: "relative" }}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
                {isMessages && unreadCount > 0 && (
                  <span style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    padding: "1px 6px",
                    lineHeight: 1.2,
                    marginLeft: "2px",
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className={styles.navRight}>
          {user ? (
            <div className={styles.avatarWrap}>
              <div
                className="avatar-placeholder"
                style={{ width: 36, height: 36, fontSize: 14, cursor: "pointer" }}
              >
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className={styles.avatarDropdown}>
                <Link href="/profile" className={styles.dropdownItem}>👤 Profile</Link>
                <button onClick={handleSignOut} className={styles.dropdownItem}>🚪 Sign Out</button>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className={`btn btn-ghost btn-sm`}>Login</Link>
              <Link href="/register" className={`btn btn-primary btn-sm`}>Join Free</Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          id="nav-menu-toggle"
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.mobileLink} ${isActive(link.href) ? styles.mobileLinkActive : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.icon} {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/profile" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                <span>👤</span> Profile
              </Link>
              <button className={`${styles.mobileLink} ${styles.mobileSignout}`} onClick={handleSignOut}>
                <span>🚪</span> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Join Free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}