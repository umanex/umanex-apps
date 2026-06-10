import { FileText, GitBranch, Palette, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/layout/Container';

const pillars = [
  {
    icon: FileText,
    title: 'Briefings die agents begrijpen',
    body: 'Elk design start met een gestructureerde briefing: kort, precies, en direct bruikbaar voor developers én AI-agents. Geen interpretatieruimte, geen herwerk.',
  },
  {
    icon: Palette,
    title: 'Design tokens als bron van waarheid',
    body: 'Kleuren, spacing en typografie leven in één tokens-bestand dat Figma en code synchroon houdt. Geen drift tussen design en development.',
  },
  {
    icon: GitBranch,
    title: 'Van Figma naar werkende code',
    body: 'AI-agents bouwen componenten binnen vaste conventies. Ik bewaak UX, kwaliteit en edge cases — jij krijgt sneller werkende schermen in plaats van statische mockups.',
  },
  {
    icon: ShieldCheck,
    title: 'Deze site is het bewijs',
    body: 'umanex.be is gebouwd met exact deze werkwijze: eigen design tokens, eigen component library en AI-agents in dezelfde codebase als mijn producten.',
  },
] as const;

export const AiApproach = () => (
  <section className="py-20">
    <Container className="space-y-10">
      <div className="max-w-2xl space-y-4">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Niet méér mensen. Een betere werkwijze.
        </h2>
        <p className="text-lg text-muted-foreground">
          AI is geen feature op mijn dienstenlijst — het zit in elke stap van hoe ik
          werk. Concreet, niet als belofte:
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="space-y-3 rounded-lg border border-border p-6">
            <pillar.icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="font-semibold">{pillar.title}</h3>
            <p className="text-sm text-muted-foreground">{pillar.body}</p>
          </div>
        ))}
      </div>
    </Container>
  </section>
);
