import type { Metadata } from 'next';
import { Fira_Sans } from 'next/font/google';
import './globals.css';
import '@umanex/tokens/variables.css';
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
