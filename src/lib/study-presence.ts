export function uniqueStudyMembers(state: Record<string, unknown[]>): string[] {
  const ids = new Set<string>()
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      const id = (entry as { id?: unknown })?.id
      if (typeof id === "string" && id) ids.add(id)
    }
  }
  return [...ids]
}

export function isRoomPage(pathname: string | null, roomId: string): boolean {
  return pathname === "/study-rooms/" + roomId
}
