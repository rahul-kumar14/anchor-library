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
  const [{ data: { user } }, { count: bookCount }, { count: categoryCount, data: categories }, { data: books }] = await Promise.all([
    supabase.auth.getUser(),
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

      {/* 3. STUDY ROOMS SECTION - Individual Visual Identities with Dedicated Atmospheric Library Images */}
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
          Different spaces for different goals. Each room carries its own unique atmosphere, focus rules, and active reading community.
        </p>

        {/* 5 Rooms with dedicated library imagery, distinct color moods, and subtle faded background layers */}
        <div className={styles.roomGrid}>
          {[
            {
              id: "reading",
              icon: "📖",
              title: "Hindi Literature & Books",
              text: "Premchand, poetry & classic fiction",
              mood: "roomHindi",
              image: "/images/landing/room-hindi-lit.jpg",
              badge: "Heritage Room",
              badgeColor: "#f59e0b",
            },
            {
              id: "english-lit",
              icon: "📚",
              title: "English Literature",
              text: "World classics, essays & modern prose",
              mood: "roomEnglish",
              image: "/images/landing/room-english-lit.jpg",
              badge: "Classics Room",
              badgeColor: "#10b981",
            },
            {
              id: "silent",
              icon: "🔕",
              title: "Silent Study",
              text: "Zero distraction. Pure quiet focus.",
              mood: "roomSilent",
              image: "/images/landing/room-silent-study.jpg",
              badge: "Deep Silence",
              badgeColor: "#818cf8",
            },
            {
              id: "pomodoro",
              icon: "🍅",
              title: "Pomodoro Focus",
              text: "25 min reading, 5 min intervals",
              mood: "roomPomodoro",
              image: "/images/landing/room-pomodoro-focus.jpg",
              badge: "Timed Interval",
              badgeColor: "#f87171",
            },
            {
              id: "night-owl",
              icon: "🌙",
              title: "Night Owl Study",
              text: "Late night grind with active readers",
              mood: "roomNightOwl",
              image: "/images/landing/room-night-owl.jpg",
              badge: "After Hours",
              badgeColor: "#a78bfa",
            },
          ].map(room => (
            <Link
              key={room.id}
              href={`/study-rooms/${room.id}`}
              className={`${styles.roomCard} ${styles[room.mood]}`}
            >
              {/* Dedicated Library Photo Background with cinematic dark gradient overlay */}
              <div
                className={styles.roomArtCover}
                style={{ backgroundImage: `url("${room.image}")` }}
                aria-hidden="true"
              />
              <div className={styles.roomArtGradient} aria-hidden="true" />
              
              <div className={styles.roomTop}>
                <span className={styles.roomIconWrap}>{room.icon}</span>
                <span
                  className={styles.roomMoodPill}
                  style={{ borderColor: room.badgeColor, color: room.badgeColor }}
                >
                  {room.badge}
                </span>
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

      {/* 6. PARTNER & STUDY ROOM EXPERIENCE (Interactive Visual Showcase) */}
      <section className={styles.company}>
        <div className={styles.companyCopy}>
          <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
            <span className={styles.signal} aria-hidden="true" /> A READING ROOM, NOT A FEED
          </p>
          <h2 className={styles.headingUnderline}>Company when you want it.<br /><em>Quiet when you need it.</em></h2>
          <p className={styles.companyIntro}>
            Reading alone often ends in scrolling. In Anchor Library, you see silent comrades reading beside you. Whenever you want discussion, send a gentle partner request for private 1-on-1 book notes exchange.
          </p>
          <div className={styles.partnerFeatureList}>
            <div className={styles.partnerFeatureItem}>
              <span className={styles.featIcon}>🔒</span>
              <div>
                <strong>Zero Camera Intrusions</strong>
                <span>Preserve your complete comfort and privacy without pressure.</span>
              </div>
            </div>
            <div className={styles.partnerFeatureItem}>
              <span className={styles.featIcon}>🤝</span>
              <div>
                <strong>Mutual Partner Requests</strong>
                <span>1-on-1 chats require approval from both readers before initiating.</span>
              </div>
            </div>
            <div className={styles.partnerFeatureItem}>
              <span className={styles.featIcon}>📝</span>
              <div>
                <strong>Synchronized Book Discussions</strong>
                <span>Discuss chapters, share quotes, and debate perspectives in real-time.</span>
              </div>
            </div>
          </div>
          <div className={styles.partnerActionRow}>
            <Link href="/chat" className={styles.primary}>
              Find a reading partner <span className={styles.primaryArrow}>→</span>
            </Link>
            <Link href="/study-rooms" className={styles.secondary}>
              Explore virtual rooms ↗
            </Link>
          </div>
        </div>

        {/* Visual Mockup Demonstration: 1-on-1 Partner Reading Session */}
        <div className={styles.partnerShowcaseWrap}>
          <div className={styles.partnerLiveCard}>
            <div className={styles.liveCardHeader}>
              <div className={styles.partnerUser}>
                <div className={styles.partnerAvatarBadge}>📖</div>
                <div>
                  <strong>Silent Study Room</strong>
                  <span className={styles.sessionCount}>• 4 readers active now</span>
                </div>
              </div>
              <span className={styles.matchedBadge}>Partner Session Active</span>
            </div>

            {/* Chat Demonstration between two readers */}
            <div className={styles.demoChatViewport}>
              <div className={styles.demoChatBubblePeer}>
                <div className={styles.peerAvatar}>A</div>
                <div className={styles.bubbleContent}>
                  <span className={styles.senderName}>Aarav (UPSC Aspirant)</span>
                  <p>Just finished Chapter 3 of <em>The Psychology of Money</em>. That compounding analogy on page 42 is unbelievable!</p>
                  <span className={styles.msgTime}>20:42</span>
                </div>
              </div>

              <div className={styles.demoChatBubbleYou}>
                <div className={styles.bubbleContentYou}>
                  <p>Same here! I highlighted the entire paragraph about staying wealthy vs getting wealthy. Makes total sense.</p>
                  <span className={styles.msgTimeYou}>20:44 • Read</span>
                </div>
              </div>

              <div className={styles.demoQuoteShare}>
                <span className={styles.shareIcon}>📌 Shared Highlight</span>
                <p>“Planning is good, but the most important part of every plan is to plan on the plan not going according to plan.”</p>
                <small>— Page 68 • Notes saved to your library</small>
              </div>
            </div>

            <div className={styles.liveCardFoot}>
              <span className={styles.syncStatus}>✨ Reading together in real-time</span>
              <Link href="/chat" className={styles.cardChatBtn}>
                Say hello →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. READER REVIEWS SECTION (Honest Community Voices without fake verification claims) */}
      <section className={styles.stories}>
        <div className={styles.storiesHeader}>
          <div>
            <p className={`${styles.eyebrow} ${styles.animatedEyebrow}`}>
              <span className={styles.signal} aria-hidden="true" /> COMMUNITY VOICES
            </p>
            <h2 className={styles.headingUnderline}>Thoughts from our reading circle.</h2>
          </div>
          <p className={styles.storiesSub}>
            Real experiences from students, literature enthusiasts, and daily readers using Anchor Library.
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
              roomFocus: "Silent Study Room",
            },
            {
              name: "Priya Nair",
              city: "Bengaluru",
              role: "Software Engineer",
              avatar: "PN",
              rating: 5,
              text: "Pomodoro timer aur notes feature ne meri reading habit revive kar di. Shaam ko 50 minutes bina distraction ke novel padhna ab meri daily routine hai.",
              roomFocus: "Pomodoro Focus Room",
            },
            {
              name: "Rohan Verma",
              city: "Lucknow",
              role: "Literature Student",
              avatar: "RV",
              rating: 5,
              text: "Premchand ji ki kavitayein aur Godan padhna itna smooth experience kabhi nahi raha. Highlighting aur bookmarks sidhe save ho jate hain. Absolutely brilliant platform!",
              roomFocus: "Hindi Literature Room",
            },
            {
              name: "Ananya Mukherjee",
              city: "Kolkata",
              role: "English Literature Reader",
              avatar: "AM",
              rating: 5,
              text: "The aesthetic of Anchor Library makes you want to open a classic and read. The camera-free presence feels gentle and truly respects reader comfort.",
              roomFocus: "English Literature Room",
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
                <span className={styles.reviewTag}>{review.roomFocus}</span>
                <span className={styles.communityMemberBadge}>Active Reader</span>
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
          {!user && (
            <Link href="/register" className={styles.primary}>
              Join Anchor Library Free <span className={styles.primaryArrow}>→</span>
            </Link>
          )}
          <ContactFeedbackModal userEmail={user?.email} />
        </div>

        {!user && (
          <p className={styles.closingSub}>
            Already part of the library? <Link href="/login">Come on in ↗</Link>
          </p>
        )}
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
