import Link from "next/link"

export const metadata = { title: "Privacy & Community Guide" }
export default function PrivacyPage() {
  return <article className="container" style={{ maxWidth: 800, padding: "55px 24px", lineHeight: 1.9 }}>
    <p style={{ color: "var(--color-primary-dark)", fontSize: 12 }}>A LITTLE COMPANY. CLEAR BOUNDARIES.</p>
    <h1 className="heading-serif" style={{ fontSize: "clamp(32px, 5vw, 48px)", margin: "14px 0 28px" }}>Your space to study.</h1>
    <section><h2>Public rooms and private conversations</h2><p>Room chat is visible to signed-in members who open that room. Direct messages require an accepted chat request and are restricted to conversation participants in the app. Choose your partners; declining a request does not start a conversation.</p></section>
    <section style={{ marginTop: 24 }}><h2>Your reading belongs to you</h2><p>Your favourites, notes and reading progress are personal. Other members’ profile cards do not show their reading history. Current book titles are not broadcast in room presence. Room counts come from live connections, with each account counted once per room.</p></section>
    <section style={{ marginTop: 24 }}><h2>What a notification means</h2><p>The bell shows pending partner requests, unread private conversations and account updates. Private message text is kept out of notification previews. This is an in-app inbox; email and browser push alerts are not enabled.</p></section>
    <section style={{ marginTop: 24 }}><h2>Storage and limits</h2><p>The chat interface shows the most recent 7 days of history. That display window does not promise permanent deletion from database storage or backups. Direct messages are not end-to-end encrypted; authorised service operators may access stored records to operate the service.</p><p>PDFs sent to your browser cannot be made copy-proof. The app has login and access checks, but existing publicly shared Google Drive source files retain their own sharing settings.</p></section>
    <section style={{ marginTop: 24 }}><h2>AI, with your choice</h2><p>No AI assistant is currently connected. A future reading assistant should use only the passage you choose to share. Private partner conversations will not be used as automatic AI context.</p></section>
    <section style={{ marginTop: 24 }}><h2>Be a good study neighbour</h2><p>Keep room chat relevant, respect a declined request, and avoid sharing passwords, contact details or sensitive documents. Share ideas and encouragement, without pressuring someone to respond or disclose personal information.</p></section>
    <Link href="/study-rooms" className="btn btn-primary" style={{ marginTop: 32 }}>Find your study room →</Link>
  </article>
}
