import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Werkwijze — Design Team Of One + AI',
  description:
    'Hoe één designer met een AI-werkwijze de output van een klein team levert: kortere lijnen, snellere iteraties, consistente uitvoering.',
};

const benefits = [
  {
    title: 'Directe in-house communicatielijn',
    body: 'Je praat met de persoon die ontwerpt én bewaakt wat gebouwd wordt. Geen tussenlagen, geen vertaalverlies.',
  },
  {
    title: 'Gefocuste en toegewijde collega',
    body: 'Eén project tegelijk de volle aandacht — ik werk als deel van je team, niet als externe leverancier.',
  },
  {
    title: 'Lean budget zonder overhead',
    body: 'Geen agency-overhead, geen accountmanagers. Je betaalt voor design en uitvoering, niet voor coördinatie.',
  },
  {
    title: 'Snel bijsturen en itereren',
    body: 'Kleine stappen, tussentijdse demo’s, snel schakelen wanneer scope of inzichten veranderen.',
  },
  {
    title: 'Consistentie in visie en uitvoering',
    body: 'Eén persoon die het hele proces beheert betekent één samenhangende lijn van eerste schets tot geleverde feature.',
  },
] as const;

const aiPoints = [
  'Gestructureerde briefings (kort en precies) zijn direct bruikbaar voor AI-agents — wat vroeger documentatie was, is nu uitvoerbare input.',
  'Design tokens vormen één bron van waarheid tussen Figma en code: een aanpassing in het design system staat dezelfde dag in de codebase.',
  'AI-agents bouwen componenten en prototypes binnen vaste conventies. Ik bewaak UX, kwaliteit en edge cases — de combinatie levert team-output met één aanspreekpunt.',
  'Alles wat ik bij jou inzet, gebruik ik eerst zelf: deze site en mijn eigen producten draaien op exact dezelfde pipeline.',
] as const;

const requirements = [
  'Een passend project — complexe business software, geen websites of webshops',
  'Thuiswerk voor maximale focus',
  'Toegang tot eindgebruikers',
  'Inzicht in functionaliteit',
  'Toegang tot developers',
] as const;

export default function WerkwijzePage() {
  return (
    <div className="py-20">
      <Container className="max-w-3xl space-y-16">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Design Team Of One + AI
          </h1>
          <p className="text-lg text-muted-foreground">
            Eén designer beheert het hele product design proces: onderzoek, prototypes,
            design assets en kwaliteitsbewaking. Dat gaf altijd al kortere lijnen en meer
            wendbaarheid. De AI-werkwijze voegt daar de uitvoeringssnelheid van een klein
            team aan toe.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Waarom één designer werkt</h2>
          <div className="space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="rounded-lg border border-border p-5">
                <h3 className="font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{benefit.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Wat AI daaraan toevoegt</h2>
          <ul className="space-y-3">
            {aiPoints.map((point) => (
              <li key={point} className="flex gap-3 text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Efficiënt samenwerken? Dit heb ik nodig:
          </h2>
          <ul className="space-y-3">
            {requirements.map((requirement) => (
              <li key={requirement} className="flex gap-3 text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {requirement}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Klinkt dit als jouw project?</h2>
          <a
            href={site.bookingHref}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Plan een kennismaking
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </section>
      </Container>
    </div>
  );
}
