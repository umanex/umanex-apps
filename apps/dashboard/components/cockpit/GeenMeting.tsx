type Props = {
  /** Waaróm er niets staat. Zonder reden is een lege staat een raadsel. */
  reden: string;
  /** Wat de lezer nu kan doen. Weglaten als er niets te doen valt. */
  zet?: string;
};

/**
 * De ontbrekende meting als eigen toestand, niet als nul.
 *
 * `null ≠ 0` is ontwerpprincipe 6 in `de-stand.md`, en dit component is de plek waar dat
 * zichtbaar wordt. Een tegel die bij een ontbrekend signaalbestand `0` toont, beweert een
 * meting die niemand gedaan heeft — en dat is erger dan geen getal, want nul leest als
 * goed nieuws.
 */
export const GeenMeting = ({ reden, zet }: Props) => (
  <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm">
    <p className="font-medium text-muted-foreground">Niet gemeten</p>
    <p className="mt-1 text-xs text-muted-foreground">{reden}</p>
    {zet ? <p className="mt-2 font-mono text-xs text-foreground">{zet}</p> : null}
  </div>
);
