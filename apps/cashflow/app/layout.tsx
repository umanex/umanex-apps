import type { Metadata } from 'next';
import { Fira_Sans } from 'next/font/google';
// Volgorde is functioneel: theme.css levert de ongelaagde :root/.dark rollaag,
// globals.css mag daar daarna overheen.
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

// zet de theme class vóór first paint om een flash van het verkeerde theme te vermijden
// light is de default; dark alleen wanneer de gebruiker er expliciet voor koos
const themeInitScript = `(function () {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={firaSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
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
