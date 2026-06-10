import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { site } from '@/lib/site';

export const ContactSection = () => (
  <section id="contact" className="border-t border-border bg-muted/50 py-20">
    <Container className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Kennismaken?</h2>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Stuur je vraag of plan meteen een gesprek. Een snelle eerste check leert meestal
        binnen de dag of dit haalbaar is.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <a
          href={site.bookingHref}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Plan een gesprek
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        <a
          href={`mailto:${site.email}`}
          className="text-sm font-medium underline hover:text-foreground"
        >
          {site.email}
        </a>
        <a href={site.phoneHref} className="text-sm font-medium hover:text-foreground">
          {site.phone}
        </a>
      </div>
    </Container>
  </section>
);
