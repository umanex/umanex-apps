import type { Metadata } from 'next';
import { Fira_Sans } from 'next/font/google';
// Volgorde is functioneel: theme.css levert de ongelaagde :root-rollaag,
// globals.css mag daar daarna overheen. Cashflow draait alleen in light: de
// `.dark`-blokken in theme.css staan er voor de andere apps en worden hier
// nooit aangezet — er is geen theme-class en geen toggle.
import '@umanex/tokens/theme.css';
import './globals.css';
import { AuthProvider } from '../lib/supabase/auth-context';
import { LoginGate } from '../components/auth/LoginGate';

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Cashflow — umanex',
  description: 'Persoonlijke cashflow prognose tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={firaSans.variable}>
      <body className="font-sans bg-background text-foreground antialiased">
        {/* De poort staat in de layout en niet per pagina: zonder sessie geeft RLS
            niets terug, dus geen enkele route heeft iets te tonen. */}
        <AuthProvider>
          <LoginGate>{children}</LoginGate>
        </AuthProvider>
      </body>
    </html>
  );
}
