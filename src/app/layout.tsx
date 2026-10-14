import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Anchor Library — Your Global Virtual Library",
    template: "%s | Anchor Library",
  },
  description: "A virtual library where you study with the world. Join study rooms, read 1000+ books, and stay consistent with a global community.",
  keywords: ["virtual library", "study rooms", "online books", "study together", "focus", "UPSC", "learning"],
  openGraph: {
    title: "Anchor Library",
    description: "Study together, stay consistent. A global virtual library.",
    type: "website",
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