import styles from "./layout.module.css"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authPage}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      {/* Decorative book emojis */}
      <span className={`${styles.bookDeco} ${styles.bookDeco1}`}>📚</span>
      <span className={`${styles.bookDeco} ${styles.bookDeco2}`}>📖</span>
      <span className={`${styles.bookDeco} ${styles.bookDeco3}`}>🏛️</span>

      <div className={styles.authCenter}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>⚓</span>
          <span className={styles.brandText}>Anchor Library</span>
        </div>
        {children}
      </div>
    </div>
  )
}
