"use client"

import { useEffect, useState, useRef } from "react"
import styles from "./AnimatedFacts.module.css"

interface AnimatedFactsProps {
  bookCount: number | null
  categoryCount: number | null
  roomCount?: number
}

function useCounter(target: number, duration: number = 1800, startImmediately: boolean = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!startImmediately || target <= 0) return
    let startTimestamp: number | null = null
    let frameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeProgress * target))

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step)
      } else {
        setCount(target)
      }
    }

    frameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frameId)
  }, [target, duration, startImmediately])

  return count
}

export default function AnimatedFacts({
  bookCount,
  categoryCount,
  roomCount = 9,
}: AnimatedFactsProps) {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const targetBooks = bookCount && bookCount > 0 ? bookCount : 90
  const targetCategories = categoryCount && categoryCount > 0 ? categoryCount : 15
  const targetRooms = roomCount

  const animatedBooks = useCounter(targetBooks, 1800, visible)
  const animatedCategories = useCounter(targetCategories, 1500, visible)
  const animatedRooms = useCounter(targetRooms, 1200, visible)

  return (
    <div ref={containerRef} className={styles.factsContainer}>
      {/* Fact Item 1: Books */}
      <div className={`${styles.factItem} ${visible ? styles.fadeInUp : ""}`} style={{ animationDelay: "0.1s" }}>
        <div className={styles.factIconWrap}>
          <span className={styles.factIcon}>📚</span>
          <div className={styles.factPulseGlow} />
        </div>
        <div className={styles.factNumberRow}>
          <strong className={styles.factNumber}>{animatedBooks}</strong>
          <span className={styles.plusSign}>+</span>
        </div>
        <span className={styles.factLabel}>books to discover</span>
        <div className={styles.accentBar} />
      </div>

      {/* Fact Item 2: Categories */}
      <div className={`${styles.factItem} ${visible ? styles.fadeInUp : ""}`} style={{ animationDelay: "0.25s" }}>
        <div className={styles.factIconWrap}>
          <span className={styles.factIcon}>🏷️</span>
          <div className={styles.factPulseGlow} />
        </div>
        <div className={styles.factNumberRow}>
          <strong className={styles.factNumber}>{animatedCategories}</strong>
          <span className={styles.plusSign}>+</span>
        </div>
        <span className={styles.factLabel}>reading categories</span>
        <div className={styles.accentBar} />
      </div>

      {/* Fact Item 3: Rooms */}
      <div className={`${styles.factItem} ${visible ? styles.fadeInUp : ""}`} style={{ animationDelay: "0.4s" }}>
        <div className={styles.factIconWrap}>
          <span className={styles.factIcon}>🏛️</span>
          <div className={styles.factPulseGlow} />
        </div>
        <div className={styles.factNumberRow}>
          <strong className={styles.factNumber}>{animatedRooms}</strong>
          <span className={styles.roomBadge}>Rooms</span>
        </div>
        <span className={styles.factLabel}>rooms for different goals</span>
        <div className={styles.accentBar} />
      </div>

      {/* Fact Item 4: Philosophy Quote / Metric */}
      <div className={`${styles.factItem} ${styles.philosophyItem} ${visible ? styles.fadeInUp : ""}`} style={{ animationDelay: "0.55s" }}>
        <div className={styles.factIconWrap}>
          <span className={styles.factIcon}>🌿</span>
        </div>
        <strong className={styles.philosophyTitle}>Your pace.</strong>
        <span className={styles.factLabel}>Your daily reading practice.</span>
      </div>
    </div>
  )
}
