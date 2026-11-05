import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600 // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://anchorlib.space'

  // 1. Static Core Landing Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/study-rooms`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/guides/virtual-study-rooms`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides/hindi-literature`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides/study-with-me`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // 2. Study Rooms (All 9 Rooms)
  const roomIds = [
    'silent',
    'pomodoro',
    'night-owl',
    'reading',
    'english-lit',
    'upsc',
    'coding',
    'gate',
    'language',
  ]

  const roomRoutes: MetadataRoute.Sitemap = roomIds.map((id) => ({
    url: `${baseUrl}/study-rooms/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // 3. Dynamic Book URLs from Supabase
  let bookRoutes: MetadataRoute.Sitemap = []
  try {
    const admin = createAdminClient()
    const { data: books } = await admin
      .from('books')
      .select('id, created_at')
      .order('id', { ascending: false })
      .limit(500)

    if (books && books.length > 0) {
      bookRoutes = books.map((book) => ({
        url: `${baseUrl}/library/${book.id}`,
        lastModified: book.created_at ? new Date(book.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }))
    }
  } catch (error) {
    console.error('Error generating sitemap book routes:', error)
  }

  return [...staticRoutes, ...roomRoutes, ...bookRoutes]
}

