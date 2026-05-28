import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'JobRadar — umanex',
  description: 'Vacature- en lead-tracker voor UX/UI freelancers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable}>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
