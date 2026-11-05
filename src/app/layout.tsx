import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://anchorlib.space"),
  title: {
    default: "Anchor Library — Online Books & Virtual Study Rooms",
    template: "%s | Anchor Library",
  },
  description:
    "Discover books, explore English and Hindi literature, and join virtual study rooms at Anchor Library. Find your focus and read together.",
  keywords: [
    "virtual library",
    "virtual study rooms",
    "online reading rooms",
    "hindi literature books",
    "english classics online",
    "study with me online",
    "pomodoro focus room",
    "camera-free study room",
    "read books online",
    "UPSC study group",
    "Anchor Library",
  ],
  authors: [{ name: "Anchor Library Team" }],
  creator: "Anchor Library",
  publisher: "Anchor Library",
  openGraph: {
    title: "Anchor Library — Online Books & Virtual Study Rooms",
    description:
      "Discover books, explore English and Hindi literature, and join virtual study rooms at Anchor Library. Find your focus and read together.",
    url: "https://anchorlib.space",
    siteName: "Anchor Library",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anchor Library — Online Books & Virtual Study Rooms",
    description:
      "Discover books, explore English and Hindi literature, and join virtual study rooms at Anchor Library. Find your focus and read together.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
