export type ShelfBook = {
  id: number; title: string; author: string | null; cover_url: string | null; cover_image_url: string | null
  description_hindi: string | null; language: string | null; genre: string | null; category_name: string
}

const rooms = [
  { id: "silent", name: "Silent Study", icon: "🔕", keywords: ["philosophy", "meditations", "classic"] },
  { id: "pomodoro", name: "Pomodoro Focus", icon: "🍅", keywords: ["productivity", "habit", "focus", "self help", "self-help"] },
  { id: "night-owl", name: "Night Owl Study", icon: "🌙", keywords: ["mystery", "thriller", "dracula", "science fiction"] },
  { id: "reading", name: "Hindi Literature & Books", icon: "📖", keywords: ["hindi", "poetry", "premchand"] },
  { id: "english-lit", name: "English Literature", icon: "📚", keywords: ["classic", "literature", "fiction"] },
  { id: "upsc", name: "UPSC / Civil Services", icon: "📋", keywords: ["history", "polity", "upsc", "geography", "civil", "गांधी", "सत्य के प्रयोग"] },
  { id: "coding", name: "Coding & DSA", icon: "💻", keywords: ["programming", "coding", "computer", "dsa", "javascript", "python", "algorithms"] },
  { id: "gate", name: "GATE / Engineering", icon: "⚙️", keywords: ["science", "engineering", "math", "statistics", "signal processing"] },
  { id: "language", name: "Language Learning", icon: "🌐", keywords: ["language", "grammar", "vocabulary", "dictionary"] },
]
const roomIds = new Set(rooms.map(room => room.id))
const technical = /programming|coding|computer|javascript|python|data structures|engineering/

export function getRoomShelf(books: ShelfBook[]) {
  const used = new Set<number>()
  const picks = new Map<string, { book: ShelfBook; suggested: boolean }>()
  // Fill subject-specific rooms before allocating broad/general reading picks.
  for (const id of ["coding", "gate", "upsc", "language", "reading", "english-lit", "pomodoro", "night-owl", "silent"]) {
    const room = rooms.find(room => room.id === id)!
    const score = (book: ShelfBook) => {
      const assignment = book.description_hindi || ""
      if (assignment === room.id) return 1000
      const text = [book.title, book.genre, book.category_name].join(" ").toLowerCase()
      if (room.id === "gate" && /fiction|novel|poetry|literature/.test(text)) return 0
      if (room.id === "english-lit" && technical.test(text)) return 0
      if (room.id === "language" && technical.test(text)) return 0
      if (room.id === "reading" && book.language?.toLowerCase() === "hindi") return 100
      const matches = room.keywords.filter(keyword => text.includes(keyword)).length
      if (room.id === "english-lit" && book.language?.toLowerCase() !== "english") return 0
      return matches * 20 + (room.id === "language" && book.language?.toLowerCase() === "english" ? 5 : 0)
    }
    const ranked = books.filter(book => !used.has(book.id)).map(book => ({ book, score: score(book) })).sort((a, b) => b.score - a.score)
    const pick = ranked[0]
    if (pick) {
      used.add(pick.book.id)
      const assignment = pick.book.description_hindi || ""
      picks.set(id, { book: pick.book, suggested: pick.score === 0 || (roomIds.has(assignment) && assignment !== id) })
    }
  }
  return rooms.flatMap(room => { const pick = picks.get(room.id); return pick ? [{ room, ...pick }] : [] })
}
