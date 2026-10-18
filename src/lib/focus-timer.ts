export type FocusClock = { mode: "work" | "break"; remaining: number }
export function advanceFocusTimer(state: FocusClock, elapsed: number, workMinutes: number): FocusClock {
  let mode = state.mode
  let remaining = state.remaining - Math.max(0, Math.floor(elapsed))
  while (remaining <= 0) {
    mode = mode === "work" ? "break" : "work"
    remaining += (mode === "work" ? workMinutes : 5) * 60
  }
  return { mode, remaining }
}
