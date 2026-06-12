import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AccentBar } from '@/components/ui/AccentBar';
import { copy } from '@/lib/copy';
import { keyMessages } from '@/lib/keyMessages';

export const KeyMessages = () => (
  <section className="border-t border-border bg-muted/40 py-20">
    <Container className="space-y-12">
      <Reveal>
        <AccentBar />
        <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
          {copy.home.keyMessages.title}
        </h2>
      </Reveal>
      <div className="grid gap-6 lg:grid-cols-3">
        {keyMessages.map((message, index) => (
          <Reveal key={message.title} delay={index * 0.08}>
            <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-sm">
              <h3 className="text-lg font-semibold">{message.title}</h3>
              <p className="text-sm text-muted-foreground">{message.body}</p>
              <Link
                href={message.href}
                className="group mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary"
              >
                {message.linkLabel}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </Container>
  </section>
);
