import Link from 'next/link';
import { ThemeToggle } from '@umanex/ui/components/ui/theme-toggle';

/**
 * De schil om de cockpit heen.
 *
 * `/` blijft het bedieningspaneel: dat start en stopt processen en wordt dagelijks
 * gebruikt. De cockpit is het lezende oppervlak ernaast en heeft daarom een eigen kop —
 * maar één navigatie, zodat je nooit hoeft te raden waar je bent.
 *
 * Het woord "dashboard" komt hier niet voor. Het staat in beide klantprofielen op de
 * verboden-jargonlijst voor eindgebruiker-copy, en dit oppervlak is precies het deel dat
 * later een klant te zien krijgt.
 */
export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/cockpit"
              className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Cockpit
            </Link>
            <Link
              href="/cockpit/systeem"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Systeem
            </Link>
            <Link
              href="/"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Bedieningspaneel
            </Link>
          </nav>
          <ThemeToggle />
        </header>
        {children}
      </div>
    </div>
  );
}
