import Link from 'next/link';
import { UmanexCredit } from '@/components/icons';
import { Container } from '@/components/ui/Container';
import { legalLinks } from '@/lib/content';
import { site } from '@/lib/site';

/** Cream footer-balk: legal-links + umanex-credit. */
export const Footer = () => (
  <footer className="bg-cream">
    <Container className="flex flex-col items-start gap-4 py-8 tablet:flex-row tablet:items-center tablet:justify-between">
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {legalLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="rounded text-xs leading-normal text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <a
        href={site.umanexUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Website gemaakt door umanex"
        className="shrink-0 rounded transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <UmanexCredit className="h-3 w-auto" />
      </a>
    </Container>
  </footer>
);
