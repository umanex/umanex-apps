import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { CareerItem } from '@/components/data-display/CareerItem';
import { careerEntries } from '@/lib/career';

export const metadata: Metadata = {
  title: 'Carrière',
  description:
    'Het parcours van Jeroen Colpaert: ruime ervaring over het hele design proces in B2B software, van gebruikersonderzoek tot design systems.',
};

export default function CarrierePage() {
  return (
    <div className="py-20">
      <Container className="max-w-3xl space-y-14">
        <Reveal>
          <header className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Carrière</h1>
            <p className="text-lg text-muted-foreground">
              Geen lijst van tools maar een parcours: het hele design proces, telkens in
              omgevingen waar veel stakeholders en veel complexiteit samenkomen.
              {/* TODO: intro herschrijven zodra de carrière-feiten (jaren, rollen, sectoren) binnen zijn */}
            </p>
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
