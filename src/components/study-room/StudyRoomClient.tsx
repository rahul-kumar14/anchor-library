"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import styles from "@/app/(main)/study-rooms/[id]/page.module.css"
import dynamic from "next/dynamic"
import { useReadingProgress } from "@/components/pdf/useReadingProgress"
import { useBookAnnotations } from "@/components/pdf/useBookAnnotations"
import PageJump from "@/components/pdf/PageJump"
import { advanceFocusTimer } from "@/lib/focus-timer"
import UserProfileModal from "./UserProfileModal"
import { useStudyRoomSession } from "@/context/StudyRoomContext"
import { useRouter } from "next/navigation"

const PdfCanvas = dynamic(() => import("@/components/pdf/PdfCanvas"), { ssr: false })

const AMBIENT_SOUNDS = [
  { id: "none", name: "Mute", icon: "🔇" },
  { id: "rain", name: "Rain", icon: "🌧️", url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg" },
  { id: "library", name: "Library", icon: "🏛️", url: "https://actions.google.com/sounds/v1/ambiences/office_murmur.ogg" },
  { id: "whitenoise", name: "Noise", icon: "📻", url: "https://actions.google.com/sounds/v1/ambiences/white_noise.ogg" },
]

export default function StudyRoomClient({ room, roomId }: { room: any; roomId: string }) {
  const router = useRouter()
  const { activeSession, members: activeUsers, joinSession, leaveSession, updateSessionStatus } = useStudyRoomSession()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [zenMode, setZenMode] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "library">("library") 
  const [realBooks, setRealBooks] = useState<any[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [generalBookSuggestions, setGeneralBookSuggestions] = useState(false)
  const [bookProgress, setBookProgress] = useState<Record<string, { percent: number; lastRead: string }>>({})
  const [activeBook, setActiveBook] = useState<any | null>(null)
  // Room Conversation ID mapping
  const ROOM_CONV_IDS: Record<string, string> = {
    silent: "00000000-0000-0000-0000-000000000001",
    pomodoro: "00000000-0000-0000-0000-000000000002",
    "night-owl": "00000000-0000-0000-0000-000000000003",
    upsc: "00000000-0000-0000-0000-000000000004",
    gate: "00000000-0000-0000-0000-000000000005",
    coding: "00000000-0000-0000-0000-000000000006",
    reading: "00000000-0000-0000-0000-000000000007",
    "english-lit": "00000000-0000-0000-0000-000000000009",
    language: "00000000-0000-0000-0000-000000000008",
  }

  const roomConvId = ROOM_CONV_IDS[roomId] || "00000000-0000-0000-0000-000000000001"

  // User Profile & 1-on-1 Direct Chat States
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null)
  const [activeDirectChat, setActiveDirectChat] = useState<{ conversationId: string; partner: any } | null>(null)
  const [chatMode, setChatMode] = useState<"room" | "direct">("room")
  const currentConvId = chatMode === "direct" && activeDirectChat ? activeDirectChat.conversationId : roomConvId
  const currentConvIdRef = useRef(currentConvId)
  currentConvIdRef.current = currentConvId

  // DB-backed chat messages state
  const [dbMessages, setDbMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  const [incomingChatRequests, setIncomingChatRequests] = useState<any[]>([])
  const [userConversations, setUserConversations] = useState<any[]>([])
  const [unreadMsgBanner, setUnreadMsgBanner] = useState<{ senderName: string; text: string; conversationId: string; partner: any } | null>(null)
  const lastKnownMsgIdsRef = useRef<Record<string, string>>({})

  // Periodically check for incoming chat requests and new private messages
  useEffect(() => {
    if (!user) return
    const checkActivity = async () => {
      try {
        const res = await fetch("/api/chat/conversations")
        if (res.ok) {
          const data = await res.json()
          setIncomingChatRequests(data.incomingRequests || [])
          
          const convs = data.conversations || []
          setUserConversations(convs)

          // Check if there is a new message from a partner that user isn't currently viewing
          for (const conv of convs) {
            const lastMsg = conv.last_message
            if (lastMsg && lastMsg.sender_id !== user.id) {
              const previousLastId = lastKnownMsgIdsRef.current[conv.id]
              // If we already had a record and now there's a newer message or different content/timestamp
              if (previousLastId && previousLastId !== lastMsg.created_at) {
                // Only alert if user is NOT currently inside this direct chat
                if (chatMode !== "direct" || activeDirectChat?.conversationId !== conv.id) {
                  setUnreadMsgBanner({
                    senderName: conv.partner?.full_name || conv.partner?.username || "Study Partner",
                    text: lastMsg.content,
                    conversationId: conv.id,
                    partner: conv.partner,
                  })
                }
              }
              lastKnownMsgIdsRef.current[conv.id] = lastMsg.created_at
            }
          }
        }
      } catch {}
    }
    checkActivity()
    const timer = setInterval(checkActivity, 3500)
    return () => clearInterval(timer)
  }, [user, chatMode, activeDirectChat?.conversationId])

  // Fetch messages from DB for current conversation
  const loadMessages = async (convId: string, silent = false) => {
    if (!convId) return
    try {
      if (!silent) setLoadingMessages(true)
      const res = await fetch(`/api/chat/messages?conversation_id=${convId}`)
      if (res.ok) {
        const data = await res.json()
        if (convId === currentConvIdRef.current) setDbMessages(data.messages || [])
      }
    } catch (err) {
      console.error("Error loading chat messages:", err)
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }

  useEffect(() => {
    setDbMessages([])
    setNewMessage("")
    loadMessages(currentConvId)
    // 3s interval poll fallback so messages never disappear and stay updated
    const timer = setInterval(() => loadMessages(currentConvId, true), 3000)
    return () => clearInterval(timer)
  }, [currentConvId, user?.id])



  // Scroll chat container to bottom when messages update (without stealing window page scroll)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [dbMessages])
  
  // PDF Reader States
  const { pageNumber, setPageNumber, numPages, setNumPages, progressStatus } = useReadingProgress(activeBook?.id ?? null, user?.id ?? null)
  const [scale, setScale] = useState(1.0)
  const [pdfBoxWidth, setPdfBoxWidth] = useState<number | null>(null)
  const [rightPanelsWidth, setRightPanelsWidth] = useState(560) // 280px + 280px default
  const isDraggingSplitterRef = useRef(false)
  
  // Annotations
  const { annotations, saveAnnotation, removeAnnotation, saving, noteStatus } = useBookAnnotations(activeBook?.id ?? null, user?.id ?? null)
  const [selectedText, setSelectedText] = useState("")
  const [noteInput, setNoteInput] = useState("")
  const [selectionMenu, setSelectionMenu] = useState<{ top: number; left: number } | null>(null)
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [bookReadingSeconds, setBookReadingSeconds] = useState(0)
  const [rewardPoints, setRewardPoints] = useState(0)
  const [rewardPopup, setRewardPopup] = useState<{ section: number; points: number; complete: boolean } | null>(null)
  const rewardedSectionsRef = useRef(new Set<string>())

  useEffect(() => { setSelectedText("") }, [pageNumber])

  const [goal, setGoal] = useState(room.defaultGoal)
  const [isEditingGoal, setIsEditingGoal] = useState(false)

  const [isPomodoro, setIsPomodoro] = useState(roomId === "pomodoro")
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [pomoClock, setPomoClock] = useState({ mode: "work" as "work" | "break", remaining: 25 * 60 })
  const pomoTimeLeft = pomoClock.remaining
  const pomoMode = pomoClock.mode
  const setPomoTimeLeft = (remaining: number) => setPomoClock({ mode: "work", remaining })
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const [currentSound, setCurrentSound] = useState("none")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [newMessage, setNewMessage] = useState("")

  // Fetch real books and categories
  useEffect(() => {
    async function fetchBooks() {
      setBooksLoading(true)
      const { data, error } = await supabase
        .from('books')
        .select(`id,title,author,cover_url,cover_image_url,description_hindi,language,genre`)
        .limit(500)
        
      if (data) {
        let filtered: any[] = [];
        
        // Target room mappings
        const keywordsMap: Record<string, string[]> = {
          "reading": ["fiction", "literature", "novel", "story", "poetry", "classic", "philosophy", "biography"],
          "english-lit": ["english", "english-literature", "classic", "fiction"],
          "coding": ["programming", "tech", "coding", "computer", "dsa", "javascript", "git"],
          "upsc": ["history", "polity", "upsc", "geography", "civil"],
          "language": ["language", "grammar"],
          "gate": ["science", "engineering", "math"],
          "pomodoro": ["productivity", "habit", "focus", "self-help"],
        };

        const targetKeywords = keywordsMap[roomId] || [];

        filtered = data.filter((b: any) => {
          const assignedRoom = Object.keys(ROOM_CONV_IDS).includes(b.description_hindi) ? b.description_hindi : "";

          // 1. If book has a specifically assigned room, strictly match that room!
          if (assignedRoom) {
            return assignedRoom === roomId;
          }

          // 2. If no room explicitly assigned:
          if (roomId === "silent" || roomId === "night-owl") {
            return true;
          }

          // For Hindi Literature room: match Hindi language books by default
          if (roomId === "reading") {
            return (b.language && b.language.toLowerCase() === "hindi") ||
              targetKeywords.some(k => (b.genre && b.genre.toLowerCase().includes(k)));
          }

          // For English Literature room: NEVER include coding/tech books
          if (roomId === "english-lit") {
            const isTech = ["coding", "programming", "tech", "computer", "dsa", "javascript", "git"].some(k =>
              (b.genre && b.genre.toLowerCase().includes(k)) ||
              (b.title && b.title.toLowerCase().includes(k))
            );
            if (isTech) return false;

            return (b.language && b.language.toLowerCase() === "english" && !isTech) ||
              targetKeywords.some(k => (b.genre && b.genre.toLowerCase().includes(k)));
          }

          // For Coding room
          if (roomId === "coding") {
            return ["coding", "programming", "tech", "computer", "dsa", "javascript", "git"].some(k =>
              (b.genre && b.genre.toLowerCase().includes(k)) ||
              (b.title && b.title.toLowerCase().includes(k))
            );
          }

          // Default fallback matching by genre keywords
          return targetKeywords.some(k => 
            (b.genre && b.genre.toLowerCase().includes(k)) ||
            (b.title && b.title.toLowerCase().includes(k))
          );
        });
        
        // An unpopulated subject shelf should not block reading in the room.
        // These are clearly labelled general suggestions, not assigned books.
        setGeneralBookSuggestions(filtered.length === 0 && data.length > 0)
        setRealBooks((filtered.length ? filtered : data.slice(0, 12)).map(book => ({ ...book, cover_url: book.cover_url || book.cover_image_url })));
      } else {
        setRealBooks([]);
      }
      setBooksLoading(false)
    }
    fetchBooks()
  }, [roomId])

  useEffect(() => {
    if (!user?.id || !realBooks.length) return
    const bookIds = realBooks.map(book => book.id)
    createClient().from("reading_progress").select("book_id,progress_percent,last_read_at,current_page,total_pages")
      .eq("user_id", user.id).in("book_id", bookIds).then(({ data }) => {
        const next: Record<string, { percent: number; lastRead: string }> = {}
        for (const progress of data || []) next[String(progress.book_id)] = {
          percent: progress.progress_percent ?? Math.round((progress.current_page / (progress.total_pages || 1)) * 100),
          lastRead: progress.last_read_at,
        }
        setBookProgress(next)
      })
  }, [user?.id, realBooks])

  const recommendedBooks = realBooks;

  // A session belongs only to the room page. The provider owns its one channel.
  useEffect(() => {
    joinSession({
      roomId,
      roomName: room.name,
      roomIcon: room.icon,
      status: activeBook ? "Reading intensely 📖" : "Studying quietly ✍️",
      readingBook: activeBook?.title || null,
      joinedAt: new Date().toISOString(),
    })
  }, [roomId, room.name, room.icon])

  // Database events are checked through the authenticated API. Unverified public
  // broadcasts must never inject private messages or impersonate another sender.
  useEffect(() => {
    let isSubscribed = true
    const ch = supabase.channel(`room-messages:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${roomConvId}` }, () => {
        if (isSubscribed && currentConvIdRef.current === roomConvId) loadMessages(roomConvId, true)
      }).subscribe()
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (isSubscribed) setUser(currentUser)
    })

    return () => {
      isSubscribed = false
      audioRef.current?.pause()
      audioRef.current = null
      supabase.removeChannel(ch)
    }
  }, [roomId])

  // Track book reading in both channel and global session
  useEffect(() => {
    const currentStatus = activeBook ? "Reading intensely 📖" : "Studying quietly ✍️"
    const currentBook = activeBook?.title || null
    updateSessionStatus(currentStatus, currentBook)

    setSelectedText("")
    setNoteInput("")
    setSelectionMenu(null)
    setNoteComposerOpen(false)
    setShowNotes(false)
    if (activeBook) setActiveTab("chat")
    if (activeBook) window.scrollTo({ top: 0, behavior: "instant" })
  }, [activeBook])

  useEffect(() => { rewardedSectionsRef.current = new Set(); setRewardPopup(null) }, [activeBook?.id])

  useEffect(() => {
    if (!user?.id) return
    createClient().from("reader_rewards").select("points").eq("user_id", user.id).then(({ data }) => {
      setRewardPoints((data || []).reduce((total, reward: { points: number }) => total + reward.points, 0))
    })
  }, [user?.id])

  useEffect(() => {
    if (!activeBook?.id || !user?.id || !numPages) return
    const sectionSize = Math.ceil(numPages / 5)
    const completeSections = Math.min(5, Math.floor(pageNumber / sectionSize))
    const nextSection = completeSections
    if (!nextSection) return
    const key = `${activeBook.id}:${nextSection}`
    if (rewardedSectionsRef.current.has(key)) return
    rewardedSectionsRef.current.add(key)
    const points = 20
    void createClient().from("reader_rewards").insert({ user_id: user.id, book_id: activeBook.id, section_number: nextSection, target_pages: Math.min(numPages, nextSection * sectionSize), points }).then(({ error }) => {
      if (!error) {
        setRewardPoints(total => total + points)
        setRewardPopup({ section: nextSection, points, complete: false })
      }
    })
  }, [activeBook?.id, user?.id, pageNumber, numPages])

  useEffect(() => {
    if (!activeBook?.id || !user?.id || !numPages || pageNumber < numPages) return
    const key = `${activeBook.id}:complete`
    if (rewardedSectionsRef.current.has(key)) return
    rewardedSectionsRef.current.add(key)
    const points = 100
    void createClient().from("reader_rewards").insert({ user_id: user.id, book_id: activeBook.id, section_number: 6, target_pages: numPages, points }).then(({ error }) => {
      if (!error) {
        setRewardPoints(total => total + points)
        window.setTimeout(() => setRewardPopup({ section: 5, points, complete: true }), 350)
      }
    })
  }, [activeBook?.id, user?.id, pageNumber, numPages])

  // Auto measure PDF container width to fit 100% of the box
  useEffect(() => {
    if (!pdfContainerRef.current) return;
    const updateWidth = () => {
      if (pdfContainerRef.current) {
        const w = pdfContainerRef.current.clientWidth - 40;
        const h = pdfContainerRef.current.clientHeight - 32;
        // A portrait PDF is roughly 0.73 as wide as it is tall. First render
        // therefore fits the complete page in the reader; zoom remains manual.
        if (w > 250 && h > 250) setPdfBoxWidth(Math.min(w, Math.max(270, Math.floor(h * 0.73))));
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(pdfContainerRef.current);
    return () => ro.disconnect();
  }, [activeBook, zenMode]);

  // Handle dragging splitter to resize PDF vs right panels
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitterRef.current) return;
      const newWidth = window.innerWidth - e.clientX - 32;
      // Allow right panels to range between 400px and 800px (or let PDF have remaining space)
      if (newWidth >= 400 && newWidth <= Math.min(850, window.innerWidth - 350)) {
        setRightPanelsWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isDraggingSplitterRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Capture text selection strictly within the PDF reader
  useEffect(() => {
    const handleSelectionChange = () => {
      if (!activeBook) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (!text) return;

      // Ensure the selection occurred inside the PDF container
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      const container = pdfContainerRef.current;

      if (container && anchorNode && focusNode && container.contains(anchorNode) && container.contains(focusNode)) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setSelectedText(text)
        setSelectionMenu({ top: Math.max(12, rect.top - 54), left: Math.min(window.innerWidth - 190, Math.max(12, rect.left + rect.width / 2 - 90)) })
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [activeBook]);
  
  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!activeBook) return;
      // Don't flip page if user is typing a note
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "ArrowRight") {
        e.preventDefault();
        changePage(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        changePage(-1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBook, pageNumber, numPages]);

  // Save annotation
  async function handleSaveAnnotation() {
    if (await saveAnnotation(pageNumber, selectedText, noteInput)) {
      setSelectedText("")
      setNoteInput("")
      setSelectionMenu(null)
      setNoteComposerOpen(false)
      window.getSelection()?.removeAllRanges()
    }
  }

  async function saveHighlight(color: "amber" | "blue" | "pink" | "green") {
    if (await saveAnnotation(pageNumber, selectedText, "", color)) {
      setSelectedText("")
      setSelectionMenu(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  async function clearOrRemoveSelection() {
    const existing = annotations.find(annotation => annotation.page_number === pageNumber && annotation.selected_text === selectedText)
    if (existing) await removeAnnotation(existing.id)
    setSelectedText("")
    setSelectionMenu(null)
    setNoteComposerOpen(false)
    window.getSelection()?.removeAllRanges()
  }

  // Book time is deliberately elapsed time, not a Pomodoro countdown. It only
  // advances while the reader tab is visible and resumes from the saved total.
  useEffect(() => {
    if (!activeBook?.id || !user?.id) { setBookReadingSeconds(0); return }
    let cancelled = false
    let total = 0
    let lastTick = Date.now()
    let lastSaved = 0
    const bookId = activeBook.id
    const save = async () => {
      if (cancelled || total === lastSaved) return
      lastSaved = total
      await createClient().from("book_reading_time").upsert({ user_id: user.id, book_id: bookId, total_seconds: total, updated_at: new Date().toISOString() }, { onConflict: "user_id,book_id" })
    }
    createClient().from("book_reading_time").select("total_seconds").eq("user_id", user.id).eq("book_id", bookId).maybeSingle().then(({ data }) => {
      if (cancelled) return
      total = data?.total_seconds || 0
      lastSaved = total
      lastTick = Date.now()
      setBookReadingSeconds(total)
    })
    const timer = window.setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - lastTick) / 1000)
      lastTick += elapsed * 1000
      if (!elapsed || document.visibilityState !== "visible") return
      total += elapsed
      setBookReadingSeconds(total)
      if (total - lastSaved >= 30) void save()
    }, 1000)
    return () => { window.clearInterval(timer); void save(); cancelled = true }
  }, [activeBook?.id, user?.id])

  // Measure actual elapsed time so throttled background tabs do not lose time.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const plannedGoal = params.get("goal")?.trim().slice(0, 120)
    const plannedMinutes = Number(params.get("minutes"))
    if (plannedGoal) setGoal(plannedGoal)
    if ([15, 25, 50].includes(plannedMinutes)) {
      setFocusMinutes(plannedMinutes)
      setPomoClock({ mode: "work", remaining: plannedMinutes * 60 })
      setIsPomodoro(true)
    }
  }, [roomId])
  useEffect(() => {
    if (!isTimerRunning) return
    let lastTick = Date.now()
    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastTick) / 1000)
      if (!seconds) return
      lastTick += seconds * 1000
      setSessionSeconds(previous => previous + seconds)
      if (isPomodoro) setPomoClock(previous => advanceFocusTimer(previous, seconds, focusMinutes))
    }, 1000)
    return () => clearInterval(timer)
  }, [isTimerRunning, isPomodoro, focusMinutes])

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : ""}${mins
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleSoundChange = (soundId: string) => {
    audioRef.current?.pause()
    setCurrentSound(soundId)
    const selected = AMBIENT_SOUNDS.find((s) => s.id === soundId)
    if (selected && selected.url) {
      const audio = new Audio(selected.url)
      audio.loop = true
      audio.volume = 0.5
      audio.play().catch(() => {})
      audioRef.current = audio
    } else {
      audioRef.current = null
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || !user || sendingMsg) return

    setNewMessage("")
    setSendingMsg(true)

    const tempId = `temp_${Date.now()}`
    const myUsername = user.user_metadata?.username || user.email?.split("@")[0] || "You"
    const optimisticMsg = {
      id: tempId,
      conversation_id: currentConvId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        username: myUsername,
        full_name: user.user_metadata?.full_name || myUsername,
      },
    }

    setDbMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConvId,
          content,
          sender_id: user.id,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const savedMsg = data.message
        setDbMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)))

      } else {
        setDbMessages((prev) => prev.filter((m) => m.id !== tempId))
        if (currentConvIdRef.current === currentConvId) setNewMessage(previous => previous || content)
        alert("Failed to send message.")
      }
    } catch (err) {
      console.error(err)
      setDbMessages((prev) => prev.filter((m) => m.id !== tempId))
      if (currentConvIdRef.current === currentConvId) setNewMessage(previous => previous || content)
    } finally {
      setSendingMsg(false)
    }
  }

  const activeUserList = Object.values(activeUsers)

  function changePage(offset: number) {
    if (!numPages) return;
    // Preserve current window scroll position so page doesn't jump
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    
    setPageNumber(prev => {
      const next = prev + offset;
      if (next < 1) return 1;
      if (numPages && next > numPages) return numPages;
      return next;
    });

    // Restore scroll position after React updates DOM
    requestAnimationFrame(() => {
      if (typeof window !== "undefined" && window.scrollY !== currentScrollY) {
        window.scrollTo({ top: currentScrollY, behavior: "instant" as ScrollBehavior });
      }
    });
  }

  return (
    <div 
      className={styles.roomContainer} 
      style={zenMode ? {
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, background: "#0a0a0a", overflowY: "auto", padding: "2rem"
      } : { 
        marginTop: 0,
        maxWidth: activeBook ? "98%" : "1400px",
        width: "100%",
        padding: activeBook ? "0.75rem 1.25rem" : undefined,
        transition: "max-width 0.3s ease"
      }}
    >
      <div className={styles.libraryBackdrop} aria-hidden="true"><span>ANCHOR LIBRARY</span></div>
      {/* Top Banner (Hidden in Zen Mode) */}
      {!zenMode && (
        <div className={styles.roomHeader} style={{ borderColor: `${room.color}33`, marginBottom: activeBook ? "1rem" : undefined, padding: activeBook ? "0.75rem 1.25rem" : undefined }}>
          <div className={styles.roomInfo}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => {
                leaveSession()
                router.push("/study-rooms")
              }}
              style={{ cursor: "pointer", border: "none" }}
            >
              ← Leave Room
            </button>
            <div className={styles.roomTitleGroup}>
              <span className={styles.roomIcon} style={{ background: `${room.color}22` }}>
                {room.icon}
              </span>
              <div>
                <h1 className={styles.roomHeading}>{room.name}</h1>
                <p className={styles.roomSub}>{roomId === "pomodoro" ? `${focusMinutes} minutes deep focus followed by a 5 minute break.` : room.desc}</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button onClick={() => setZenMode(true)} className="btn btn-secondary btn-sm">
              🧘 Enter Zen Mode
            </button>
            <div className={styles.liveBadge}>
              <span className="online-dot" style={{ position: "static", display: "inline-block" }} />
              <span>{activeUserList.length} Studying Now</span>
            </div>
          </div>
        </div>
      )}

      {/* Zen Mode Header */}
      {zenMode && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "1rem" }}>
           <button onClick={() => setZenMode(false)} className="btn btn-ghost btn-sm" style={{ color: "#fff" }}>
              ✕ Exit Zen Mode
            </button>
        </div>
      )}

      {/* Main Grid changes dynamically if reading a book */}
      <div 
        className={`${styles.roomGrid} ${activeBook ? styles.readingGrid : ""}`}
        style={{ 
          gridTemplateColumns: zenMode 
            ? "1fr" 
            : activeBook 
              ? "minmax(0, 1fr) minmax(300px, 360px)"
              : "1fr 380px", 
          gap: activeBook ? "0.75rem" : undefined 
        }}
      >
        
        {/* IF READING: Show PDF Viewer Area */}
        {activeBook && (
          <div className={styles.bookReader} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", overflow: "hidden", height: "calc(100vh - 210px)", minHeight: "520px" }}>
             <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{activeBook.title}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>By {activeBook.authors?.name || activeBook.author || "Unknown"}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className={styles.readerQuest}>
                    <span>Reading quest</span>
                    <strong>Section {numPages ? Math.min(5, Math.floor((pageNumber - 1) / Math.ceil(numPages / 5)) + 1) : 1} of 5</strong>
                    <div><i style={{ width: `${numPages ? Math.min(100, Math.max(0, ((pageNumber - 1) % Math.ceil(numPages / 5) + 1) / Math.min(Math.ceil(numPages / 5), numPages - Math.floor((pageNumber - 1) / Math.ceil(numPages / 5)) * Math.ceil(numPages / 5)) * 100)) : 0}%` }} /></div>
                    <small>{numPages ? `${Math.ceil(numPages / 5)} pages per section · +20 pts` : "Loading pages…"}</small>
                  </div>
                  <span className={styles.rewardPoints}>✦ {rewardPoints} pts</span>
                  <span className={styles.readingTime}>◷ {formatTime(bookReadingSeconds)} read</span>
                  <button className="btn btn-ghost btn-sm" aria-label="Zoom out" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>➖</button>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{Math.round(scale * 100)}%</span>
                  <button className="btn btn-ghost btn-sm" aria-label="Zoom in" onClick={() => setScale(s => Math.min(3.0, s + 0.2))}>➕</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowNotes(value => !value)}>{showNotes ? "Hide notes" : `Notes (${annotations.length})`}</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveBook(null)} style={{ marginLeft: "0.25rem" }}>Close Book</button>
                </div>
             </div>

             {selectionMenu && (
               <div className={styles.selectionMenu} style={{ top: selectionMenu.top, left: selectionMenu.left }} role="toolbar" aria-label="Selected text actions">
                 <button type="button" onClick={() => saveHighlight("amber")} title="Amber highlight" className={styles.highlightAmber}>●</button>
                 <button type="button" onClick={() => saveHighlight("blue")} title="Blue highlight" className={styles.highlightBlue}>●</button>
                 <button type="button" onClick={() => saveHighlight("pink")} title="Pink highlight" className={styles.highlightPink}>●</button>
                 <button type="button" onClick={() => saveHighlight("green")} title="Green highlight" className={styles.highlightGreen}>●</button>
                 <button type="button" className={styles.selectionAction} onClick={() => setNoteComposerOpen(value => !value)}>Add note</button>
                 <button type="button" className={styles.selectionAction} onClick={clearOrRemoveSelection}>Remove</button>
                 {noteComposerOpen && <div className={styles.notePopover}>
                   <textarea autoFocus value={noteInput} onChange={event => setNoteInput(event.target.value)} placeholder="What do you want to remember?" />
                   <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveAnnotation} disabled={saving || !noteInput.trim()}>{saving ? "Saving…" : "Save note"}</button>
                 </div>}
               </div>
             )}

             {showNotes && <aside className={styles.notesDrawer} aria-label="Saved notes">
               <div><strong>Notes &amp; highlights</strong><button type="button" onClick={() => setShowNotes(false)}>✕</button></div>
               {annotations.length ? annotations.map(annotation => <button type="button" key={annotation.id} onClick={() => { setPageNumber(annotation.page_number); setShowNotes(false) }}><span>Page {annotation.page_number}</span><em>{annotation.selected_text}</em>{annotation.note && <b>{annotation.note}</b>}</button>) : <p>No saved notes yet.</p>}
             </aside>}

             {rewardPopup && <div className={`${styles.rewardPopup} ${rewardPopup.complete ? styles.completionPopup : ""}`} role="status">
               <button type="button" onClick={() => setRewardPopup(null)} aria-label="Close celebration">✕</button>
               <div className={styles.fireworks} aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>
               <span>{rewardPopup.complete ? "🎁" : "✦"}</span><strong>{rewardPopup.complete ? "Book complete!" : `Section ${rewardPopup.section} complete!`}</strong><p>{rewardPopup.complete ? "Every finished book becomes a part of you." : "A little more reading. A little more momentum."}</p><b>+{rewardPopup.points} points</b>
             </div>}
             
             {/* Actual PDF Viewer */}
             <div ref={pdfContainerRef} style={{ flex: 1, background: "#e5e5e5", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%", padding: "1rem" }}>
               {activeBook.id ? (
                 <div style={{ margin: "auto 0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
                    <PdfCanvas
                      bookId={activeBook.id}
                      watermark={user?.user_metadata?.username || "Member"}
                      onPageChange={setPageNumber}
                      pageNumber={pageNumber}
                      scale={scale}
                      width={pdfBoxWidth || undefined}
                      highlights={annotations}
                      onLoadSuccess={({ numPages }) => {
                        setNumPages(numPages)
                        setPageNumber(page => Math.max(1, Math.min(page, numPages)))
                      }}
                    />
                 </div>
               ) : (
                  <div style={{ margin: "auto", textAlign: "center", padding: "2rem" }}>
                    <span style={{ fontSize: "4rem" }}>📖</span>
                    <p style={{ color: "var(--color-text-secondary)", marginTop: "1rem" }}>
                      This book does not have a PDF uploaded.
                    </p>
                  </div>
               )}
             </div>

             {/* Book Navigation Bar */}
             <div style={{ padding: "0.75rem", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => changePage(-1)} disabled={!numPages || pageNumber <= 1}>← Prev Page</button>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  <PageJump page={pageNumber} total={numPages} onChange={setPageNumber} />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => changePage(1)} disabled={!numPages || pageNumber >= numPages}>Next Page →</button>
             </div>
          </div>
        )}

        {/* Focus Timer Area (Shrinks if reading) */}
        <div className={styles.mainFocusArea} style={{ display: activeBook || (zenMode && activeBook) ? "none" : undefined, maxWidth: zenMode ? "800px" : "100%", margin: zenMode ? "0 auto" : "0" }}>
          
          {/* Top avatars in Zen Mode */}
          {zenMode && activeUserList.length > 0 && (
             <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                {activeUserList.map((u, i) => (
                    <div key={u.id} className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: 14, background: `hsl(${i * 60 + 190}, 75%, 55%)`, marginLeft: i > 0 ? -10 : 0, border: "2px solid #000" }} title={u.username}>
                      {u.username[0].toUpperCase()}
                    </div>
                ))}
             </div>
          )}

          {/* Goal Box */}
          <div className={styles.goalCard} style={{ background: zenMode ? "transparent" : "", border: zenMode ? "1px solid #333" : "", padding: activeBook ? "1rem" : undefined }}>
            <div className={styles.goalHeader}>
              <span className={styles.goalLabel}>🎯 CURRENT SESSION GOAL</span>
              {!zenMode && !activeBook && (
                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingGoal(!isEditingGoal)}>
                  {isEditingGoal ? "Save" : "✏️ Edit Goal"}
                </button>
              )}
            </div>
            {isEditingGoal && !zenMode ? (
              <input
                type="text"
                className="input"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingGoal(false)}
                autoFocus
              />
            ) : (
              <p className={styles.goalText} style={{ fontSize: zenMode ? "1.5rem" : activeBook ? "1rem" : "", textAlign: zenMode ? "center" : "left" }}>"{goal}"</p>
            )}
          </div>

          {/* Central Timer Box */}
          <div className={styles.timerCard} style={{ borderColor: `${room.color}44`, background: zenMode ? "transparent" : "", boxShadow: zenMode ? "none" : "", padding: activeBook ? "1.5rem 1rem" : undefined }}>
            {!zenMode && !activeBook && (
              <div className={styles.timerModeToggle}>
                <button className={`${styles.modeBtn} ${!isPomodoro ? styles.modeBtnActive : ""}`} onClick={() => setIsPomodoro(false)}>⏱️ Stop Watch</button>
                <button className={`${styles.modeBtn} ${isPomodoro ? styles.modeBtnActive : ""}`} onClick={() => setIsPomodoro(true)}>🍅 Pomodoro</button>
              </div>
            )}

            <div className={styles.timerDisplay} style={{ marginBottom: activeBook ? "1rem" : undefined }}>
              {isPomodoro ? (
                <>
                  <div className={styles.pomoBadge} style={{ color: pomoMode === "work" ? "#FF6B6B" : "#00D4AA" }}>
                    {pomoMode === "work" ? "🧠 FOCUS TIME" : "☕ BREAK"}
                  </div>
                  <div className={styles.timerNumbers} style={{ color: room.color, fontSize: activeBook ? "3rem" : zenMode ? "8rem" : "5rem" }}>
                    {formatTime(pomoTimeLeft)}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.pomoBadge}>SESSION TIME</div>
                  <div className={styles.timerNumbers} style={{ color: room.color, fontSize: activeBook ? "3rem" : zenMode ? "8rem" : "5rem" }}>
                    {formatTime(sessionSeconds)}
                  </div>
                </>
              )}
            </div>

            <div className={styles.timerControls} style={{ justifyContent: zenMode ? "center" : "center", flexWrap: "wrap", width: "100%" }}>
              <button
                className={`btn ${isTimerRunning ? "btn-secondary" : "btn-primary"} ${activeBook ? "btn-sm" : "btn-lg"}`}
                style={{ width: activeBook ? "100%" : "auto", justifyContent: "center" }}
                onClick={() => setIsTimerRunning(!isTimerRunning)}
              >
                {isTimerRunning ? "⏸️ Pause" : "▶️ Resume"}
              </button>
              {!zenMode && !activeBook && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSessionSeconds(0); setPomoTimeLeft(focusMinutes * 60); }}>🔄 Reset</button>
              )}
            </div>
          </div>

          {/* Notes are intentionally not rendered while reading. They open from the book header. */}
          {false && activeBook && !zenMode && (
            <div className={styles.sidebarBox}>
              <h3 className={styles.boxTitle} style={{ fontSize: "0.9rem", color: "var(--color-primary-dark)", display: "flex", justifyContent: "space-between" }}>
                <span>📝 Notes & Highlights</span>
              </h3>
              
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                Select text in the PDF to save a highlight.
              </p>

              {/* Note / Annotation Form */}
              <div style={{ background: "var(--color-surface-2)", padding: "0.75rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", border: "1px solid var(--color-border)" }}>
                {selectedText ? (
                  <div style={{ fontSize: "0.75rem", fontStyle: "italic", marginBottom: "0.5rem", color: "var(--color-primary)", maxHeight: "50px", overflow: "hidden" }}>
                    "{selectedText}"
                  </div>
                ) : (
                  <div style={{ fontSize: "0.75rem", marginBottom: "0.5rem", color: "var(--color-text-secondary)" }}>
                    📌 Note for <strong>Page {pageNumber}</strong>
                  </div>
                )}
                <textarea 
                  className="input w-full" 
                  placeholder="Type note or takeaways..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  style={{ marginBottom: "0.5rem", minHeight: "55px", fontSize: "0.8rem", padding: "0.5rem" }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-primary btn-sm w-full" onClick={handleSaveAnnotation} disabled={saving || (!selectedText.trim() && !noteInput.trim())}>{saving ? "Saving…" : selectedText && !noteInput.trim() ? "Save Highlight" : "Save Note"}</button>
                  {selectedText && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedText("")}>Clear</button>
                  )}
                </div>
              </div>

              <p role="status" style={{ fontSize: "0.75rem", marginBottom: "0.75rem" }}>{noteStatus}</p>
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{progressStatus}</p>

              {/* Saved Annotations List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {annotations.length === 0 && !selectedText && (
                   <div style={{ textAlign: "center", padding: "1rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                     No notes yet. Highlight text in the PDF to start.
                   </div>
                )}
                {annotations.map((ann, idx) => (
                  <div 
                    key={ann.id || idx} 
                    style={{ 
                      padding: "0.75rem", 
                      background: "var(--color-surface)", 
                      border: "1px solid var(--color-border)", 
                      borderRadius: "var(--radius-sm)", 
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      opacity: ann.page_number === pageNumber ? 1 : 0.7 
                    }}
                    onClick={() => {
                      if (ann.page_number) setPageNumber(ann.page_number)
                    }}
                    title="Click to jump to this page"
                  >
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.7rem", marginBottom: "4px" }}>
                      Page {ann.page_number}
                    </div>
                    <div style={{ paddingLeft: "8px", borderLeft: "3px solid var(--color-primary)", color: "var(--color-text-secondary)", fontStyle: "italic", marginBottom: ann.note ? "8px" : "0" }}>
                      "{ann.selected_text}"
                    </div>
                    {ann.note && (
                      <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {ann.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ambient Sounds Player */}
          {!zenMode && !activeBook && (
            <div className={styles.soundBar}>
              <span className={styles.soundTitle}>🎧 Ambient Sound:</span>
              <div className={styles.soundOptions}>
                {AMBIENT_SOUNDS.map((s) => (
                  <button
                    key={s.id}
                    className={`${styles.soundBtn} ${currentSound === s.id ? styles.soundBtnActive : ""}`}
                    onClick={() => handleSoundChange(s.id)}
                  >
                    <span>{s.icon}</span> {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Active Members, Chat & Library (Hidden in Zen Mode) */}
        {!zenMode && (
          <div className={styles.roomSidebar}>
            
            {/* Sidebar Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <button 
                className={`btn btn-sm ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setActiveTab('chat')}
              >
                💬 Chat
              </button>
              {!activeBook && <button
                className={`btn btn-sm ${activeTab === 'library' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setActiveTab('library')}
              >
                📚 Books
              </button>}
            </div>

            {activeTab === 'chat' ? (
              <>
                {/* Active Participants */}
                <div className={styles.sidebarBox} style={{ padding: activeBook ? "1rem" : undefined }}>
                  {/* New Incoming Message Popup Banner */}
                  {unreadMsgBanner && (
                    <div style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#ffffff",
                      borderRadius: "var(--radius-md)",
                      padding: "0.6rem 0.8rem",
                      marginBottom: "0.8rem",
                      fontSize: "0.82rem",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      animation: "fadeIn 0.3s ease",
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 700, fontSize: "0.78rem" }}>
                          <span>💬</span>
                          <span>New Message from @{unreadMsgBanner.partner?.username || unreadMsgBanner.senderName}</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", opacity: 0.95, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          A new private message is waiting in your inbox.
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: "#ffffff", color: "#065f46", fontWeight: 700, padding: "0.2rem 0.6rem", fontSize: "0.72rem", border: "none" }}
                          onClick={() => {
                            setActiveDirectChat({ conversationId: unreadMsgBanner.conversationId, partner: unreadMsgBanner.partner })
                            setChatMode("direct")
                            setUnreadMsgBanner(null)
                          }}
                        >
                          Reply
                        </button>
                        <button
                          style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: "0.8rem", cursor: "pointer", opacity: 0.8 }}
                          onClick={() => setUnreadMsgBanner(null)}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {incomingChatRequests.length > 0 && (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)",
                      border: "1px solid rgba(2, 132, 199, 0.5)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.6rem 0.8rem",
                      marginBottom: "0.8rem",
                      fontSize: "0.82rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🔔</span>
                        <span><strong>@{incomingChatRequests[0]?.profiles?.username}</strong> wants to chat!</span>
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                        onClick={() => setSelectedProfileUserId(incomingChatRequests[0]?.from_user_id)}
                      >
                        View &amp; Accept
                      </button>
                    </div>
                  )}

                  <h3 className={styles.boxTitle} style={{ fontSize: activeBook ? "0.8rem" : undefined }}>
                    👥 Active ({activeUserList.length})
                  </h3>
                  <div className={styles.participantList}>
                    {activeUserList.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Connecting...</p>}
                    {activeUserList.map((u, i) => {
                      const isMe = u.id === user?.id
                      return (
                        <div
                          key={u.id}
                          className={styles.participantItem}
                          style={{
                            alignItems: "flex-start",
                            cursor: "pointer",
                            padding: "6px 8px",
                            borderRadius: "8px",
                            transition: "all 0.2s ease",
                            background: selectedProfileUserId === u.id ? "rgba(255, 255, 255, 0.08)" : "transparent",
                            border: "1px solid transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = selectedProfileUserId === u.id ? "rgba(255, 255, 255, 0.08)" : "transparent"
                            e.currentTarget.style.borderColor = "transparent"
                          }}
                          onClick={() => setSelectedProfileUserId(u.id)}
                          title={`Click to view ${u.username}'s profile, books & chat`}
                        >
                          <div className="relative">
                            <div className="avatar-placeholder" style={{ width: activeBook ? 28 : 34, height: activeBook ? 28 : 34, fontSize: 12, background: `hsl(${i * 60 + 190}, 75%, 55%)` }}>
                              {u.username[0].toUpperCase()}
                            </div>
                            <span className="online-dot" />
                          </div>
                          <div className={styles.participantMeta} style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div className={styles.pName} style={{ fontSize: activeBook ? "0.8rem" : undefined }}>
                                {u.username} {isMe && <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>(You)</span>}
                              </div>
                              <span style={{ fontSize: "0.68rem", color: "var(--color-primary)", fontWeight: 600 }}>
                                View Profile ↗
                              </span>
                            </div>
                            <div className={styles.pStatus} style={{ fontSize: activeBook ? "0.65rem" : undefined }}>
                              {u.status}
                              {u.readingBook && <div style={{ color: "var(--color-primary)", marginTop: "2px", fontWeight: 600 }}>📖 {u.readingBook}</div>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Sidebar Chat Box with Left/Right Layout & DB Persistence */}
                <div className={styles.sidebarBox} style={{ flex: 1, display: "flex", flexDirection: "column", padding: activeBook ? "1rem" : undefined }}>
                  {/* Mode Switcher Tabs */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${chatMode === "room" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                        onClick={() => setChatMode("room")}
                      >
                        👥 Room Chat
                      </button>
                      {userConversations
                        .filter((conv) => {
                          // Show in room sidebar tabs if the partner is currently active in this study room,
                          // OR if it's the direct chat currently open
                          const isPartnerActiveInRoom = activeUserList.some((u) => u.id === conv.partner?.id || u.username === conv.partner?.username)
                          const isCurrentlyOpen = chatMode === "direct" && activeDirectChat?.conversationId === conv.id
                          return isPartnerActiveInRoom || isCurrentlyOpen
                        })
                        .map((conv) => {
                          const isCurrent = chatMode === "direct" && activeDirectChat?.conversationId === conv.id
                          const hasUnread = conv.has_unread
                          return (
                            <button
                              key={conv.id}
                              type="button"
                              className={`btn btn-sm ${isCurrent ? "btn-primary" : "btn-secondary"}`}
                              style={{
                                padding: "0.25rem 0.6rem",
                                fontSize: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                position: "relative",
                                whiteSpace: "nowrap",
                              }}
                              onClick={() => {
                                setActiveDirectChat({ conversationId: conv.id, partner: conv.partner })
                                setChatMode("direct")
                              }}
                            >
                              <span>💬 @{conv.partner?.username}</span>
                              {hasUnread && !isCurrent && (
                                <span style={{
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  background: "#10b981",
                                  display: "inline-block",
                                }} />
                              )}
                            </button>
                          )
                        })}
                    </div>
                    {chatMode === "direct" && (
                      <button
                        type="button"
                        onClick={() => setChatMode("room")}
                        style={{ background: "transparent", border: "none", color: "var(--color-primary)", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                        title="Switch back to Room Chat"
                      >
                        ← Room Chat
                      </button>
                    )}
                  </div>

                  {/* 7-Day Auto-Delete Policy Notice */}
                  <div style={{
                    fontSize: "0.7rem",
                    background: "#fef9ed",
                    border: "1px solid rgba(180, 83, 9, 0.15)",
                    color: "#b45309",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    lineHeight: 1.3
                  }}>
                    <span>⏱️</span>
                    <span>
                      {chatMode === "direct" ? `Private 1-on-1 with @${activeDirectChat?.partner?.username}` : `Room Chat (${room.name})`} • 7-day chat history
                    </span>
                  </div>

                  {/* Message History (Left / Right WhatsApp Style) */}
                  <div ref={chatContainerRef} className={styles.chatLog} style={{ maxHeight: activeBook ? "220px" : "320px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {loadingMessages ? (
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", margin: "auto" }}>
                        Loading messages from database...
                      </p>
                    ) : dbMessages.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", margin: "auto" }}>
                        {chatMode === "direct"
                          ? `Start your direct study conversation with @${activeDirectChat?.partner?.username}!`
                          : "Say hi to your study partners in this room!"}
                      </p>
                    ) : (
                      dbMessages.map((m, i) => {
                        const myUsername = user?.user_metadata?.username || user?.email?.split("@")[0] || ""
                        const isMe = m.sender_id === user?.id || (m.profiles?.username && m.profiles.username === myUsername)
                        const senderName = isMe ? "You" : (m.profiles?.full_name || m.profiles?.username || "Study Partner")
                        const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""


                        return (
                          <div
                            key={m.id || i}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isMe ? "flex-end" : "flex-start",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "85%",
                                padding: "6px 10px",
                                borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                background: isMe ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)" : "#fef9ed",
                                color: isMe ? "#ffffff" : "#1c1917",
                                border: isMe ? "none" : "1px solid rgba(180, 83, 9, 0.18)",
                                boxShadow: isMe ? "0 2px 6px rgba(180, 83, 9, 0.25)" : "0 1px 2px rgba(0, 0, 0, 0.04)",
                                wordBreak: "break-word",
                                fontSize: "0.82rem",
                                lineHeight: 1.35,
                              }}
                            >
                              {!isMe && (
                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#b45309", marginBottom: "2px" }}>
                                  {senderName}
                                </div>
                              )}

                              <div>{m.content || m.text}</div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: "3px",
                                  fontSize: "0.62rem",
                                  marginTop: "3px",
                                  opacity: isMe ? 0.9 : 0.65,
                                  color: isMe ? "#ffffff" : "#78716c",
                                }}
                              >
                                <span>{timeStr || m.time}</span>
                                {isMe && (
                                  <span
                                    style={{
                                      color: "rgba(255,255,255,0.7)",
                                      fontWeight: "bold",
                                      fontSize: "0.72rem",
                                      letterSpacing: "-1.5px",
                                      marginLeft: "1px",
                                    }}
                                    title="Sent"
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={chatScrollRef} />
                  </div>

                  {/* Message Input Form */}
                  <form onSubmit={handleSendMessage} className={styles.chatInputForm}>
                    <input
                      type="text"
                      maxLength={4000}
                      className="input"
                      placeholder={chatMode === "direct" ? `Message @${activeDirectChat?.partner?.username}...` : "Post a message to room..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      style={{ padding: activeBook ? "0.4rem" : undefined, fontSize: activeBook ? "0.8rem" : undefined }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={!newMessage.trim() || sendingMsg} style={{ padding: activeBook ? "0.4rem 0.6rem" : undefined }}>
                      {sendingMsg ? "..." : "Send"}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Library Tab Content */
              <div className={styles.sidebarBox} style={{ flex: 1, display: "flex", flexDirection: "column", padding: activeBook ? "1rem" : undefined }}>
                <h3 className={styles.boxTitle} style={{ fontSize: activeBook ? "0.9rem" : undefined }}>📚 Books</h3>
                {!activeBook && (
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                    {generalBookSuggestions ? "Suggestions from the library. Read any of these here." : "Read right here in the study room."}
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1, maxHeight: activeBook ? "50vh" : "600px", paddingRight: "4px" }}>
                  {booksLoading ? <p role="status">Loading room books…</p> : recommendedBooks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem 1rem", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" }}>
                      <span style={{ fontSize: "2.5rem" }}>📖</span>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "0.5rem", color: "var(--color-text-primary)" }}>
                        No books assigned to this room yet
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                        Books will appear here once added in Admin Panel.
                      </p>
                      <Link href="/library" className="btn btn-secondary btn-sm" style={{ marginTop: "1rem", display: "inline-block" }}>
                        Browse Main Library 📚
                      </Link>
                    </div>
                  ) : (
                    recommendedBooks.map(b => (
                      <div key={b.id} style={{ display: "flex", gap: "1rem", padding: "0.8rem", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <div style={{ width: activeBook ? "40px" : "50px", height: activeBook ? "60px" : "70px", background: "var(--color-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: activeBook ? "1rem" : "1.5rem", borderRadius: "4px", flexShrink: 0, overflow: "hidden" }}>
                          {b.cover_url ? <img src={b.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (b.cover || "📘")}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: activeBook ? "0.8rem" : "0.9rem", fontWeight: 700, lineHeight: 1.2 }} className="truncate" title={b.title}>{b.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "4px" }} className="truncate">By {b.authors?.name || b.author || "Unknown"}</div>
                          {bookProgress[String(b.id)] && <div style={{ marginTop: "0.55rem", fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                            <div>Continue from {bookProgress[String(b.id)].percent}% · last reading saved</div>
                            <div style={{ height: "4px", marginTop: "5px", borderRadius: "999px", background: "var(--color-border)", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(100, Math.max(0, bookProgress[String(b.id)].percent))}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, #d97706, #f59e0b)" }} />
                            </div>
                          </div>}
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center" }}
                            onClick={() => setActiveBook(activeBook?.id === b.id ? null : b)}
                          >
                            {activeBook?.id === b.id ? "Close" : "Read Now"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedProfileUserId && (
        <UserProfileModal
          targetUserId={selectedProfileUserId}
          currentUser={user}
          onClose={() => setSelectedProfileUserId(null)}
          onOpenChat={(convId, partner) => {
            setSelectedProfileUserId(null)
            setActiveDirectChat({ conversationId: convId, partner })
            setChatMode("direct")
            setActiveTab("chat")
          }}
        />
      )}
    </div>
  )
}
