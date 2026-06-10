import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { site } from '@/lib/site';

export const Footer = () => (
  <footer className="border-t border-border py-12">
    <Container className="flex flex-col gap-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {site.owner} — {site.name}
        </p>
        <p>{site.address}</p>
        <p>BTW {site.vat}</p>
      </div>
      <div className="space-y-1">
        <p>
          <a href={`mailto:${site.email}`} className="hover:text-foreground">
            {site.email}
          </a>
        </p>
        <p>
          <a href={site.phoneHref} className="hover:text-foreground">
            {site.phone}
          </a>
        </p>
        <p>
          <a
            href={site.linkedin}
            rel="noopener noreferrer"
            target="_blank"
            className="hover:text-foreground"
          >
            LinkedIn
          </a>
        </p>
      </div>
      <p className="max-w-xs">
        Deze site is gebouwd met mijn eigen design tokens, component library en
        AI-agents — dezelfde werkwijze die ik bij teams opzet.{' '}
        <Link href="/werkwijze" className="underline hover:text-foreground">
          Zo werk ik
        </Link>
        .
      </p>
    </Container>
  </footer>
);
