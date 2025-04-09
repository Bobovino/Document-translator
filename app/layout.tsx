import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PDF Traductor Alemán-Español',
  description: 'Traduce PDFs del alemán al español con líneas intercaladas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <meta
          httpEquiv="Cross-Origin-Opener-Policy"
          content="same-origin"
        />
        <meta
          httpEquiv="Cross-Origin-Embedder-Policy"
          content="require-corp"
        />
      </head>
      {/* suppressHydrationWarning will ignore hydration mismatches for this element */}
      <body suppressHydrationWarning className="__className_d65c78">
        {children}
      </body>
    </html>
  )
}
