type Props = {
  metBewijs: number;
  zonderBewijs: number;
  open: number;
  /** Optioneel label boven de balk, bv. de cohortnaam. */
  label?: string;
};

/**
 * De verificatieschuld als drie delen, niet als score.
 *
 * Een vinkje zónder `bewijs:`-regel telt per contract als open — *"een `- [ ]` dat er
 * anders uitziet"* — maar het is geen gat van dezelfde soort als een item dat nooit is
 * aangeraakt. Eén samengesteld percentage zou precies dat verschil verbergen, en het is
 * het enige verschil waar je iets mee kunt: bewijs bijschrijven is ander werk dan bouwen.
 *
 * De legenda draagt de getallen, dus de balk is versiering en geen informatiedrager.
 * Wie hem niet ziet — kleurenblind, schermlezer, geprint — leest hetzelfde verhaal.
 */
export const SchuldBalk = ({ metBewijs, zonderBewijs, open, label }: Props) => {
  const totaal = metBewijs + zonderBewijs + open;
  const deel = (n: number) => (totaal === 0 ? 0 : (n / totaal) * 100);

  return (
    <div>
      {label ? <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p> : null}
      {totaal === 0 ? (
        <p className="text-sm text-muted-foreground">geen acceptatie-items</p>
      ) : (
        <>
          <div
            className="flex h-2 overflow-hidden rounded-sm bg-muted"
            role="img"
            aria-label={`${metBewijs} met bewijs, ${zonderBewijs} zonder bewijs, ${open} open van ${totaal}`}
          >
            <div className="bg-success" style={{ width: `${deel(metBewijs)}%` }} />
            <div className="bg-warning" style={{ width: `${deel(zonderBewijs)}%` }} />
            <div className="bg-muted-foreground/40" style={{ width: `${deel(open)}%` }} />
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-success" aria-hidden="true" />
              <dt className="text-muted-foreground">met bewijs</dt>
              <dd className="font-medium tabular-nums">{metBewijs}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-warning" aria-hidden="true" />
              <dt className="text-muted-foreground">afgevinkt zonder bewijs</dt>
              <dd className="font-medium tabular-nums">{zonderBewijs}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-muted-foreground/40" aria-hidden="true" />
              <dt className="text-muted-foreground">open</dt>
              <dd className="font-medium tabular-nums">{open}</dd>
            </div>
            <div className="text-muted-foreground">van {totaal}</div>
          </dl>
        </>
      )}
    </div>
  );
};
