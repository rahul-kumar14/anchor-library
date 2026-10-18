"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./FocusLauncher.module.css"

export default function FocusLauncher() {
  const [goal, setGoal] = useState("Read a chapter. Capture one idea.")
  const [minutes, setMinutes] = useState(25)
  const router = useRouter()
  return <form className={styles.card} onSubmit={event => {
    event.preventDefault()
    router.push("/study-rooms/pomodoro?" + new URLSearchParams({ goal: goal.trim() || "One focused reading session", minutes: String(minutes) }))
  }}>
    <div className={styles.top}><span className={styles.mark}>⚓</span><span>YOUR NEXT FOCUS SESSION</span><span className={styles.tag}>Camera-free</span></div>
    <h2>A little focus.<br /><em>A meaningful finish.</em></h2>
    <label htmlFor="focus-goal">What would make this session count?</label>
    <input id="focus-goal" value={goal} onChange={event => setGoal(event.target.value)} maxLength={120} required />
    <fieldset><legend>Make a little time</legend><div className={styles.durations}>{[15, 25, 50].map(duration => <button key={duration} type="button" aria-pressed={minutes === duration} onClick={() => setMinutes(duration)}>{duration} <span>min</span></button>)}</div></fieldset>
    <button type="submit" className={styles.start}>Find your focus →</button>
    <p>Bring a goal. Pick a book. Leave with a takeaway.</p>
    <div className={styles.bottom}><span>01 / Set an intention</span><span>02 / Settle in</span><span>03 / Keep the idea</span></div>
  </form>
}
