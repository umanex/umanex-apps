import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AccentBar } from '@/components/ui/AccentBar';
import { CareerItem } from '@/components/data-display/CareerItem';
import { careerEntries } from '@/lib/career';
import { copy } from '@/lib/copy';

export const metadata: Metadata = {
  title: copy.meta.carriere.title,
  description: copy.meta.carriere.description,
};

export default function CarrierePage() {
  return (
    <div className="py-20">
      <Container className="max-w-3xl space-y-14">
        <Reveal>
          <header className="space-y-4">
            <AccentBar />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.carriere.hero.title}
            </h1>
            <p className="text-lg text-muted-foreground">{copy.carriere.hero.subtitle}</p>
          </header>
        </Reveal>
        <Reveal>
          <ol className="list-none">
            {careerEntries.map((entry) => (
              <CareerItem key={`${entry.organisation}-${entry.role}`} entry={entry} />
            ))}
          </ol>
        </Reveal>
      </Container>
    </div>
  );
}
