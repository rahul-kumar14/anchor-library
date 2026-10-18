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

  // Keep activeConvIdRef in sync with state
  useEffect(() => {
    activeConvIdRef.current = activeConvId
  }, [activeConvId])

  const fetchConversations = async () => {
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
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
    const timer = setInterval(fetchConversations, 5000)
    return () => clearInterval(timer)
  }, [])

  const fetchMessages = async (convId: string, silent = false) => {
    try {
      if (!silent) setMsgLoading(true)
      const res = await fetch(`/api/chat/messages?conversation_id=${convId}`)
      if (res.ok) {
        const data = await res.json()
        if (activeConvIdRef.current === convId) {
          setMessages(data.messages || [])
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
    setMessages([])
    setSendError("")
    if (activeConvId) {
      fetchMessages(activeConvId)
      
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
              return [...prev, payload.new]
            })
          }
        )
        .subscribe()

      const timer = setInterval(() => fetchMessages(activeConvId, true), 3000)
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
                {conversations.map((c: any) => {
                  const isActive = c.id === activeConvId
                  const partner = c.partner
                  return (
                    <div
                      key={c.id}
                      className={`${styles.convItem} ${isActive ? styles.convItemActive : ""}`}
                      onClick={() => {
                        activeConvIdRef.current = c.id
                        setActiveConvId(c.id)
                        setActivePartner(partner)
                      }}
                    >
                      <div className="relative">
                        <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 14 }}>
                          {(partner?.username?.[0] || "U").toUpperCase()}
                        </div>

                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.convName}>{partner?.full_name || partner?.username || "Study Partner"}</div>
                        <div className={styles.convPreview}>
                          {c.last_message?.content || "Tap to chat"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

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
                    <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: 13 }}>
                      {(activePartner?.username?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {activePartner?.full_name || activePartner?.username}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        @{activePartner?.username} • Active Study Partner
                      </div>
                    </div>
                  </div>
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
