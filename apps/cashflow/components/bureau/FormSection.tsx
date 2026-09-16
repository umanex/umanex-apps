import type { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Een groep velden als kaart. De `legend` is voor de schermlezer; de zichtbare titel staat
 * erboven als gewone tekst, omdat een zichtbare `legend` in een omrande fieldset op de rand
 * getekend wordt en de kaart openbreekt.
 */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-accent bg-card p-5">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden="true">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}
