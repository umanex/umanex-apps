import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Container } from '@/components/layout/Container';

const navItems = [
  { href: '/cases', label: 'Cases' },
  { href: '/carriere', label: 'Carrière' },
  { href: '/werkwijze', label: 'Werkwijze' },
  { href: '/#contact', label: 'Contact' },
] as const;

export const Header = () => (
  <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
    <Container className="flex h-16 items-center justify-between">
      <Link href="/" className="text-base font-bold tracking-tight sm:text-lg">
        Jeroen Colpaert
        <span className="text-primary">.</span>
        <span className="ml-2 hidden text-sm font-normal text-muted-foreground sm:inline">
          umanex
        </span>
      </Link>
      <nav aria-label="Hoofdnavigatie" className="flex items-center gap-0.5 sm:gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:px-3"
          >
            {item.label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </Container>
  </header>
);
