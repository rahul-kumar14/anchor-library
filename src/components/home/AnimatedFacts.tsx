"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./AnimatedFacts.module.css"

interface AnimatedFactsProps {
  bookCount: number | null
  categoryCount: number | null
  roomCount?: number
}

export default function AnimatedFacts({ bookCount, roomCount = 9 }: AnimatedFactsProps) {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.2 })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const features = [
    ["◈", "Curated books", "Find your next great read"],
    ["◷", "Study together", `${roomCount} rooms, at your own pace`],
    ["◌", "Chat & connect", "Meet a reading partner"],
    ["✦", "Focus tools", "Notes, highlights & goals"],
    ["⌁", "Track progress", `${bookCount || 90}+ books to return to`],
  ]

  return (
    <div className={styles.factsWrapper}>
      <div ref={containerRef} className={styles.factsContainer}>
        {features.map(([icon, title, description], index) => (
          <div
            key={title}
            className={`${styles.factItem} ${visible ? styles.fadeInUp : ""}`}
            style={{ animationDelay: `${0.08 + index * 0.1}s` }}
          >
            <div className={styles.factIconWrap}>
              <span className={styles.factIcon}>{icon}</span>
              <div className={styles.factPulseGlow} />
            </div>
            <strong className={styles.philosophyTitle}>{title}</strong>
            <span className={styles.factLabel}>{description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
