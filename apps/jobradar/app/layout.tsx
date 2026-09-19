import type { Metadata } from 'next'
import { Fira_Sans } from 'next/font/google'
// Volgorde is functioneel: theme.css levert de ongelaagde :root/.dark rollaag,
// globals.css zet daarna de jobradar-merkkleuren erover.
import '@umanex/tokens/theme.css'
import './globals.css'
import { AppHeader } from '@/components/layout/AppHeader'

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
      {/* De balk staat in de layout en niet per pagina, dus hij draagt ook de foutpagina, de 404
          en de drie laadtoestanden — precies de schermen waar "waar ben ik" het meest telt. */}
      {/* Kolom over de volle hoogte, en `w-full` op elke main. Een pagina die het hele scherm
          wil vullen (`error.tsx`, `not-found.tsx`) vraagt `flex-1` en niet `min-h-screen`: dat
          laatste telde bij de balk op en gaf élke foutpagina een schuifbalk plus inhoud onder het
          midden. De `w-full` hoort erbij — `mx-auto` op de kruis-as van een kolom-flexbox zet
          `align-self: stretch` uit, en dan valt een main terug op fit-content. */}
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  )
}
