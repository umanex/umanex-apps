import type { Metadata } from 'next';
// Volgorde is functioneel: theme.css levert de ongelaagde :root/.dark rollaag,
// globals.css mag daar daarna overheen.
import '@umanex/tokens/theme.css';
import '@umanex/ui/globals.css';

// Nog geen merk-font: soda+ heeft een eigen huisstijl en die staat pas vast na de
// briefing. Zonder --font-sans valt de preset terug op ui-sans-serif. Zet hier het
// next/font-blok zodra de brief zegt welke type-stack het wordt.

export const metadata: Metadata = {
  title: 'soda+',
  description: 'Designopdracht soda+',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl-BE">
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
