export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  title: string
  author_id: string | null
  description: string | null
  cover_url: string | null
  pdf_url: string | null
  language: string
  published_year: number | null
  total_pages: number | null
  created_at: string
  categories?: Category[]
  authors?: Author
  ratings?: Rating[]
}

export interface Author {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string | null
}

export interface Rating {
  id: string
  book_id: string
  user_id: string
  rating: number
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  book_id: string
  created_at: string
  books?: Book
}

export interface ReadingProgress {
  id: string
  user_id: string
  book_id: string
  current_page: number
  total_pages: number
  completed: boolean
  last_read_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  expires_at: string
  profiles?: Profile
}

export interface Conversation {
  id: string
  created_at: string
  conversation_participants?: ConversationParticipant[]
  messages?: Message[]
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  profiles?: Profile
}

export interface ChatRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: "pending" | "accepted" | "rejected"
  created_at: string
  profiles?: Profile
}

export interface UserPresence {
  id: string
  user_id: string
  status: "online" | "offline" | "studying"
  last_seen: string
  profiles?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  data: Record<string, unknown> | null
}

export interface Achievement {
  id: string
  user_id: string
  type: string
  title: string
  description: string
  icon: string | null
  earned_at: string
}
