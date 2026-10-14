"use client"
import { useState, useEffect } from "react"
import styles from "./UserProfileModal.module.css"

interface UserProfileModalProps {
  targetUserId: string
  currentUser: any
  onClose: () => void
  onOpenChat: (conversationId: string, partner: any) => void
}

export default function UserProfileModal({
  targetUserId,
  currentUser,
  onClose,
  onOpenChat,
}: UserProfileModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const currentId = currentUser?.id || ""
      const res = await fetch(`/api/user/profile/${targetUserId}?current_user_id=${currentId}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        setError(json.error || "Failed to load user profile")
      }
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [targetUserId, currentUser?.id])

  const handleSendRequest = async () => {
    try {
      setActionLoading(true)
      const res = await fetch("/api/chat/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_user_id: currentUser?.id,
          to_user_id: targetUserId,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          chatStatus: {
            ...prev.chatStatus,
            request_status: "pending",
            request_direction: "sent",
            request_id: json.request?.id,
          },
        }))
      } else {
        alert(json.error || "Failed to send request")
      }
    } catch (err: any) {
      alert(err.message || "Request failed")
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!data?.chatStatus?.request_id) return
    try {
      setActionLoading(true)
      const res = await fetch("/api/chat/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: data.chatStatus.request_id,
          action: "accept",
          user_id: currentUser?.id,
        }),
      })
      const json = await res.json()
      if (res.ok && json.conversation_id) {
        onClose()
        onOpenChat(json.conversation_id, data.profile)
      } else {
        alert(json.error || "Failed to accept request")
      }
    } catch (err: any) {
      alert(err.message || "Failed to accept")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineRequest = async () => {
    if (!data?.chatStatus?.request_id) return
    try {
      setActionLoading(true)
      const res = await fetch("/api/chat/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: data.chatStatus.request_id,
          action: "decline",
          user_id: currentUser?.id,
        }),
      })
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          chatStatus: {
            ...prev.chatStatus,
            request_status: "declined",
          },
        }))
      }
    } catch (err: any) {
      alert(err.message || "Failed to decline")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartExistingChat = () => {
    if (data?.chatStatus?.conversation_id) {
      onClose()
      onOpenChat(data.chatStatus.conversation_id, data.profile)
    }
  }

  const formatJoinedDate = (iso?: string) => {
    if (!iso) return ""
    try {
      const d = new Date(iso)
      return `Member since ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
    } catch {
      return ""
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className={styles.loadingBox}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
            Loading profile &amp; reading data...
          </div>
        ) : error ? (
          <div className={styles.loadingBox} style={{ color: "#dc2626" }}>
            {error}
          </div>
        ) : (
          <>
            {/* Top Header & Avatar (Completely unclipped) */}
            <div className={styles.profileHeader}>
              <div className={styles.headerBanner}>
                <button className={styles.closeBtn} onClick={onClose} title="Close">
                  ✕
                </button>
              </div>

              <div className={styles.avatarRow}>
                <div className={styles.avatarWrapper}>
                  <div
                    className={styles.avatar}
                    style={{
                      background: data.profile.avatar_url
                        ? "transparent"
                        : `hsl(${((data.profile.username?.charCodeAt(0) || 65) * 45) % 360}, 65%, 45%)`,
                    }}
                  >
                    {data.profile.avatar_url ? (
                      <img
                        src={data.profile.avatar_url}
                        alt=""
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      (data.profile.username?.[0] || "U").toUpperCase()
                    )}
                  </div>
                  <span className={styles.onlineBadge} title="Active in study room" />
                </div>
              </div>
            </div>

            {/* Scrollable Middle Content */}
            <div className={styles.bodyContent}>
              <div className={styles.nameRow}>
                <h2 className={styles.fullName}>{data.profile.full_name || data.profile.username}</h2>
                <div className={styles.username}>@{data.profile.username}</div>
                <div className={styles.metaRow}>{formatJoinedDate(data.profile.created_at)}</div>
              </div>

              {data.profile.bio ? (
                <div className={styles.bio}>&ldquo;{data.profile.bio}&rdquo;</div>
              ) : (
                <div className={styles.bio} style={{ color: "var(--color-text-secondary)" }}>
                  Active member studying in Anchor Library rooms.
                </div>
              )}

              {/* Real Reading Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statVal}>🔥 {data.stats?.reading_streak ?? 0}d</div>
                  <div className={styles.statLabel}>Streak</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statVal}>✅ {data.stats?.total_completed ?? 0}</div>
                  <div className={styles.statLabel}>Books Read</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statVal}>📖 {data.stats?.total_reading ?? 0}</div>
                  <div className={styles.statLabel}>In Progress</div>
                </div>
              </div>

              {/* Reading Shelf from Real Database */}
              <div className={styles.sectionHeading}>
                <span>📚</span> Reading History ({data.books?.length ?? 0})
              </div>

              {(!data.books || data.books.length === 0) ? (
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", padding: "0.75rem 0", textAlign: "center" }}>
                  No active books in library shelf yet.
                </div>
              ) : (
                <div className={styles.bookList}>
                  {data.books.map((b: any) => (
                    <div key={b.id} className={styles.bookCard}>
                      <div className={styles.bookCover}>
                        {b.cover_url ? (
                          <img src={b.cover_url} alt="" />
                        ) : (
                          <span>📘</span>
                        )}
                      </div>
                      <div className={styles.bookInfo}>
                        <div className={styles.bookTitle} title={b.title}>
                          {b.title}
                        </div>
                        <div className={styles.progressBarWrapper}>
                          <div className={styles.progressBarBg}>
                            <div
                              className={styles.progressBarFill}
                              style={{
                                width: `${Math.min(100, Math.max(0, b.progress_percent || (b.is_completed ? 100 : 0)))}%`,
                                background: b.is_completed ? "#059669" : "#d97706",
                              }}
                            />
                          </div>
                          <span className={styles.progressText}>
                            {b.is_completed
                              ? "Completed"
                              : `${b.progress_percent || 0}% (p. ${b.current_page}/${b.total_pages || "?"})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pinned Bottom Footer Action (Never clipped or pushed off screen) */}
            <div className={styles.footerAction}>
              {data.chatStatus?.is_self ? (
                <div className={styles.selfBadge}>👤 This is your profile (You are viewing yourself)</div>
              ) : data.chatStatus?.request_status === "accepted" ? (
                <button
                  className={`${styles.actionBtn} ${styles.primaryBtn}`}
                  onClick={handleStartExistingChat}
                  disabled={actionLoading}
                >
                  💬 Open Chat in Sidebar
                </button>
              ) : data.chatStatus?.request_status === "pending" && data.chatStatus?.request_direction === "sent" ? (
                <div className={styles.pendingBadge}>
                  ⏳ Chat Request Sent (Waiting for @{data.profile.username} to accept)
                </div>
              ) : data.chatStatus?.request_status === "pending" && data.chatStatus?.request_direction === "received" ? (
                <div>
                  <div style={{ fontSize: "0.85rem", color: "#b45309", marginBottom: "0.5rem", textAlign: "center", fontWeight: 600 }}>
                    📩 @{data.profile.username} has sent you a chat request!
                  </div>
                  <button
                    className={`${styles.actionBtn} ${styles.acceptBtn}`}
                    onClick={handleAcceptRequest}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Accepting..." : "✅ Accept Request & Start Chat"}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.declineBtn}`}
                    onClick={handleDeclineRequest}
                    disabled={actionLoading}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <button
                  className={`${styles.actionBtn} ${styles.primaryBtn}`}
                  onClick={handleSendRequest}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Sending..." : "👋 Send Chat Request"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
