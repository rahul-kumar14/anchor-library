"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import styles from "./page.module.css"

interface DashboardClientProps {
  displayName: string
  streak: number
  readingCount: number
  completedCount: number
  totalRewardPoints: number
  achievementCount: number
  weekActivity: { weekday: string; active: boolean }[]
  nextAchievement: any
  readingProgress: any[]
  completedBooks: any[]
  readerRewards: any[]
  notifications: any[]
  greeting?: string
  activeBook?: any
  activeBookPercent?: number
  weeklySessions?: number
  achievements?: any[]
}

export default function DashboardClient({
  displayName,
  greeting,
  streak,
  readingCount,
  completedCount,
  totalRewardPoints,
  achievementCount,
  activeBook,
  activeBookPercent,
  weekActivity,
  weeklySessions,
  nextAchievement,
  readingProgress,
  completedBooks,
  readerRewards,
  achievements,
  notifications,
}: DashboardClientProps) {
  const [showFinished, setShowFinished] = useState(false)

  // Client-side local timezone detection (ensures IST / user local time, not UTC server time)
  const [greetingText, setGreetingText] = useState<string>("evening");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) {
      setGreetingText("morning");
    } else if (h < 17) {
      setGreetingText("afternoon");
    } else {
      setGreetingText("evening");
    }
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleFinishedClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowFinished(true)
    setTimeout(() => {
      scrollToSection("finished-books-section")
    }, 50)
  }

  const handleProgressClick = (e: React.MouseEvent) => {
    e.preventDefault()
    scrollToSection("progress-reading-section")
  }

  const handleRewardsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    scrollToSection("rewards-section")
  }

  const handleAchievementsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    scrollToSection("achievements-section")
  }

  return (
    <div className={styles.page}>
      <div className={styles.libraryBackdrop} aria-hidden="true" />
      <div className="container">
        
        {/* Top Header Row with Profile Greeting & Luxury Glass Quote Card */}
        <header className={styles.topHeader}>
          <div className={styles.greetingBlock}>
            <h1 className={styles.greetingTitle}>
              Good {greetingText},<br />
              <span className={styles.userNameHighlight}>{displayName}!</span>
              <span className={styles.sparkleIcon}> ✨</span>
            </h1>
            <p className={styles.greetingSubtitle}>
              &ldquo;A few pages today, a wiser you tomorrow.&rdquo;
            </p>
          </div>

          {/* Decorative Espresso Glass Quote Card with Animated Shining Star */}
          <aside className={styles.quoteCard}>
            <div className={styles.quoteContent}>
              <blockquote className={styles.quoteText}>
                &ldquo;A reader lives a thousand lives before he dies.&rdquo;
              </blockquote>
              <cite className={styles.quoteAuthor}>— George R.R. Martin</cite>
            </div>
            <div className={styles.starIllustrationWrap} aria-hidden="true">
              <svg className={styles.animatedStar} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8">
                <path d="M12 2L15 8L22 9L17 14L18 21L12 17.5L6 21L7 14L2 9L9 8L12 2Z" />
              </svg>
              <div className={styles.starGlowAura} />
            </div>
          </aside>
        </header>

        {/* 5 Aesthetic Stats Cards Row (Clicking scrolls directly to relevant sections) */}
        <section className={styles.statsRow} aria-label="Reading Statistics">
          
          {/* Card 1: Streak */}
          <div className={styles.ambientCard}>
            <div className={styles.cardTop}>
              <div className={styles.circleIconBadge}>🔥</div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.mainNumberVal}>{streak} <span className={styles.unitText}>{streak === 1 ? "day" : "days"}</span></div>
                <div className={styles.cardMiniLabel}>Reading Streak</div>
              </div>
              <span className={styles.cardChevron}>›</span>
            </div>
            <div className={styles.miniWeekDots}>
              {weekActivity.map(({ weekday, active }: any, idx: number) => (
                <div key={idx} className={styles.miniDotCol}>
                  <i className={active ? styles.miniDotActive : styles.miniDotInactive} />
                  <span>{weekday}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Books in Progress (Scrolls down to progress list) */}
          <button type="button" onClick={handleProgressClick} className={`${styles.ambientCard} ${styles.clickableCard}`}>
            <div
              className={styles.cardArtCover}
              style={{ backgroundImage: `url('/images/dashboard/dash-in-progress.jpg')` }}
              aria-hidden="true"
            />
            <div className={styles.cardArtGradient} aria-hidden="true" />
            <div className={styles.cardTop}>
              <div className={styles.circleIconBadge}>📚</div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.mainNumberVal}>{readingCount}</div>
                <div className={styles.cardMiniLabel}>Books In Progress</div>
              </div>
              <span className={styles.cardChevron}>↓</span>
            </div>
          </button>

          {/* Card 3: Books Finished (Clicking reveals and scrolls down to Finished Showcase) */}
          <button type="button" onClick={handleFinishedClick} className={`${styles.ambientCard} ${styles.clickableCard}`}>
            <div
              className={styles.cardArtCover}
              style={{ backgroundImage: `url('/images/dashboard/dash-finished.jpg')` }}
              aria-hidden="true"
            />
            <div className={styles.cardArtGradient} aria-hidden="true" />
            <div className={styles.cardTop}>
              <div className={styles.circleIconBadge}>📖</div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.mainNumberVal}>{completedCount}</div>
                <div className={styles.cardMiniLabel}>Books Finished</div>
              </div>
              <span className={styles.cardChevron}>↓</span>
            </div>
          </button>

          {/* Card 4: Room Study Points (Scrolls down to Rewards) */}
          <button type="button" onClick={handleRewardsClick} className={`${styles.ambientCard} ${styles.clickableCard}`}>
            <div
              className={styles.cardArtCover}
              style={{ backgroundImage: `url('/images/dashboard/dash-points.jpg')` }}
              aria-hidden="true"
            />
            <div className={styles.cardArtGradient} aria-hidden="true" />
            <div className={styles.cardTop}>
              <div className={styles.circleIconBadge}>⚡</div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.mainNumberVal}>{totalRewardPoints} <span className={styles.ptsGold}>pts</span></div>
                <div className={styles.cardMiniLabel}>Room Study Points</div>
              </div>
              <span className={styles.cardChevron}>↓</span>
            </div>
          </button>

          {/* Card 5: Achievements Unlocked (Scrolls to Badges) */}
          <button type="button" onClick={handleAchievementsClick} className={`${styles.ambientCard} ${styles.clickableCard}`}>
            <div
              className={styles.cardArtCover}
              style={{ backgroundImage: `url('/images/dashboard/dash-achievements.jpg')` }}
              aria-hidden="true"
            />
            <div className={styles.cardArtGradient} aria-hidden="true" />
            <div className={styles.cardTop}>
              <div className={styles.circleIconBadge}>🏆</div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.mainNumberVal}>{achievementCount}</div>
                <div className={styles.cardMiniLabel}>Achievements Unlocked</div>
              </div>
              <span className={styles.cardChevron}>↓</span>
            </div>
          </button>

        </section>

        {/* Hero Section: Continue Your Reading Journey (Deep Forest Green) & Consistency */}
        <section className={styles.journeyHeroGrid}>
          
          {/* Deep Forest Green Hero Ritual Card */}
          <div className={styles.forestHeroCard}>
            <div className={styles.forestHeroTop}>
              <div className={styles.forestBadge}>
                <span className={styles.compassIcon}>🧭</span>
                <span>Continue Your Reading Journey</span>
              </div>
              <span className={styles.heroStreakPill}>
                🌿 {streak} day streak ›
              </span>
            </div>

            <div className={styles.forestHeroBody}>
              {activeBook?.books?.cover_url ? (
                <div className={styles.heroBookCoverWrap}>
                  <img src={activeBook.books.cover_url} alt={activeBook.books.title} className={styles.heroBookCover} />
                </div>
              ) : (
                <div className={styles.heroBookCoverPlaceholder}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fef08a" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
              )}

              <div className={styles.heroBookDetails}>
                <span className={styles.heroKicker}>
                  {activeBook ? `🔥 CURRENTLY AT ${activeBookPercent}% — FINISH JALDI & EARN REWARDS!` : 'YOUR CURRENT READ'}
                </span>
                <h2 className={styles.heroBookTitle}>
                  {activeBook ? activeBook.books?.title : "Select a book from the library"}
                </h2>

                {activeBook && (
                  <div className={styles.heroProgressBarWrap}>
                    <div className={styles.heroProgressTrack}>
                      <div className={styles.heroProgressFill} style={{ width: `${activeBookPercent}%` }} />
                    </div>
                    <span className={styles.heroPercentText}>{activeBookPercent}%</span>
                  </div>
                )}

                <div className={styles.heroMetaRow}>
                  <span className={styles.heroMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Last read: Today</span>
                  </span>
                  <span className={styles.heroMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 14 10" />
                    </svg>
                    <span>Estimated time left: ~{Math.max(1, Math.round(((activeBook?.total_pages || 100) - (activeBook?.current_page || 0)) * 1.5 / 60))} hours</span>
                  </span>
                </div>

                <div className={styles.heroActionsRow}>
                  {activeBook ? (
                    <Link href={`/study-rooms/reading?book=${activeBook.book_id}`} className={styles.heroResumeBtn}>
                      <span>Resume reading in room</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  ) : (
                    <Link href="/library" className={styles.heroResumeBtn}>
                      <span>Explore Library</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  )}
                  <Link href="/study-rooms/pomodoro?minutes=25" className={styles.heroFocusBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Start 25 min focus</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* This Week Consistency Card */}
          <div className={styles.consistencyCard}>
            <div className={styles.consistencyHeader}>
              <div className={styles.calIcon}>📅</div>
              <span className={styles.consistencyTitle}>This Week Consistency</span>
            </div>

            <div className={styles.consistencyDaysRow}>
              {weekActivity.map(({ weekday, active }, index) => (
                <div key={index} className={styles.consistencyDayCol}>
                  <span className={styles.dayChar}>{weekday}</span>
                  <i className={active ? styles.consistencyDotActive : styles.consistencyDotInactive} />
                </div>
              ))}
            </div>

            <div className={styles.consistencySummary}>
              <p className={styles.consistencyBold}>
                <strong>{weeklySessions}</strong> reading day{weeklySessions === 1 ? "" : "s"} this week
              </p>
              <p className={styles.consistencyHint}>
                {weeklySessions ? "Great consistency! Small daily sessions accumulate into mastery." : "Your first session starts the chain."}
              </p>
            </div>
          </div>

        </section>

        {/* Main Content 2-Column Grid */}
        <div className={styles.mainContentLayout}>
          
          {/* Left Column: Continue Reading List + (Conditional on-click) Finished Books Showcase */}
          <div className={styles.leftCol}>
            
            {/* Continue Reading List */}
            <section id="progress-reading-section" className={styles.panelBox}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleWrap}>
                  <span className={styles.panelIcon}>📖</span>
                  <h2 className={styles.panelTitle}>Books In Progress</h2>
                  <span className={styles.counterBadge}>{readingCount} Active</span>
                </div>
                <Link href="/library" className={styles.panelLink}>
                  <span>Browse Library</span>
                  <span>›</span>
                </Link>
              </div>

              {readingProgress && readingProgress.length > 0 ? (
                <div className={styles.progressScrollContainer}>
                  <div className={styles.bookProgressList}>
                    {[...readingProgress]
                      .sort((a: any, b: any) => {
                        const pctA = Math.round(((a.current_page || 0) / (a.total_pages || 100)) * 100)
                        const pctB = Math.round(((b.current_page || 0) / (b.total_pages || 100)) * 100)
                        return pctB - pctA
                      })
                      .map((item: any) => {
                        const percent = Math.min(100, Math.round((item.current_page / (item.total_pages || 1)) * 100))
                        return (
                          <Link key={item.id} href={`/study-rooms/reading?book=${item.book_id || item.books?.id}`} className={styles.bookRowItem} title="Open in Study Room">
                            <div className={styles.bookRowCoverWrap}>
                              {item.books?.cover_url ? (
                                <img src={item.books.cover_url} alt={item.books.title} className={styles.bookRowCover} />
                              ) : (
                                <div className={styles.bookRowCoverPlaceholder}>📖</div>
                              )}
                            </div>
                            <div className={styles.bookRowContent}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                <h3 className={styles.bookRowTitle}>{item.books?.title}</h3>
                                <span style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: percent >= 50 ? "#10b981" : "#f59e0b",
                                  background: percent >= 50 ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  border: `1px solid ${percent >= 50 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                                  whiteSpace: "nowrap"
                                }}>
                                  {percent}% Done
                                </span>
                              </div>
                              <div className={styles.bookRowBarWrap}>
                                <div className={styles.bookRowTrack}>
                                  <div className={styles.bookRowFill} style={{ width: `${percent}%`, background: percent >= 50 ? "linear-gradient(90deg, #f59e0b, #10b981)" : "#f59e0b" }} />
                                </div>
                                <span className={styles.bookRowPercent} style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                                  Page {item.current_page} of {item.total_pages || "?"}
                                </span>
                              </div>
                            </div>
                            <span className={styles.rowChevron}>›</span>
                          </Link>
                        )
                      })}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyBookList}>
                  <p>No books currently in progress. Start reading from the library!</p>
                  <Link href="/library" className={styles.simpleButton}>Browse Library</Link>
                </div>
              )}
            </section>

            {/* Finished Books Showcase Section (Revealed when user clicks 'Books Finished' card) */}
            {showFinished && (
              <section id="finished-books-section" className={`${styles.panelBox} ${styles.fadeInBox}`}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitleWrap}>
                    <span className={styles.panelIcon}>🎓</span>
                    <h2 className={styles.panelTitle}>Finished Books & Mastery</h2>
                    <span className={styles.counterBadge}>{completedCount} Finished</span>
                  </div>
                  <button type="button" onClick={() => setShowFinished(false)} className={styles.closePanelBtn}>
                    <span>Hide</span>
                    <span>×</span>
                  </button>
                </div>

                {completedBooks && completedBooks.length > 0 ? (
                  <div className={styles.finishedBooksGrid}>
                    {completedBooks.map((item: any) => (
                      <Link key={item.id} href={`/library/${item.books?.id || item.book_id}`} className={styles.finishedBookCard}>
                        <div className={styles.finishedCoverWrap}>
                          {item.books?.cover_url ? (
                            <img src={item.books.cover_url} alt={item.books.title} className={styles.finishedCover} />
                          ) : (
                            <div className={styles.finishedPlaceholder}>📖</div>
                          )}
                          <span className={styles.completedRibbon}>✓ Finished</span>
                        </div>
                        <div className={styles.finishedBookInfo}>
                          <h4 className={styles.finishedTitle}>{item.books?.title}</h4>
                          <p className={styles.finishedAuthor}>{item.books?.author || "Author Unknown"}</p>
                          <span className={styles.finishedPages}>{item.total_pages || item.current_page} pages completed</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyFinishedBox}>
                    <span style={{ fontSize: "2rem" }}>📚</span>
                    <p>You haven&apos;t finished a book yet. Complete all sections of a book inside a study room to earn achievements!</p>
                    <Link href="/library" className={styles.simpleButton}>Start Reading</Link>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right Column: Room Reading Rewards & Achievements */}
          <div className={styles.rightCol}>
            
            {/* Room Reading Rewards Card */}
            <section id="rewards-section" className={styles.panelBox}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleWrap}>
                  <span className={styles.panelIcon}>⚡</span>
                  <h2 className={styles.panelTitle}>Room Reading Rewards</h2>
                </div>
                <span className={styles.pointsPillTag}>{totalRewardPoints} PTS</span>
              </div>

              {readerRewards && readerRewards.length > 0 ? (
                <div className={styles.rewardsListScroll}>
                  {readerRewards.slice(0, 5).map((r: any) => (
                    <div key={r.id} className={styles.rewardEntry}>
                      <div className={styles.rewardTargetIcon}>
                        {r.section_number === 6 ? "👑" : "🎯"}
                      </div>
                      <div className={styles.rewardEntryDetails}>
                        <strong>{r.section_number === 6 ? "Book Completed!" : `Section ${r.section_number} Milestone`}</strong>
                        <span>{r.books?.title || `Target: ${r.target_pages} pages`}</span>
                      </div>
                      <span className={styles.ptsGainBadge}>+{r.points} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyRewardOffer}>
                  <div className={styles.dartboardIcon}>🎯</div>
                  <p className={styles.emptyRewardMsg}>
                    Study inside any <strong>Study Room</strong> to earn <strong>+20 pts</strong> per reading section and <strong>+100 pts</strong> on book completion!
                  </p>
                  <Link href="/study-rooms" className={styles.joinRoomActionBtn}>
                    <span>Join a Study Room</span>
                    <span>→</span>
                  </Link>
                </div>
              )}
            </section>

            {/* Achievements & Badges */}
            <section id="achievements-section" className={styles.panelBox}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleWrap}>
                  <span className={styles.panelIcon}>🏆</span>
                  <h2 className={styles.panelTitle}>Achievements & Badges</h2>
                </div>
              </div>

              {/* Up Next Milestone */}
              <div className={styles.upNextBanner}>
                <div className={styles.upNextIconWrap}>{nextAchievement.icon}</div>
                <div className={styles.upNextText}>
                  <span className={styles.upNextEyebrow}>UP NEXT MILESTONE</span>
                  <h4 className={styles.upNextTitle}>{nextAchievement.title}</h4>
                  <p className={styles.upNextDesc}>{nextAchievement.description}</p>
                </div>
                <div className={styles.upNextProgressArea}>
                  <div className={styles.progressFraction}>
                    <strong>{nextAchievement.current}</strong> / {nextAchievement.target}
                  </div>
                  <div className={styles.upNextTrack}>
                    <div
                      className={styles.upNextFill}
                      style={{ width: `${Math.min(100, (nextAchievement.current / nextAchievement.target) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Badges Grid (Accurately reflecting completedCount) */}
              <div className={styles.badgesDisplayGrid}>
                {/* Badge 1: Novice Reader (20+ pts) */}
                <div className={`${styles.badgeCard} ${totalRewardPoints >= 20 ? styles.badgeActive : styles.badgeMuted}`}>
                  <span className={styles.badgeEmoji}>🌱</span>
                  <span className={styles.badgeName}>Novice Reader</span>
                  <span className={styles.badgePointsReq}>{totalRewardPoints >= 20 ? "Unlocked" : "20+ pts"}</span>
                </div>

                {/* Badge 2: Dedicated Scholar (100+ pts) */}
                <div className={`${styles.badgeCard} ${totalRewardPoints >= 100 ? styles.badgeActive : styles.badgeMuted}`}>
                  <span className={styles.badgeEmoji}>🎖️</span>
                  <span className={styles.badgeName}>Dedicated Scholar</span>
                  <span className={styles.badgePointsReq}>{totalRewardPoints >= 100 ? "Unlocked" : "100+ pts"}</span>
                </div>

                {/* Badge 3: Finisher (Reflects true finished book count) */}
                <div className={`${styles.badgeCard} ${completedCount > 0 ? styles.badgeActive : styles.badgeMuted}`}>
                  <span className={styles.badgeEmoji}>👑</span>
                  <span className={styles.badgeName}>Finisher</span>
                  <span className={styles.badgePointsReq}>
                    {completedCount > 0 ? `${completedCount} ${completedCount === 1 ? "Book" : "Books"} Done` : "Finish 1 Book"}
                  </span>
                </div>

                {achievements?.map((a: any) => (
                  <div key={a.id} className={`${styles.badgeCard} ${styles.badgeActive}`} title={a.description}>
                    <span className={styles.badgeEmoji}>{a.icon ?? "🌟"}</span>
                    <span className={styles.badgeName}>{a.title || a.type?.replace(/_/g, " ") || "Milestone"}</span>
                    <span className={styles.badgePointsReq}>Unlocked</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Notifications */}
            {notifications && notifications.length > 0 && (
              <section className={styles.panelBox}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitleWrap}>
                    <span className={styles.panelIcon}>🔔</span>
                    <h2 className={styles.panelTitle}>Notifications</h2>
                  </div>
                </div>
                <div className={styles.notifStack}>
                  {notifications.map((n: any) => (
                    <div key={n.id} className={styles.notifCard}>
                      <div className={styles.notifHeading}>{n.payload?.title || "Study update"}</div>
                      <div className={styles.notifSnippet}>{n.payload?.body || "Open your inbox for details."}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
