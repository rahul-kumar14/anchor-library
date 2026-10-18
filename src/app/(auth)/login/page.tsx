"use client"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { safeAuthRedirect } from "@/lib/auth-redirect"
import styles from "./page.module.css"

// Separate inner component so useSearchParams is inside Suspense
function LoginForm() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const message = searchParams.get("message")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await response.json()
      if (!response.ok) { setError(data.error || "Login failed."); setLoading(false); return }
      window.location.href = safeAuthRedirect(searchParams.get("redirect"), data.isAdmin ? "/admin/books" : "/dashboard")
    } catch { setError("Unable to connect. Please retry."); setLoading(false) }

  }

  return (
    <div className={`${styles.card} animate-fade-in`}>
      <div className={styles.cardHeader}>
        <h1 className={`${styles.title} heading-serif`}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to continue your study journey</p>
      </div>

      {message && <div className={styles.success}>{message}</div>}

      <form onSubmit={handleLogin} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="identifier">Username or Email Address</label>
          <input
            id="identifier"
            type="text"
            className="input"
            placeholder="username or you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button
          id="login-submit"
          type="submit"
          className={`btn btn-primary btn-lg w-full ${loading ? styles.loading : ""}`}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In →"}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register" className={styles.link}>Create one free</Link>
        </p>
      </div>
    </div>
  )
}

// Suspense wrapper — required by Next.js App Router for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
