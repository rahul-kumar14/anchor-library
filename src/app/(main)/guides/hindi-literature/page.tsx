import type { Metadata } from "next"
import Link from "next/link"
import styles from "../guide.module.css"

export const metadata: Metadata = {
  title: "Hindi Literature Online Reading — Read Premchand, Manav Kaul & Classics",
  description:
    "Read Hindi literature online for free at Anchor Library. Explore classic Hindi novels, stories, and poetry by Munshi Premchand, Manav Kaul, Arvind Gupta and more.",
  keywords: [
    "hindi literature online reading",
    "read hindi books online free",
    "munshi premchand books pdf",
    "hindi kahaniya online",
    "manav kaul tumhare baare mein",
    "hindi novels online",
  ],
}

export default function HindiLiteratureGuide() {
  return (
    <article className={styles.guideContainer}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/library">Library</Link>
        <span>/</span>
        <span>Hindi Literature</span>
      </nav>

      <span className={styles.badge}>Hindi Books &amp; Stories</span>
      <h1 className={styles.title}>Hindi Literature Online Reading: Timeless Classics &amp; Modern Prose</h1>
      <p className={styles.lead}>
        Experience the depth and richness of Hindi literature. Read complete books online, take personal highlights, and join dedicated quiet reading rooms with readers across the world.
      </p>

      <section className={styles.articleSection}>
        <h2>Discover the Magic of Hindi Literature Online</h2>
        <p>
          Hindi literature has one of the world's richest traditions of storytelling, philosophy, and cultural resonance. From the rural empathy and social realities depicted by <strong>Munshi Premchand</strong> to the introspective modern prose of <strong>Manav Kaul</strong>, Anchor Library preserves and presents these works in a clean, legible reader format.
        </p>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <span className={styles.cardIcon}>📖</span>
            <h3>Munshi Premchand Classics</h3>
            <p>Read masterpieces like <em>Godaan</em>, <em>Kafan</em>, <em>Nirmala</em>, and <em>Idgah</em> directly in your browser.</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.cardIcon}>🎭</span>
            <h3>Modern Hindi Writing</h3>
            <p>Explore thought-provoking contemporary works including <em>तुम्हारे बारे में</em> by Manav Kaul.</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.cardIcon}>🌱</span>
            <h3>Children &amp; Science Stories</h3>
            <p>Educational and inspirational children's literature curated from Arvind Gupta's public repository.</p>
          </div>
        </div>
      </section>

      <section className={styles.articleSection}>
        <h2>Why Read on Anchor Library?</h2>
        <p>
          Most online PDF repositories are cluttered with intrusive ads, broken popups, and cumbersome download barriers. Anchor Library changes this by providing:
        </p>
        <ul>
          <li><strong>Distraction-Free Web Reader:</strong> High-resolution flip and scroll reader optimized for desktop and mobile screens.</li>
          <li><strong>Virtual Reading Rooms:</strong> Join the <em>Hindi Literature &amp; Books Room</em> to read alongside other book enthusiasts.</li>
          <li><strong>Private Notes:</strong> Keep personal chapter summaries and reflections saved to your profile.</li>
        </ul>
      </section>

      <section className={styles.articleSection}>
        <h2>Popular Hindi Authors on Anchor Library</h2>
        <p>
          Our catalog includes curated selections from prominent Hindi authors:
        </p>
        <p>
          • <strong>Munshi Premchand:</strong> Pioneer of modern Hindi and Urdu social fiction.<br />
          • <strong>Manav Kaul:</strong> Acclaimed playwright, director, and author exploring solitude, love, and cities.<br />
          • <strong>Arvind Gupta:</strong> Pioneering educator sharing science, folktales, and inspirational stories for curious minds.
        </p>
      </section>

      <div className={styles.ctaBox}>
        <h3>Start reading Hindi books now</h3>
        <p>Browse our catalog of verified Hindi literature titles with zero subscription or ad interference.</p>
        <Link href="/library" className={styles.ctaButton}>
          Browse Hindi Books in Library ↗
        </Link>
      </div>
    </article>
  )
}

