import type { CareerEntry } from '@/lib/career';
import { PlaceholderNote } from '@/components/feedback/PlaceholderNote';

type Props = {
  entry: CareerEntry;
};

export const CareerItem = ({ entry }: Props) => (
  <li className="relative pl-8 before:absolute before:left-0 before:top-2 before:h-2.5 before:w-2.5 before:rounded-full before:bg-primary after:absolute after:bottom-0 after:left-[4px] after:top-6 after:w-px after:bg-border last:after:hidden">
    <div className="space-y-2 pb-10">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {entry.period}
      </p>
      <h3 className="text-lg font-semibold">
        {entry.role}
        <span className="text-muted-foreground"> · {entry.organisation}</span>
      </h3>
      <p className="text-sm text-muted-foreground">{entry.description}</p>
      {entry.draft && <PlaceholderNote>Periode en details volgen</PlaceholderNote>}
    </div>
  </li>
);
