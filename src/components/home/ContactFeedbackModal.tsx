"use client"

import { useState, useEffect } from "react"
import styles from "./ContactFeedbackModal.module.css"

const ADMIN_TARGET_EMAIL = "hpark4868@gmail.com"

interface ContactFeedbackModalProps {
  userEmail?: string | null
}

export default function ContactFeedbackModal({ userEmail }: ContactFeedbackModalProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState(userEmail || "")
  const [type, setType] = useState<"feedback" | "review" | "contact">("feedback")
  const [rating, setRating] = useState<number>(5)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [submittedData, setSubmittedData] = useState<{
    name: string
    email: string
    type: string
    rating: number
    message: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userEmail && !email) {
      setEmail(userEmail)
    }
  }, [userEmail, email])

  const generateMailtoUrl = (data: {
    name: string
    email: string
    type: string
    rating: number
    message: string
  }) => {
    const typeLabel =
      data.type === "review"
        ? "Community Review"
        : data.type === "contact"
        ? "General Contact Query"
        : "Platform Feedback & Suggestion"

    const subject = encodeURIComponent(`[Anchor Library] ${typeLabel} from ${data.name}`)
    const body = encodeURIComponent(
      `Hello Anchor Library Team,\n\n` +
      `Here is a new ${typeLabel} submitted on the platform:\n\n` +
      `----------------------------------------\n` +
      `Reader Name: ${data.name}\n` +
      `Reader Email: ${data.email}\n` +
      `Category: ${typeLabel}\n` +
      `Rating: ${data.rating} / 5 Stars\n` +
      `----------------------------------------\n\n` +
      `Message / Review:\n${data.message}\n\n` +
      `Sent from Anchor Library Web Client\n`
    )

    return `mailto:${ADMIN_TARGET_EMAIL}?subject=${subject}&body=${body}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.")
      return
    }
    setLoading(true)
    setError(null)

    const submission = {
      name: name.trim(),
      email: email.trim(),
      type,
      rating,
      message: message.trim(),
    }

    try {
      // 1. Save to database & admin notifications feed
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      })

      // 2. Set submission data for user action & trigger mailto
      setSubmittedData(submission)

      // Try automatic mailto launch
      const mailtoUrl = generateMailtoUrl(submission)
      window.location.href = mailtoUrl
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSubmittedData(null)
    setName("")
    setMessage("")
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={styles.openBtn}
      >
        <span>✉️</span> Share Feedback / Review
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className={styles.modalHeader}>
              <span className={styles.badge}>Anchor Library Direct</span>
              <h2 className={styles.title}>Send Feedback &amp; Review</h2>
              <p className={styles.desc}>
                Your message goes directly to our team at{" "}
                <strong className={styles.mailHighlight}>{ADMIN_TARGET_EMAIL}</strong>{" "}
                and will be saved in admin notifications.
              </p>
            </div>

            {submittedData ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>✓</div>
                <h3>Feedback Recorded &amp; Ready to Send!</h3>
                <p>
                  Your review has been recorded. To ensure it lands directly into{" "}
                  <strong>{ADMIN_TARGET_EMAIL}</strong>, click the button below to send it via your email app (Gmail / Outlook).
                </p>

                <div className={styles.successActions}>
                  <a
                    href={generateMailtoUrl(submittedData)}
                    className={styles.mailActionBtn}
                  >
                    <span>📧</span> Send Now via Gmail / Mail App
                  </a>
                  <button
                    type="button"
                    onClick={handleReset}
                    className={styles.doneBtn}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.errorAlert}>{error}</div>}

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Your Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Your Email *</label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Category</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                    >
                      <option value="feedback">💡 Suggestion / Feedback</option>
                      <option value="review">⭐ Community Review</option>
                      <option value="contact">📬 General Query</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Rating</label>
                    <div className={styles.starPicker}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`${styles.starBtn} ${rating >= star ? styles.starActive : ""}`}
                          onClick={() => setRating(star)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Message / Review *</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us what you love or how we can improve Anchor Library..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitBtn}
                  >
                    {loading ? "Preparing message..." : `Submit to ${ADMIN_TARGET_EMAIL} →`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
