import Link from 'next/link';
import { ThemeToggle } from '@umanex/ui/components/ui/theme-toggle';
import { Container } from '@/components/layout/Container';
import { copy } from '@/lib/copy';

const { brand, nav } = copy.header;

// De nav krimpt onder sm. Gemeten op 375 px: met px-2.5/text-sm is de balk 328 px breed in een
// venster dat er 264 vrijlaat, dus de thema-toggle viel buiten beeld en de héle pagina scrollde
// horizontaal. Dat was al zo met de vorige vier items (40 px te breed) — het is geen gevolg van
// het extra Aanbod-item, maar het viel pas op toen de flow-harness op smal scherm ging meten.

export const Header = () => (
  <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
    <Container className="flex h-16 items-center justify-between">
      <Link href="/" className="text-base font-bold tracking-tight sm:text-lg">
        {brand.name}
        <span className="text-primary">.</span>
        <span className="ml-2 hidden text-sm font-normal text-muted-foreground sm:inline">
          {brand.suffix}
        </span>
      </Link>
      <nav aria-label="Hoofdnavigatie" className="flex items-center gap-0.5 sm:gap-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-1.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:px-3 sm:text-sm"
          >
            {item.label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </Container>
  </header>
);
