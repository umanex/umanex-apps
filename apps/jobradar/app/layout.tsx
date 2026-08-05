import type { Metadata } from 'next'
import { Fira_Sans } from 'next/font/google'
// Volgorde is functioneel: theme.css levert de ongelaagde :root/.dark rollaag,
// globals.css zet daarna de jobradar-merkkleuren erover.
import '@umanex/tokens/theme.css'
import './globals.css'

// Fira Sans, niet Inter: font.family.sans in de tokens zegt Fira Sans, en een app
// die iets anders laadt maakt dat token een leugen. next/font hasht de familienaam,
// dus het token kan het font niet zelf leveren — de guard toetst de twee tegen elkaar.
const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'JobRadar — umanex',
  description: 'Vacature- en lead-tracker voor UX/UI freelancers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={firaSans.variable}>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
