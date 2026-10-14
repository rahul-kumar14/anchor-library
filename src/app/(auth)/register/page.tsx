"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import styles from "../login/page.module.css"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: username },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // If session exists immediately = email confirmation is OFF → go to dashboard
    if (data.session) {
      router.push("/dashboard")
      router.refresh()
      return
    }

    // Email confirmation ON → redirect to login with message
    router.push("/login?message=Check your email to confirm your account!")
  }

  return (
    <div className={`${styles.card} animate-fade-in`}>
      <div className={styles.cardHeader}>
        <h1 className={`${styles.title} heading-serif`}>Join Anchor Library</h1>
        <p className={styles.subtitle}>Free forever — study with the world</p>
      </div>

      <form onSubmit={handleRegister} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            className="input"
            placeholder="studybuddy42"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
            required
            minLength={3}
            autoComplete="username"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="input"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button
          id="register-submit"
          type="submit"
          className={`btn btn-primary btn-lg w-full ${loading ? styles.loading : ""}`}
          disabled={loading}
        >
          {loading ? "Creating account..." : "🚀 Create Free Account"}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}