"use client"

import dynamic from 'next/dynamic'

// Dynamically import the PDF Reader to disable SSR.
// This prevents the "DOMMatrix is not defined" server error because react-pdf 
// requires browser APIs like window and DOMMatrix which aren't available on the Node.js server.
const ReaderClient = dynamic(() => import('./ReaderClient'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>Loading Reader...</div>
})

export default function Page() {
  return <ReaderClient />
}
