import { Container } from '@/components/layout/Container';

const services = [
  {
    title: 'Prototyping & validatie',
    body: 'Werkende prototypes vóór development start, getest bij echte eindgebruikers. Met de AI-pipeline staan die er in dagen, niet weken — dus je valideert vaker en goedkoper.',
  },
  {
    title: 'Design assets, developer briefings & feedback',
    body: 'Consistente design assets en briefings die zo precies zijn dat developers — en agents — er direct mee bouwen. Plus regelmatige review van wat er gebouwd wordt.',
  },
  {
    title: 'Bibliotheken & design systems',
    body: 'Component libraries en design systems met tokens als fundament: één centrale aanpassing, overal doorgevoerd. In Figma én in code.',
  },
] as const;

export const ServicesOverview = () => (
  <section className="border-t border-border bg-muted/50 py-20">
    <Container className="space-y-10">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Technieken om de ontwikkeling van complexe business software te versnellen
      </h2>
      <div className="grid gap-6 lg:grid-cols-3">
        {services.map((service) => (
          <div
            key={service.title}
            className="space-y-3 rounded-lg border border-border bg-background p-6"
          >
            <h3 className="font-semibold">{service.title}</h3>
            <p className="text-sm text-muted-foreground">{service.body}</p>
          </div>
        ))}
      </div>
    </Container>
  </section>
);
