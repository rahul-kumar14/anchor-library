"use client"

import { useEffect, useState } from "react"

export default function PageJump({ page, total, onChange }: { page: number; total: number | null; onChange: (page: number) => void }) {
  const [value, setValue] = useState(String(page))
  useEffect(() => setValue(String(page)), [page])
  return <form style={{ display: "flex", alignItems: "center", gap: 6 }} onSubmit={event => {
    event.preventDefault()
    const next = Number(value)
    if (total && Number.isInteger(next) && next >= 1 && next <= total) onChange(next)
    else setValue(String(page))
  }}>
    <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>Page <input aria-label="Go to page" type="number" min={1} max={total || 1}
      value={value} onChange={event => setValue(event.target.value)} disabled={!total}
      style={{ width: 58, padding: "4px", border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-surface)", color: "var(--color-text-primary)" }} /></label>
    <span style={{ fontSize: "0.8rem" }}>/ {total || "…"}</span>
    <button className="btn btn-ghost btn-sm" disabled={!total} type="submit">Go</button>
  </form>
}
