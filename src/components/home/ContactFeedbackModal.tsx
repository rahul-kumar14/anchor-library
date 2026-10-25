"use client"

import { useState } from "react"
import styles from "./ContactFeedbackModal.module.css"

export default function ContactFeedbackModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [type, setType] = useState<"feedback" | "review" | "contact">("feedback")
  const [rating, setRating] = useState<number>(5)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.")
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          type,
          rating,
          message: message.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit.")
      }

      setSuccess(true)
      setName("")
      setEmail("")
      setMessage("")
      setTimeout(() => {
        setSuccess(false)
        setOpen(false)
      }, 3500)
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.")
    } finally {
      setLoading(false)
    }
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
                <strong className={styles.mailHighlight}>hpark4868@gmail.com</strong>{" "}
                and will be reviewed by admin.
              </p>
            </div>

            {success ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>✓</div>
                <h3>Thank you for your valuable feedback!</h3>
                <p>
                  Your message has been submitted and dispatched to{" "}
                  <strong>hpark4868@gmail.com</strong>.
                </p>
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
                    {loading ? "Sending..." : "Submit to hpark4868@gmail.com →"}
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
