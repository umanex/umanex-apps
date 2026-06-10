import { PenLine } from 'lucide-react';

type Props = {
  children?: React.ReactNode;
};

// Zichtbare marker voor content die Jeroen nog moet aanleveren — verdwijnt zodra de echte copy er is.
export const PlaceholderNote = ({ children }: Props) => (
  <p className="inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
    <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {children ?? 'Placeholder — content volgt'}
  </p>
);
