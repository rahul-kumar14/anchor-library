"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import styles from "./Navbar.module.css"
import NotificationCenter, { InboxNotice } from "./NotificationCenter"
import { useStudyRoomSession } from "@/context/StudyRoomContext"

export default function Navbar() {
  const pathname = usePathname()
  const { activeSession, leaveSession } = useStudyRoomSession()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  const [unreadCount, setUnreadCount] = useState(0)
  const [notices, setNotices] = useState<InboxNotice[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener?.subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setNotices([]); setUnreadCount(0); return }
    let cancelled = false
    const checkBadge = async () => {
      try {
        const res = await fetch("/api/chat/conversations")
        if (res.ok) {
          const data = await res.json()
          if (cancelled) return
          const reqCount = (data.incomingRequests || []).length
          let unreadMsg = 0
          for (const conv of (data.conversations || [])) {
            if (conv.has_unread) {
              unreadMsg += 1
            }
          }
          setUnreadCount(reqCount + unreadMsg)
          setNotices([
            ...(data.incomingRequests || []).map((request: any) => ({ id: "request-" + request.id, title: "New study partner request", description: "@" + (request.profiles?.username || "member") + " wants to connect. You choose whether to accept.", href: "/chat" })),
            ...(data.conversations || []).filter((conversation: any) => conversation.has_unread).map((conversation: any) => ({ id: "chat-" + conversation.id, title: "Unread conversation", description: "A new message from @" + (conversation.partner?.username || "your study partner"), href: "/chat?conversation=" + conversation.id })),
            ...(data.notifications || []).map((notice: any) => ({ id: "notice-" + notice.id, storedId: notice.id, title: typeof notice.payload?.title === "string" ? notice.payload.title : "Account update", description: "Open your dashboard for details.", href: "/dashboard" })),
          ])
        }
      } catch {}
    }
    checkBadge()
    const timer = setInterval(checkBadge, 6000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [user])

  const handleSignOut = async () => {
    leaveSession()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/library", label: "Library", icon: "📚" },
    { href: "/favorites", label: "Saved", icon: "♡" },
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
        <div className={styles.navRight} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Active Study Session Indicator */}
          {activeSession && (
            <div className={styles.activeSession} style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "0.75rem",
            }}>
              <span className="online-dot" style={{ position: "static", display: "inline-block", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <Link href={`/study-rooms/${activeSession.roomId}`} style={{ fontWeight: 600, color: "#10b981", textDecoration: "none" }}>
                {activeSession.roomIcon} {activeSession.roomName}
              </Link>
              <button
                type="button"
                onClick={leaveSession}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "0 2px",
                  marginLeft: "4px",
                }}
                title="Leave Study Room"
              >
                ✕ Leave
              </button>
            </div>
          )}

          {user && <NotificationCenter items={notices} onRead={async id => {
            const result = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
            if (result.ok) setNotices(previous => previous.filter(item => item.storedId !== id))
          }} />}
          {user ? (
            <div className={styles.avatarWrap}>
              <button type="button" aria-label="Account menu"
                className="avatar-placeholder"
                style={{ width: 36, height: 36, fontSize: 14, cursor: "pointer" }}
              >
                {user.email?.[0]?.toUpperCase() || "U"}
              </button>
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
          aria-expanded={menuOpen}
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
