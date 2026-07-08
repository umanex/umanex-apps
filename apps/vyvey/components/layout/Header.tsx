import Link from 'next/link';
import { Wordmark } from '@/components/icons';
import { Container } from '@/components/ui/Container';
import { nav } from '@/lib/content';
import { MobileNav } from './MobileNav';

/** Sticky, glassy header: wordmark + anchor-nav (desktop) + hamburger (mobiel). */
export const Header = () => (
  <header className="sticky top-0 z-50 border-b border-ink/5 bg-white/50 backdrop-blur-md">
    <Container className="flex items-center justify-between py-3">
      <Link
        href="#top"
        aria-label="Vyvey — naar boven"
        className="rounded text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Wordmark className="h-9 w-auto" />
      </Link>

      <nav aria-label="Hoofdnavigatie" className="hidden tablet:block">
        <ul className="flex items-center gap-12">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded text-sm font-semibold uppercase tracking-wide text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <MobileNav items={nav} />
    </Container>
  </header>
);
