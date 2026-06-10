import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';

const clients = ['Adhese', 'Luminus', 'Columba'] as const;

export const ClientStrip = () => (
  <section className="py-14">
    <Container>
      <Reveal>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Werkte onder meer voor
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {clients.map((client) => (
              <li
                key={client}
                className="text-xl font-semibold tracking-tight text-muted-foreground"
              >
                {client}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Container>
  </section>
);
