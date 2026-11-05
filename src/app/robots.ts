import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://anchorlib.space'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/profile',
          '/favorites',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
