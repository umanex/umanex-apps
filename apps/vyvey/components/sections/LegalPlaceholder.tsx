import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { site } from '@/lib/site';

type Props = { title: string };

/** Placeholder voor legal-routes tot Vyvey de definitieve tekst aanlevert. */
export const LegalPlaceholder = ({ title }: Props) => (
  <Section className="min-h-[60vh] pt-28 tablet:pt-32">
    <Container className="max-w-3xl">
      <h1 className="text-[28px] font-semibold text-ink">{title}</h1>
      <p className="mt-6 text-base leading-[1.5] text-ink/80">
        Deze pagina is in opbouw. De definitieve tekst verschijnt hier binnenkort.
      </p>
      <p className="mt-4 text-base leading-[1.5] text-ink/80">
        Vragen? Bel ons op{' '}
        <a
          href={site.phone.href}
          className="rounded text-accent-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {site.phone.display}
        </a>{' '}
        of mail naar{' '}
        <a
          href={`mailto:${site.email}`}
          className="rounded text-accent-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {site.email}
        </a>
        .
      </p>
    </Container>
  </Section>
);
