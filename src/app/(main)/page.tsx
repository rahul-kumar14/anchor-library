import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import FocusLauncher from "@/components/home/FocusLauncher"
import AnimatedFacts from "@/components/home/AnimatedFacts"
import { getRoomShelf } from "@/lib/home-shelf"
import styles from "./page.module.css"

export default async function HomePage() {
  const supabase = await createClient()
  const [{ count: bookCount }, { count: categoryCount, data: categories }, { data: books }] = await Promise.all([
    supabase.from("books").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id,name", { count: "exact" }),
    supabase.from("books").select("id,title,author,cover_url,cover_image_url,description_hindi,language,genre,category_id").order("is_featured", { ascending: false }).order("id").limit(500),
  ])
  const categoryNames = new Map((categories || []).map(category => [category.id, category.name]))
  const shelf = getRoomShelf((books || []).map(book => ({ ...book, category_name: categoryNames.get(book.category_id) || "" })))
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}><span className={styles.signal} aria-hidden="true" /> A QUIETER CORNER OF THE INTERNET</p>
        <h1>More reading.<br />Less scrolling.<br /><em>A little company.</em></h1>
        <p className={styles.intro}>An open book. A focused room. A study partner who gets it.<br /> Make space for the ideas you’ve been meaning to get to.</p>
        <div className={styles.actions}><Link href="/study-rooms" className={styles.primary}>Find a study room <span>↗</span></Link><Link href="/library" className={styles.secondary}>Explore the shelves →</Link></div>
        <div className={styles.heroNotes}><span>Hindi + English reading</span><span>Notes that stay with you</span><span>No camera required</span></div>
      </div>
      <div className={styles.launcher}><FocusLauncher /></div>
    </section>
    <AnimatedFacts bookCount={bookCount} categoryCount={categoryCount} roomCount={9} />
    <section className={styles.workflow} id="how-it-works">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>A SMALL RITUAL. A GOOD HABIT.</p><h2>Arrive with a goal.<br /><em>Leave with something learned.</em></h2></div><p>Everything you need for a reading session, close at hand. Settle in for fifteen minutes or stay for a chapter.</p></div>
      <div className={styles.steps}>
        {[{ n: "01", title: "Find your quiet", text: "Choose silent company, a Pomodoro rhythm, or a room for your subject.", link: "/study-rooms", label: "Explore the rooms" },
          { n: "02", title: "Get into the book", text: "Read right inside your room. Zoom, turn pages and pick up where you left off.", link: "/library", label: "Find your next read" },
          { n: "03", title: "Keep the good parts", text: "Save a highlight or a thought. Your reading notes and saved shelf are yours.", link: "/favorites", label: "Build your bookshelf" },
          { n: "04", title: "Study with a partner", text: "Find company in room group chat, or connect through an accepted request for a private one-to-one conversation.", link: "/chat", label: "Meet your study partner" }].map(step => <article key={step.n}><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p><Link href={step.link}>{step.label} ↗</Link></article>)}
      </div>
    </section>
    <section className={styles.shelf}>
      <div className={styles.sectionHead}><div><p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}><span className={styles.signal} aria-hidden="true" /> SOMETHING WORTH SITTING DOWN FOR</p><h2>A shelf for<br /><em>your next chapter.</em></h2></div><Link href="/library" className={styles.secondary}>Browse the whole library →</Link></div>
      <p className={styles.shelfIntro}>Nine rooms. Nine reading starts. Find a book for your kind of focus.</p>
      <div className={styles.books}>{shelf.map(({ room, book, suggested }, index) => <article className={styles.book} key={room.id}>
        <Link href={"/library/" + book.id} className={styles.cover} aria-label={"Preview " + book.title} style={{ background: ["#e9e3d6", "#dce3d4", "#e9dfd8"][index % 3] }}>{book.cover_url || book.cover_image_url ? <img src={book.cover_url || book.cover_image_url!} alt="" loading="lazy" /> : <span>📖</span>}</Link>
        <div><Link href={"/study-rooms/" + room.id} className={styles.roomLabel}>{room.icon} {room.name} ↗</Link><h3><Link href={"/library/" + book.id}>{book.title}</Link></h3><p>{book.author || "Discover this title"}</p>{suggested && <small className={styles.suggestion}>Library suggestion</small>}<Link href={"/library/" + book.id} className={styles.openBook}>Open this book ↗</Link></div>
      </article>)}</div>
    </section>
    <section className={styles.company}>
      <div><p className={styles.eyebrow}>TOGETHER, WITH ROOM TO YOURSELF</p><h2>Company when you want it.<br /><em>Quiet when you need it.</em></h2><p>Study alongside others without turning on a camera. A private conversation starts after an accepted partner request. Your reading history stays on your own shelf.</p><Link href="/study-rooms" className={styles.primary}>Take your place →</Link></div>
      <div className={styles.roomChoices}>{[{ icon: "◌", name: "Silent Study", desc: "A little company. A lot of quiet.", id: "silent" }, { icon: "◷", name: "Pomodoro Focus", desc: "Make one focused block count.", id: "pomodoro" }, { icon: "☾", name: "Night Owl", desc: "For the chapters after hours.", id: "night-owl" }].map(room => <Link key={room.id} href={"/study-rooms/" + room.id}><span>{room.icon}</span><div><strong>{room.name}</strong><p>{room.desc}</p></div><span>↗</span></Link>)}</div>
    </section>
    <section className={styles.closing}><p className={styles.eyebrow}>YOUR NEXT CHAPTER STARTS SMALL</p><h2>One book. One goal.<br /><em>Somewhere to begin.</em></h2><Link href="/register" className={styles.primary}>Make yourself at home →</Link><p>Already part of the library? <Link href="/login">Come on in.</Link></p></section>
    <footer className={styles.footer}><Link href="/" className={styles.brand}>⚓ Anchor Library</Link><span>A place to read, focus and grow together.</span><div><Link href="/library">Library</Link><Link href="/study-rooms">Study rooms</Link><Link href="/privacy">Privacy & community</Link></div></footer>
  </div>
}
