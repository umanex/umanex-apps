import { Card } from '@umanex/ui/components/ui/card';

type Props = {
  name: string;
  /** De omvang staat in dagen, nooit in een maandbedrag — zie de briefing. */
  days: string;
  body: string;
};

export const TierCard = ({ name, days, body }: Props) => (
  <Card className="flex h-full flex-col gap-3 rounded-xl bg-background p-6 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-sm">
    <h3 className="text-lg font-semibold">{name}</h3>
    <p className="text-sm font-medium text-primary">{days}</p>
    <p className="text-sm text-muted-foreground">{body}</p>
  </Card>
);
