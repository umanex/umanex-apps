import { Container } from '@/components/layout/Container';
import { RichText } from '@/components/ui/RichText';
import { copy } from '@/lib/copy';
import { site } from '@/lib/site';

export const Footer = () => (
  <footer className="border-t border-border py-12">
    <Container className="flex flex-col gap-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
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
      <p className="max-w-xs">
        <RichText segments={copy.footer.tagline} />
      </p>
    </Container>
  </footer>
);
