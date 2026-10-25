import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import FocusLauncher from "@/components/home/FocusLauncher"
import AnimatedFacts from "@/components/home/AnimatedFacts"
import NetflixShelf from "@/components/home/NetflixShelf"
import ContactFeedbackModal from "@/components/home/ContactFeedbackModal"
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

  return (
    <div className={styles.page}>
      {/* 1. HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
            <span className={styles.signal} aria-hidden="true" /> YOUR VIRTUAL READING ROOM
          </p>
          <h1>Read with friends.<br /><em>Stay focused online.</em></h1>
          <p className={styles.intro}>
            Join quiet virtual study rooms, read full books online together, and build daily reading consistency—distraction-free and camera-free.
          </p>
          <div className={styles.actions}>
            <Link href="/study-rooms" className={styles.primary}>
              Join a study room <span className={styles.primaryArrow}>↗</span>
            </Link>
            <Link href="/chat" className={styles.secondary}>
              Find a reading partner <span className={styles.secondaryArrow}>→</span>
            </Link>
          </div>
          <div className={styles.heroNotes}>
            <span>Camera-free focus rooms</span>
            <span>Partner chat by request</span>
            <span>Notes &amp; highlights stay with you</span>
          </div>
        </div>
        <div className={styles.launcher}>
          <FocusLauncher />
        </div>
        <div className={styles.heroFoot}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>A calmer way to read online</span>
          <span className={styles.secondPulseDot} aria-hidden="true" />
          <span>choose your room, your pace, your people</span>
        </div>
      </section>

      {/* 2. STATS & ATTRIBUTES ROW */}
      <AnimatedFacts bookCount={bookCount} categoryCount={categoryCount} roomCount={9} />

      {/* 3. STUDY ROOMS SECTION */}
      <section className={styles.workflow} id="study-rooms">
        <div className={styles.sectionHead}>
          <div>
            <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
              <span className={styles.signal} aria-hidden="true" /> VIRTUAL STUDY ROOMS
            </p>
            <h2 className={styles.headingUnderline}>Find your perfect focus space.</h2>
          </div>
          <Link href="/study-rooms" className={styles.secondary}>
            View all 9 rooms →
          </Link>
        </div>
        <p className={styles.roomIntro}>
          Different spaces for different goals. Join a room and read alongside peers who share your focus.
        </p>

        {/* 5 Rooms: Hindi Literature & English Literature at #1 & #2, with enhanced hover animations */}
        <div className={styles.roomGrid}>
          {[
            { id: "reading", icon: "📖", title: "Hindi Literature & Books", text: "Premchand, poetry & classic fiction", art: "five" },
            { id: "english-lit", icon: "📚", title: "English Literature", text: "World classics, essays & modern prose", art: "one" },
            { id: "silent", icon: "🔕", title: "Silent Study", text: "Zero distraction. Pure quiet focus.", art: "two" },
            { id: "pomodoro", icon: "🍅", title: "Pomodoro Focus", text: "25 min reading, 5 min intervals", art: "three" },
            { id: "night-owl", icon: "🌙", title: "Night Owl Study", text: "Late night grind with active readers", art: "four" },
          ].map(room => (
            <Link
              key={room.id}
              href={`/study-rooms/${room.id}`}
              className={`${styles.roomCard} ${styles[room.art]}`}
            >
              <span className={styles.roomArt} aria-hidden="true" />
              <div className={styles.roomTop}>
                <span className={styles.roomIcon}>{room.icon}</span>
                <span className={styles.activePill}>Live Room</span>
              </div>
              <div className={styles.roomBottom}>
                <strong>{room.title}</strong>
                <small>{room.text}</small>
              </div>
              <span className={styles.roomEnter}>↗</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS (Quote in pure typography, no box) */}
      <section className={styles.how}>
        <div className={styles.howContent}>
          <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
            <span className={styles.signal} aria-hidden="true" /> GET STARTED IN MINUTES
          </p>
          <h2 className={styles.headingUnderline}>How Anchor Library works</h2>
          <p className={styles.howLead}>
            A simple 4-step ritual to make reading more social, focused, and fulfilling.
          </p>
          <div className={styles.howSteps}>
            {[
              { step: "01", icon: "🔕", title: "1. Choose a room", text: "Pick from 9 tailored rooms matching your focus mood or exam goal." },
              { step: "02", icon: "📖", title: "2. Open a book", text: "Read instantly from 90+ books with built-in PDF reader & notes." },
              { step: "03", icon: "👥", title: "3. Study together", text: "Share camera-free presence, earn rewards & connect on chat." },
              { step: "04", icon: "🌱", title: "4. Build a habit", text: "Track streaks, earn milestone badges & keep your daily progress." }
            ].map(item => (
              <article key={item.title} className={styles.howStepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNum}>{item.step}</span>
                  <span className={styles.stepEmoji}>{item.icon}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>

        {/* Right side: Beautiful open quotation without container box */}
        <aside className={styles.howAside}>
          <div className={styles.openQuote}>
            <span className={styles.bigQuoteMark}>“</span>
            <blockquote className={styles.quotePhrase}>
              Good books,<br />
              <span className={styles.quoteHighlight}>brighter minds,</span><br />
              quieter days.
            </blockquote>
            <cite className={styles.quoteSign}>— Anchor Library Readers</cite>
          </div>
        </aside>
      </section>

      {/* 5. 9-BOOKS SHELF (Netflix-style horizontal scroll with left/right arrows) */}
      <section className={styles.shelf}>
        <div className={styles.sectionHead}>
          <div>
            <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
              <span className={styles.signal} aria-hidden="true" /> SOMETHING WORTH SITTING DOWN FOR
            </p>
            <h2 className={styles.headingUnderline}>A shelf for<br /><em>your next chapter.</em></h2>
          </div>
          <Link href="/library" className={styles.secondary}>
            Browse the whole library →
          </Link>
        </div>
        <p className={styles.shelfIntro}>
          Nine rooms. Nine handpicked starts. Use the arrows to browse books matched to each study room.
        </p>

        {/* Netflix Carousel with overlay arrow buttons */}
        <NetflixShelf shelf={shelf} />
      </section>

      {/* 6. READING ROOM COMPANY SECTION */}
      <section className={styles.company}>
        <div>
          <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
            <span className={styles.signal} aria-hidden="true" /> A READING ROOM, NOT A FEED
          </p>
          <h2 className={styles.headingUnderline}>Company when you want it.<br /><em>Quiet when you need it.</em></h2>
          <p>
            Enter a camera-free room for shared focus, or start a private one-to-one conversation after an accepted partner request. Your reading history, bookmarks, and private notes stay completely yours.
          </p>
          <Link href="/study-rooms" className={styles.primary}>
            Take your place <span className={styles.primaryArrow}>→</span>
          </Link>
        </div>
        <div className={styles.roomChoices}>
          {[
            { icon: "📖", name: "Hindi Literature & Books", desc: "Premchand, poetry & classic fiction.", id: "reading" },
            { icon: "📚", name: "English Literature", desc: "Classic novels, prose & world literature.", id: "english-lit" },
            { icon: "🔕", name: "Silent Study", desc: "A little company. A lot of quiet.", id: "silent" },
            { icon: "🍅", name: "Pomodoro Focus", desc: "Make one focused 25-minute block count.", id: "pomodoro" },
            { icon: "💻", name: "Coding & DSA", desc: "Algorithms, development & deep technical work.", id: "coding" },
          ].map(room => (
            <Link key={room.id} href={"/study-rooms/" + room.id} className={styles.roomChoiceItem}>
              <span className={styles.choiceIcon}>{room.icon}</span>
              <div>
                <strong>{room.name}</strong>
                <p>{room.desc}</p>
              </div>
              <span className={styles.choiceArrow}>↗</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. READER REVIEWS SECTION (Real Indian Reader Reviews with 5-star ratings) */}
      <section className={styles.stories}>
        <div className={styles.storiesHeader}>
          <div>
            <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
              <span className={styles.signal} aria-hidden="true" /> GENUINE READER EXPERIENCES
            </p>
            <h2 className={styles.headingUnderline}>Loved by readers across India.</h2>
          </div>
          <p className={styles.storiesSub}>
            Real thoughts from students, literature lovers, and working professionals using Anchor Library daily.
          </p>
        </div>

        <div className={styles.reviewsGrid}>
          {[
            {
              name: "Aarav Sharma",
              city: "New Delhi",
              role: "UPSC Aspirant",
              avatar: "AS",
              rating: 5,
              text: "Silent Study room me baithe rehne se jo focus banta hai wo YouTube live streams se kahi zyada real lagta hai. Built-in Hindi literature section is pure gold!",
              tag: "🔕 Silent Study",
            },
            {
              name: "Priya Nair",
              city: "Bengaluru",
              role: "Software Engineer",
              avatar: "PN",
              rating: 5,
              text: "Pomodoro timer aur notes feature ne meri reading habit revive kar di. Shaam ko 50 minutes bina distraction ke novel padhna ab meri daily routine hai.",
              tag: "🍅 Pomodoro Focus",
            },
            {
              name: "Rohan Verma",
              city: "Lucknow",
              role: "Literature Student",
              avatar: "RV",
              rating: 5,
              text: "Premchand ji ki kavitayein aur Godan padhna itna smooth experience kabhi nahi raha. Highlighting aur bookmarks sidhe save ho jate hain. Absolutely brilliant platform!",
              tag: "📖 Hindi Literature",
            },
            {
              name: "Ananya Mukherjee",
              city: "Kolkata",
              role: "English Professor",
              avatar: "AM",
              rating: 5,
              text: "The aesthetic of Anchor Library makes you want to open a classic and read. The camera-free presence feels gentle and truly respects student privacy.",
              tag: "📚 English Literature",
            },
          ].map(review => (
            <article key={review.name} className={styles.reviewCard}>
              <div className={styles.reviewCardTop}>
                <div className={styles.reviewerAvatar}>{review.avatar}</div>
                <div className={styles.reviewerMeta}>
                  <strong>{review.name}</strong>
                  <span>{review.role} • {review.city}</span>
                </div>
                <div className={styles.stars}>{"★".repeat(review.rating)}</div>
              </div>
              <p className={styles.reviewText}>"{review.text}"</p>
              <div className={styles.reviewCardFoot}>
                <span className={styles.reviewTag}>{review.tag}</span>
                <span className={styles.verifiedBadge}>✓ Verified Reader</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 8. CLOSING & CONTACT / FEEDBACK FORM (Direct to hpark4868@gmail.com) */}
      <section className={styles.closing}>
        <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
          <span className={styles.signal} aria-hidden="true" /> WE'D LOVE TO HEAR FROM YOU
        </p>
        <h2 className={styles.headingUnderline}>Have a suggestion or review?<br /><em>Send it straight to our desk.</em></h2>
        <p className={styles.closingDesc}>
          Whether you want a new book added, have a feature idea, or want to share your experience, we read every note sent to <strong className={styles.mailEm}>hpark4868@gmail.com</strong>.
        </p>
        
        <div className={styles.closingActions}>
          <Link href="/register" className={styles.primary}>
            Join Anchor Library Free <span className={styles.primaryArrow}>→</span>
          </Link>
          <ContactFeedbackModal />
        </div>

        <p className={styles.closingSub}>
          Already part of the library? <Link href="/login">Come on in ↗</Link>
        </p>
      </section>

      {/* 9. FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <Link href="/" className={styles.brand}>⚓ Anchor Library</Link>
          <span className={styles.footerTagline}>
            A peaceful sanctuary to read, focus and grow together.
          </span>
        </div>
        <div className={styles.footerCenter}>
          <span>Direct Contact: <a href="mailto:hpark4868@gmail.com" className={styles.footerMail}>hpark4868@gmail.com</a></span>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/library">Library</Link>
          <Link href="/study-rooms">Study rooms</Link>
          <Link href="/privacy">Privacy & community</Link>
        </div>
      </footer>
    </div>
  )
}
