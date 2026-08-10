/**
 * Eén vraag over déze erg, die alleen de erg zelf kan beantwoorden.
 *
 * Wanneer je stopt met halen, meldt de erg vrijwel meteen 0 W, maar houdt hij zijn
 * slagfrequentie nog even vast. In dat venster zakt de watt-tegel via de EMA naar 0
 * — een staart van enkele seconden, en dat is het grootste deel van de traagheid die
 * je voelt. Die staart is weg te halen door de tegel meteen op 0 te zetten zodra de
 * erg 0 W meldt.
 *
 * Dat mag alleen als deze erg tijdens het roeien nóóit 0 W rapporteert. FTMS laat
 * beide interpretaties toe: sommige ergs sturen het gemiddelde vermogen over de hele
 * slag (nooit 0 terwijl je roeit), andere het momentane (0 in elke recovery). Bij de
 * tweede soort zou de tegel bij élke haal naar 0 knipperen — erger dan de traagheid
 * die we oplossen.
 *
 * Uit de code is dat niet af te leiden, dus tellen we het. Eén rit van een paar
 * minuten geeft het antwoord: staat `zeroWhileRowing` daarna op 0, dan is de snap
 * veilig. Staat er een getal, dan blijft de EMA-staart.
 *
 * Afgelezen in `app/dev-ble.tsx`.
 */

export type ErgPowerProbe = {
  /** Packets met een vermogen-veld erin — de noemer. */
  samples: number;
  /** Packets die 0 W melden terwijl er wél slagen gemeld worden. Dit is het antwoord. */
  zeroWhileRowing: number;
  /** Hoogste slagfrequentie waarbij een 0 W-packet gezien is — 0 als het nooit gebeurde. */
  maxSpmAtZero: number;
};

let probe: ErgPowerProbe = { samples: 0, zeroWhileRowing: 0, maxSpmAtZero: 0 };
const listeners = new Set<() => void>();

export function countPowerSample(power: number | null, spm: number | null): void {
  if (power == null) return;
  const next: ErgPowerProbe = { ...probe, samples: probe.samples + 1 };
  if (power === 0 && spm != null && spm > 0) {
    next.zeroWhileRowing += 1;
    next.maxSpmAtZero = Math.max(next.maxSpmAtZero, spm);
  }
  probe = next;
  for (const fn of listeners) fn();
}

export function readErgProbe(): ErgPowerProbe {
  return probe;
}

export function resetErgProbe(): void {
  probe = { samples: 0, zeroWhileRowing: 0, maxSpmAtZero: 0 };
  for (const fn of listeners) fn();
}

export function subscribeErgProbe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
