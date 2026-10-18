"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import styles from "./NotificationCenter.module.css"

export type InboxNotice = { id: string; title: string; description: string; href: string; storedId?: string }
export default function NotificationCenter({ items, onRead }: { items: InboxNotice[]; onRead: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [])
  return <div className={styles.wrap} ref={ref} onKeyDown={event => { if (event.key === "Escape") setOpen(false) }}>
    <button className={styles.trigger} aria-label={"Notifications" + (items.length ? ": " + items.length + " unread" : "")} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{items.length > 0 && <span className={styles.count}>{items.length > 9 ? "9+" : items.length}</span>}
    </button>
    {open && <section className={styles.panel} aria-label="Your notifications">
      <div className={styles.heading}><strong>Notifications</strong><span>{items.length} unread</span></div>
      <p className={styles.caption}>Requests, unread chats and account updates. Message content stays in your inbox.</p>
      {!items.length ? <div className={styles.empty}><strong>You’re all caught up.</strong><p>New partner requests and unread conversations will appear here.</p></div> : <ul>{items.map(item => <li key={item.id}>
        <Link href={item.href} onClick={() => { setOpen(false); if (item.storedId) onRead(item.storedId) }}><strong>{item.title}</strong><span>{item.description}</span></Link>
      </li>)}</ul>}
      <Link href="/chat" className={styles.footer} onClick={() => setOpen(false)}>Open your inbox →</Link>
    </section>}
  </div>
}
