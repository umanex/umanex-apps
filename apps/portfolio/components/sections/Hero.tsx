import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { site } from '@/lib/site';

export const Hero = () => (
  <section className="py-24 sm:py-32">
    <Container className="space-y-8">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">
        Design Team Of One + AI
      </p>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        Ik help complexe B2B software teams sneller gebruiksvriendelijke
        functionaliteiten lanceren.
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Eén designer die het hele product design proces beheert — versterkt met een
        AI-werkwijze die de output van een klein team levert. Kortere lijnen, snellere
        iteraties, en design dat developers meteen kunnen bouwen.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <a
          href={site.bookingHref}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Plan een kennismaking
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        <Link
          href="/werkwijze"
          className="inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Bekijk hoe ik werk
        </Link>
      </div>
    </Container>
  </section>
);
