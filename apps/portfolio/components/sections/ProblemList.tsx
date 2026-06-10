import { Container } from '@/components/layout/Container';

const problems = [
  'Kostbare herzieningen nodig om het product recht te trekken',
  'Veel tijd kwijt aan visuele actualiteit en consistentie',
  'Functionaliteit niet zoals intern verwacht',
  'Functies onvoldoende bruikbaar na lancering',
  'Regelmatig veranderende scope en prioriteiten',
] as const;

export const ProblemList = () => (
  <section className="border-t border-border bg-muted/50 py-20">
    <Container className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Herkenbaar?</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {problems.map((problem) => (
          <li
            key={problem}
            className="rounded-lg border border-border bg-background p-5 text-muted-foreground"
          >
            {problem}
          </li>
        ))}
      </ul>
      <p className="max-w-2xl text-lg">
        Dit zijn geen capaciteitsproblemen. Het zijn werkwijze-problemen — en die los je
        niet op met méér mensen.
      </p>
    </Container>
  </section>
);
