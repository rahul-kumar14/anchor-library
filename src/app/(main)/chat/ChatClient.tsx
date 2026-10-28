"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import styles from "./page.module.css"

interface ChatClientProps {
  initialUser: any
}

export default function ChatClient({ initialUser }: ChatClientProps) {
  const [conversations, setConversations] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const activeConvIdRef = useRef<string | null>(null)
  const [activePartner, setActivePartner] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const msgEndRef = useRef<HTMLDivElement>(null)
  const msgContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Hidden chats persisted in localStorage
  const [hiddenConvIds, setHiddenConvIds] = useState<string[]>([])
  const [showHiddenSection, setShowHiddenSection] = useState(false)
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; convId: string; isHidden: boolean } | null>(null)

  // Load hidden conversations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("anchor_hidden_chats")
      if (saved) {
        setHiddenConvIds(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const toggleHideChat = (convId: string) => {
    setHiddenConvIds((prev) => {
      const exists = prev.includes(convId)
      const next = exists ? prev.filter((id) => id !== convId) : [...prev, convId]
      try {
        localStorage.setItem("anchor_hidden_chats", JSON.stringify(next))
      } catch {}
      return next
    })
    setContextMenu(null)
  }

  // Close context menu on outside click
  useEffect(() => {
    const handleCloseContext = () => setContextMenu(null)
    window.addEventListener("click", handleCloseContext)
    return () => window.removeEventListener("click", handleCloseContext)
  }, [])

  // Instant client-side message cache for 0ms chat switching
  const messagesCacheRef = useRef<Record<string, { messages: any[]; partner?: any }>>({})

  // Keep activeConvIdRef in sync with state
  useEffect(() => {
    activeConvIdRef.current = activeConvId
  }, [activeConvId])

  const fetchConversations = async (isInitial = false) => {
    try {
      const res = await fetch("/api/chat/conversations")
      if (res.ok) {
        const data = await res.json()
        const convList = data.conversations || []
        setConversations(convList)
        setRequests(data.incomingRequests || [])
        
        const requested = new URLSearchParams(window.location.search).get("conversation")
        const selected = requested && convList.find((conversation: any) => conversation.id === requested)
        if (!activeConvIdRef.current && selected) {
          activeConvIdRef.current = selected.id
          setActiveConvId(selected.id)
          setActivePartner(selected.partner)
        } else if (!activeConvIdRef.current && isInitial && convList.length > 0) {
          activeConvIdRef.current = convList[0].id
          setActiveConvId(convList[0].id)
          setActivePartner(convList[0].partner)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Helper to format last active status
  const formatLastActive = (lastActiveDate?: string | null) => {
    if (!lastActiveDate) return "Active recently"
    const diffMs = Date.now() - new Date(lastActiveDate).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 3) return "Online now"
    if (diffMins < 60) return `Active ${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Active ${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return "Active yesterday"
    return `Active ${diffDays}d ago`
  }

  useEffect(() => {
    fetchConversations(true)
    // Sane poll interval (12s) as fallback to realtime
    const timer = setInterval(() => fetchConversations(false), 12000)
    return () => clearInterval(timer)
  }, [])

  const fetchMessages = async (convId: string, silent = false) => {
    try {
      if (!silent) setMsgLoading(true)
      const res = await fetch(`/api/chat/messages?conversation_id=${convId}`)
      if (res.ok) {
        const data = await res.json()
        const fetchedMessages = data.messages || []
        messagesCacheRef.current[convId] = {
          messages: fetchedMessages,
          partner: data.partner || messagesCacheRef.current[convId]?.partner,
        }
        if (activeConvIdRef.current === convId) {
          setMessages(fetchedMessages)
          if (data.partner) setActivePartner(data.partner)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setMsgLoading(false)
    }
  }

  useEffect(() => {
    setSendError("")
    if (activeConvId) {
      // Check cache first for INSTANT 0ms display
      const cached = messagesCacheRef.current[activeConvId]
      if (cached) {
        setMessages(cached.messages)
        if (cached.partner) setActivePartner(cached.partner)
        setMsgLoading(false)
        // Background silent revalidate
        fetchMessages(activeConvId, true)
      } else {
        setMessages([])
        fetchMessages(activeConvId, false)
      }
      
      const channel = supabase
        .channel(`chat_page:${activeConvId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${activeConvId}`,
          },
          (payload) => {
            if (activeConvIdRef.current !== activeConvId) return
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev
              const updated = [...prev, payload.new]
              if (messagesCacheRef.current[activeConvId]) {
                messagesCacheRef.current[activeConvId].messages = updated
              }
              return updated
            })
          }
        )
        .subscribe()

      // Light fallback poll (15s instead of 3s) since Realtime WebSocket is listening
      const timer = setInterval(() => fetchMessages(activeConvId, true), 15000)
      return () => {
        supabase.removeChannel(channel)
        clearInterval(timer)
      }
    }
  }, [activeConvId])

  // Scroll only chat log container without jerking whole window page
  useEffect(() => {
    if (msgContainerRef.current) {
      msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleAcceptRequest = async (requestId: number) => {
    try {
      const res = await fetch("/api/chat/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action: "accept" }),
      })
      const data = await res.json()
      if (res.ok && data.conversation_id) {
        activeConvIdRef.current = data.conversation_id
        setActiveConvId(data.conversation_id)
        await fetchConversations()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeclineRequest = async (requestId: number) => {
    try {
      await fetch("/api/chat/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action: "decline" }),
      })
      await fetchConversations()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !activeConvId || sending) return

    const content = inputText.trim()
    setInputText("")
    setSending(true)
    setSendError("")

    const tempId = `temp_${Date.now()}`
    const optMsg = {
      id: tempId,
      conversation_id: activeConvId,
      sender_id: initialUser?.id,
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optMsg])

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: activeConvId, content }),
      })
      if (res.ok) {
        const data = await res.json()
        if (activeConvIdRef.current === activeConvId) setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)))
      } else {
        if (activeConvIdRef.current === activeConvId) { setMessages(previous => previous.filter(message => message.id !== tempId)); setInputText(previous => previous || content); setSendError("Message could not be sent. Your draft is ready to retry.") }
      }
    } catch {
      if (activeConvIdRef.current === activeConvId) { setMessages(previous => previous.filter(message => message.id !== tempId)); setInputText(previous => previous || content); setSendError("Message could not be sent. Please retry.") }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={`${styles.layout} ${activeConvId ? styles.hasConversation : ""}`}>
          {/* Sidebar */}
          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h1 className={styles.title}>Messages</h1>
              <span className="badge badge-primary">{conversations.length}</span>
            </div>

            {/* Pending Requests */}
            {requests.length > 0 && (
              <div className={styles.requestsSection}>
                <div className={styles.sectionLabel}>🤝 Incoming Chat Requests</div>
                {requests.map((req: any) => (
                  <div key={req.id} className={styles.requestItem}>
                    <div className="avatar-placeholder" style={{ width: 38, height: 38, fontSize: 13, flexShrink: 0 }}>
                      {(req.profiles?.username?.[0] || "U").toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.reqName}>{req.profiles?.full_name || req.profiles?.username}</div>
                      <div className={styles.reqSub}>@{req.profiles?.username} wants to chat</div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleAcceptRequest(req.id)}
                        title="Accept Request"
                      >
                        ✓
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeclineRequest(req.id)}
                        title="Decline"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Conversations */}
            <div className={styles.sectionLabel}>💬 Active Chats</div>
            {conversations.length === 0 ? (
              <div className={styles.emptySidebar}>
                <span>💌</span>
                <p>No active conversations yet.</p>
                <p className={styles.emptyHint}>Click on any active member in Study Rooms to send a chat request!</p>
              </div>
            ) : (
              <div className={styles.convList}>
                {conversations
                  .filter((c: any) => !hiddenConvIds.includes(c.id))
                  .map((c: any) => {
                    const isActive = c.id === activeConvId
                    const partner = c.partner
                    const isOnline = partner?.last_active ? (Date.now() - new Date(partner.last_active).getTime()) < 3 * 60000 : false
                    return (
                      <div
                        key={c.id}
                        className={`${styles.convItem} ${isActive ? styles.convItemActive : ""}`}
                        onClick={() => {
                          activeConvIdRef.current = c.id
                          setActiveConvId(c.id)
                          setActivePartner(partner)
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            convId: c.id,
                            isHidden: false,
                          })
                        }}
                        title="Right-click for options (Hide chat)"
                      >
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 14 }}>
                            {(partner?.username?.[0] || "U").toUpperCase()}
                          </div>
                          <span className={isOnline ? styles.onlineDot : styles.offlineDot} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div className={styles.convName}>{partner?.full_name || partner?.username || "Study Partner"}</div>
                            <span style={{ fontSize: "0.68rem", color: isOnline ? "#22c55e" : "var(--color-text-muted)" }}>
                              {isOnline ? "Online" : formatLastActive(partner?.last_active)}
                            </span>
                          </div>
                          <div className={styles.convPreview}>
                            {c.last_message?.content || "Tap to chat"}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                {/* Hidden Conversations Section */}
                {hiddenConvIds.length > 0 && (
                  <>
                    <div
                      className={styles.hiddenToggleBar}
                      onClick={() => setShowHiddenSection(!showHiddenSection)}
                    >
                      <span>🔒 Hidden Chats <span className={styles.hiddenBadge}>{hiddenConvIds.length}</span></span>
                      <span>{showHiddenSection ? "▲ Hide" : "▼ Show"}</span>
                    </div>

                    {showHiddenSection &&
                      conversations
                        .filter((c: any) => hiddenConvIds.includes(c.id))
                        .map((c: any) => {
                          const isActive = c.id === activeConvId
                          const partner = c.partner
                          const isOnline = partner?.last_active ? (Date.now() - new Date(partner.last_active).getTime()) < 3 * 60000 : false
                          return (
                            <div
                              key={c.id}
                              className={`${styles.convItem} ${isActive ? styles.convItemActive : ""}`}
                              style={{ opacity: 0.78, background: "rgba(0,0,0,0.15)" }}
                              onClick={() => {
                                activeConvIdRef.current = c.id
                                setActiveConvId(c.id)
                                setActivePartner(partner)
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                setContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  convId: c.id,
                                  isHidden: true,
                                })
                              }}
                              title="Right-click to Unhide"
                            >
                              <div style={{ position: "relative", flexShrink: 0 }}>
                                <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 14 }}>
                                  {(partner?.username?.[0] || "U").toUpperCase()}
                                </div>
                                <span className={isOnline ? styles.onlineDot : styles.offlineDot} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                  <div className={styles.convName}>{partner?.full_name || partner?.username || "Study Partner"}</div>
                                  <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                                    (Hidden)
                                  </span>
                                </div>
                                <div className={styles.convPreview}>
                                  {c.last_message?.content || "Tap to chat"}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Context Menu for Right-Click */}
          {contextMenu && (
            <div
              className={styles.contextMenu}
              style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => toggleHideChat(contextMenu.convId)}
              >
                <span>{contextMenu.isHidden ? "👁️ Unhide Chat" : "🙈 Hide Chat"}</span>
              </button>
            </div>
          )}

          {/* Chat Area */}
          <div className={styles.chatArea}>
            {!activeConvId ? (
              <div className={styles.chatEmpty}>
                <div className={styles.chatEmptyIcon}>💬</div>
                <h3>Select a conversation</h3>
                <p>Start a direct study conversation with your peer.</p>
                <span className="badge badge-secondary">🔒 Chat starts after an accepted request</span>
              </div>
            ) : (
              <>
                {/* Active Header */}
                <div className={styles.activeChatHeader}>
                  <button className={styles.mobileBack} onClick={() => { activeConvIdRef.current = null; setActiveConvId(null); setActivePartner(null) }}>← Inbox</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ position: "relative" }}>
                      <div className="avatar-placeholder" style={{ width: 38, height: 38, fontSize: 13 }}>
                        {(activePartner?.username?.[0] || "U").toUpperCase()}
                      </div>
                      <span
                        className={
                          activePartner?.last_active && (Date.now() - new Date(activePartner.last_active).getTime()) < 3 * 60000
                            ? styles.onlineDot
                            : styles.offlineDot
                        }
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {activePartner?.full_name || activePartner?.username}
                      </div>
                      <div className={styles.activeStatusText}>
                        <span>@{activePartner?.username}</span>
                        <span>•</span>
                        {activePartner?.last_active && (Date.now() - new Date(activePartner.last_active).getTime()) < 3 * 60000 ? (
                          <span className={styles.statusGreen}>● Online</span>
                        ) : (
                          <span>Last active: {formatLastActive(activePartner?.last_active)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Right Header Action: Quick Hide/Unhide */}
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => toggleHideChat(activeConvId)}
                    title={hiddenConvIds.includes(activeConvId) ? "Unhide this chat" : "Hide this chat"}
                    style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
                  >
                    {hiddenConvIds.includes(activeConvId) ? "👁️ Unhide" : "🙈 Hide"}
                  </button>
                </div>

                {/* 7-Day Auto Delete Notice Banner */}
                <div className={styles.noticeBanner}>
                  <span style={{ fontSize: "1.1rem" }}>⏱️</span>
                  <div>
                    <strong>Private conversation:</strong> Only participants can access this chat. The app shows the last 7 days of messages.
                    <div style={{ fontSize: "0.72rem", opacity: 0.85, marginTop: "2px" }}>
                      आपकी बातचीत केवल इस चैट के सदस्यों को दिखाई देती है।
                    </div>
                  </div>
                </div>

                {/* Message Log */}
                <div ref={msgContainerRef} className={styles.msgArea}>
                  {msgLoading ? (
                    <div style={{ textAlign: "center", color: "var(--color-text-muted)", margin: "auto" }}>
                      Loading chat messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--color-text-muted)", margin: "auto" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👋</div>
                      <div>Say hello and start studying together!</div>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === initialUser?.id
                      const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      return (
                        <div
                          key={m.id}
                          className={`${styles.bubble} ${isMe ? styles.bubbleSent : styles.bubbleRecv}`}
                        >
                          <div>{m.content}</div>
                          <span className={styles.time}>{timeStr}</span>
                        </div>
                      )
                    })
                  )}
                  <div ref={msgEndRef} />
                </div>

                {sendError && <p role="alert" style={{ padding: "0 1rem", color: "#b45309", fontSize: "0.8rem" }}>{sendError}</p>}
                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className={styles.inputBar}>
                  <input
                    type="text"
                    maxLength={4000}
                    className="input"
                    placeholder={`Write a message to @${activePartner?.username || "partner"}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!inputText.trim() || sending}>
                    {sending ? "..." : "Send →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
