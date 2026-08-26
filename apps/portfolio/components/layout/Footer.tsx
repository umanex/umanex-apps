import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { RichText } from '@/components/ui/RichText';
import { copy } from '@/lib/copy';
import { site } from '@/lib/site';

// Vier kolommen sinds 2026-08-24: de sitemap-kolom vangt op wat uit de hoofdnav verdween
// (Carrière) en wat er bewust nooit in stond (de scan-pagina, die persoonlijk doorgestuurd wordt).
export const Footer = () => (
  <footer className="border-t border-border py-12">
    <Container className="grid gap-8 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {site.owner} — {site.name}
        </p>
        <p>{site.address}</p>
        <p>
          {copy.footer.vatLabel} {site.vat}
        </p>
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
            {copy.footer.linkedinLabel}
          </a>
        </p>
      </div>
      <nav aria-label={copy.footer.linksLabel} className="space-y-1">
        {copy.footer.links.map((link) => (
          <p key={link.href}>
            <Link href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          </p>
        ))}
      </nav>
      <p className="max-w-xs">
        <RichText segments={copy.footer.tagline} />
      </p>
    </Container>
  </footer>
);
