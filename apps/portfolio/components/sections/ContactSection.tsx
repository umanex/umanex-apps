import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AccentBar } from '@/components/ui/AccentBar';
import { copy } from '@/lib/copy';
import { site } from '@/lib/site';

const contact = copy.home.contact;

export const ContactSection = () => (
  <section id="contact" className="border-t border-border bg-accent/40 py-20">
    <Container>
      <Reveal>
        <div className="space-y-6">
          <AccentBar />
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {contact.title}
          </h2>
          <p className="max-w-2xl text-lg text-muted-foreground">{contact.body}</p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={site.contactHref}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {contact.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href={site.phoneHref} className="text-sm font-medium hover:text-foreground">
              {site.phone}
            </a>
            <a
              href={site.linkedin}
              rel="noopener noreferrer"
              target="_blank"
              className="text-sm font-medium underline hover:text-foreground"
            >
              {contact.linkedinLabel}
            </a>
          </div>
        </div>
      </Reveal>
    </Container>
  </section>
);
