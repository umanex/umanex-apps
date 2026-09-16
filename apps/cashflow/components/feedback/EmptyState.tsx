import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  /** Wat hier komt te staan en waarom het ertoe doet — één of twee zinnen. */
  children: ReactNode;
  /** Eén actie die de lege staat opheft. */
  action?: ReactNode;
  headingLevel?: 'h2' | 'h3';
};

/** Een lege staat die uitlegt wat er ontbreekt en hoe je het vult — nooit een kaal "niets hier". */
export function EmptyState({ title, children, action, headingLevel = 'h2' }: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <section data-empty-state className="rounded-xl border border-dashed border-input bg-card p-6">
      <Heading className="text-base font-semibold">{title}</Heading>
      <div className="mt-2 max-w-prose text-sm text-muted-foreground">{children}</div>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
