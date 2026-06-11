import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText, Layers, Palette, Repeat } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Werkwijze — Design Team Of One + AI',
  description:
    'umanex-os: gelaagde werkprincipes, gestructureerde briefings en design tokens als bron van waarheid — een AI-werkwijze die ook bij klanten geïmplementeerd kan worden.',
};

const principles = [
  {
    icon: Layers,
    title: 'Gelaagde werkprincipes',
    body: 'Eén operating system voor design werk: globale principes, daarboven klant-specifieke afspraken, daarboven project-context. Agents en collega’s werken binnen dezelfde regels — niets hangt af van wat in iemands hoofd zit.',
  },
  {
    icon: FileText,
    title: 'Briefings die agents begrijpen',
    body: 'Elk design start met een gestructureerd briefing-skeleton: taak, context, elementen, gedrag en constraints op één pagina. Kort genoeg om te onderhouden, precies genoeg om door developers én AI-agents uitgevoerd te worden.',
  },
  {
    icon: Palette,
    title: 'Design tokens als bron van waarheid',
    body: 'Kleuren, spacing en typografie leven in één tokens-bestand dat Figma en code synchroon houdt. Eén aanpassing in het design system staat dezelfde dag in elke app.',
  },
  {
    icon: Repeat,
    title: 'Agents binnen vaste conventies',
    body: 'AI-agents bouwen componenten, prototypes en schermen — maar altijd binnen de conventies van de lagen erboven. Ik bewaak UX, kwaliteit en edge cases. Dat is het verschil tussen snelle output en bruikbare output.',
  },
] as const;

export default function WerkwijzePage() {
  return (
    <div className="py-20">
      <Container className="max-w-3xl space-y-16">
        <Reveal>
          <header className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              umanex-os
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Design Team Of One + AI
            </h1>
            <p className="text-lg text-muted-foreground">
              Eén designer die het hele product design proces beheert gaf altijd al
              kortere lijnen en meer consistentie. De AI-werkwijze — umanex-os — voegt
              daar de uitvoeringssnelheid van een klein team aan toe. Geen losse tools,
              maar een systeem.
            </p>
          </header>
        </Reveal>

        <section className="space-y-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">Het werkingsprincipe</h2>
          </Reveal>
          <div className="space-y-4">
            {principles.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 0.06}>
                <div className="flex gap-4 rounded-xl border border-border p-6">
                  <principle.icon
                    className="h-6 w-6 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <h3 className="font-semibold">{principle.title}</h3>
                    <p className="text-sm text-muted-foreground">{principle.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section className="space-y-4 rounded-xl border border-border bg-muted/40 p-6">
            <h2 className="text-xl font-semibold">Ook voor jouw team</h2>
            <p className="text-muted-foreground">
              umanex-os is geen privé-trucendoos. Dezelfde structuur — werkprincipes,
              briefings, tokens-pipeline — zet ik op bij teams die hun eigen
              design-AI-werkwijze willen opbouwen. Deze site en{' '}
              <Link href="/cases/rowtrack" className="underline hover:text-foreground">
                RowTrack
              </Link>{' '}
              zijn er de levende demo van.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Benieuwd wat dit voor jouw team betekent?
            </h2>
            <a
              href={site.contactHref}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Kennismaken
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </section>
        </Reveal>
      </Container>
    </div>
  );
}
