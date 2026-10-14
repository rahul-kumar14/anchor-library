"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import styles from "./page.module.css"

export default function AdminUsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const supabase = createClient()

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.username?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q)
    )
  })

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return
    const { error } = await supabase.from("profiles").delete().eq("id", userId)
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      setStatusMsg({ type: "success", text: "User deleted successfully." })
    } else {
      setStatusMsg({ type: "error", text: "Could not delete user: " + error.message })
    }
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (!confirm(`${currentIsAdmin ? "Remove" : "Grant"} admin access for this user?`)) return
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: !currentIsAdmin })
      .eq("id", userId)
    if (!error) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u))
      setStatusMsg({ type: "success", text: `Admin access ${!currentIsAdmin ? "granted" : "revoked"}.` })
    } else {
      setStatusMsg({ type: "error", text: "Failed to update admin status." })
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <>
      {statusMsg && (
        <div className={`${styles.alert} ${statusMsg.type === "success" ? styles.alertSuccess : styles.alertError}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Search */}
      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          id="user-search"
          type="text"
          className={styles.searchInput}
          placeholder="Search by name, username, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearSearch} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* Users Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.colUser}>User</div>
          <div className={styles.colJoined}>Joined</div>
          <div className={styles.colRole}>Role</div>
          <div className={styles.colActions}>Actions</div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className={styles.empty}>No users found.</div>
        ) : (
          <div className={styles.tableBody}>
            {filteredUsers.map((u) => {
              const displayName = u.full_name || u.username || "—"
              const initials = displayName?.[0]?.toUpperCase() || "?"
              return (
                <div key={u.id} className={styles.tableRow}>
                  <div className={styles.colUser}>
                    <div className={styles.avatar}>{initials}</div>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>{displayName}</div>
                      <div className={styles.userEmail}>{u.username || u.id.slice(0, 10)}</div>
                    </div>
                  </div>
                  <div className={styles.colJoined}>
                    <span className={styles.dateText}>{formatDate(u.created_at)}</span>
                  </div>
                  <div className={styles.colRole}>
                    {u.is_admin ? (
                      <span className={styles.badgeAdmin}>🛡️ Admin</span>
                    ) : (
                      <span className={styles.badgeUser}>👤 Member</span>
                    )}
                  </div>
                  <div className={styles.colActions}>
                    <button
                      className={`${styles.actionBtn} ${u.is_admin ? styles.revokeBtn : styles.grantBtn}`}
                      onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                      title={u.is_admin ? "Revoke Admin" : "Grant Admin"}
                    >
                      {u.is_admin ? "Revoke Admin" : "Make Admin"}
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDelete(u.id)}
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
