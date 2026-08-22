/**
 * Welk persoonlijk record heeft een rit gebroken, en welke waarde verving hij?
 *
 * Tot 2026-08-22 was een PR één boolean: `useGoalProgress` OR'de drie metrics samen en
 * `workouts.is_pr` hield er niets van over. De gebruiker las "Nieuw persoonlijk record"
 * zonder te weten waarop — en achteraf was het niet meer te achterhalen.
 *
 * Deze module is de regel, los van de UI en los van Supabase: welke metrics er zijn, of
 * hoger of lager beter is, en wat een rit verslaat. Puur, dus toetsbaar met
 * `node --test lib/personalRecords.test.ts` — geen `@/`-alias, geen react-native, geen
 * i18n. Formattering en labels horen in de UI-laag; hier staan alleen getallen.
 */

/** De vier metrics waarop een rit een record kan zijn. */
export type PrMetric = 'distance' | 'best2k' | 'watts' | 'split';

/**
 * Prioriteitsvolgorde voor plekken waar er maar één past (de rij in het archief).
 * Afstand en 2K staan voorop: dat zijn de records die het homescherm al viert.
 */
export const PR_METRICS: readonly PrMetric[] = ['distance', 'best2k', 'watts', 'split'];

/**
 * De drie metrics waarmee de app vóór 2026-08-22 een PR vlagde. De afleiding voor oudere
 * ritten rekent hiermee, niet met alle vier: `is_pr` kwam destijds uit deze drie, dus een
 * 2000m-record erbij verzinnen zou een rit een reden geven die hij nooit gehad heeft.
 */
export const LEGACY_PR_METRICS: readonly PrMetric[] = ['distance', 'watts', 'split'];

/** Tijd-metrics winnen door te dalen, de andere door te stijgen. */
const LOWER_IS_BETTER: Record<PrMetric, boolean> = {
  distance: false,
  best2k: true,
  watts: false,
  split: true,
};

/** Eén gebroken record: wat het werd, en wat het was. */
export type PrEntry = {
  metric: PrMetric;
  value: number;
  /** De verslagen waarde. `null` betekent: bekend als record, herkomst onbekend. */
  previous: number | null;
  /** ISO-datum van de rit die het vorige record hield. */
  previous_at: string | null;
};

/** De rit-velden waarop vergeleken wordt — exact de kolomnamen uit `workouts`. */
export type PrValues = {
  avg_watts: number | null;
  avg_split_seconds: number | null;
  distance_meters: number | null;
  best_2k_seconds: number | null;
};

export type PrRecord = { value: number; at: string } | null;

/** De beste waarde per metric vóór een bepaalde rit. */
export type PrBaseline = Record<PrMetric, PrRecord>;

export const EMPTY_BASELINE: PrBaseline = {
  distance: null,
  best2k: null,
  watts: null,
  split: null,
};

export function valueForMetric(metric: PrMetric, v: PrValues): number | null {
  switch (metric) {
    case 'distance':
      return v.distance_meters;
    case 'best2k':
      return v.best_2k_seconds;
    case 'watts':
      return v.avg_watts;
    case 'split':
      return v.avg_split_seconds;
  }
}

/** Verslaat `value` het staande record `previous` op deze metric? */
export function beatsRecord(metric: PrMetric, value: number, previous: number): boolean {
  return LOWER_IS_BETTER[metric] ? value < previous : value > previous;
}

/**
 * Een waarde telt alleen mee wanneer ze er echt is. Nul en negatief zijn geen prestatie
 * maar een ontbrekende meting: een rit zonder wattmeter schrijft `avg_watts: null`, en een
 * afgebroken sessie landt op 0 m. Zonder deze poort wordt "0 seconden op de 2000m" het
 * onverslaanbare record van de app.
 */
function isUsable(value: number | null): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

/**
 * Welke records breekt deze rit ten opzichte van de baseline?
 *
 * Een metric zonder eerdere waarde levert bewust géén entry op: de eerste rit ooit is
 * geen record maar een vertrekpunt. Dat is ook wat de live-check altijd al deed
 * (`bestAvgWatts != null` in `useGoalProgress`), en het houdt "PR" betekenisvol.
 */
export function buildPrEntries(
  values: PrValues,
  baseline: PrBaseline,
  metrics: readonly PrMetric[] = PR_METRICS,
): PrEntry[] {
  const entries: PrEntry[] = [];
  for (const metric of metrics) {
    const value = valueForMetric(metric, values);
    if (!isUsable(value)) continue;
    const previous = baseline[metric];
    if (previous == null) continue;
    if (!beatsRecord(metric, value, previous.value)) continue;
    entries.push({ metric, value, previous: previous.value, previous_at: previous.at });
  }
  return entries;
}

/** De baseline ná deze rit — het staande record voor de rit die erna komt. */
export function extendBaseline(baseline: PrBaseline, values: PrValues, at: string): PrBaseline {
  const next: PrBaseline = { ...baseline };
  for (const metric of PR_METRICS) {
    const value = valueForMetric(metric, values);
    if (!isUsable(value)) continue;
    const current = next[metric];
    if (current == null || beatsRecord(metric, value, current.value)) {
      next[metric] = { value, at };
    }
  }
  return next;
}

export type PrCandidate = PrValues & {
  id: string;
  started_at: string;
};

/**
 * Loopt de historiek chronologisch door en zegt per rit welke records hij brak.
 *
 * Dit is het vangnet voor ritten van vóór `workouts.pr_metrics`: die dragen wél `is_pr`
 * maar niet de reden. Let op de rolverdeling — deze functie zegt wat er *gebeurde*, niet
 * wat de app destijds *vlagde*. De UI toont een badge alleen bij `is_pr === true` en
 * gebruikt dit puur om die badge te benoemen; anders zouden oude ritten alsnog records
 * krijgen die ze in de app nooit gehad hebben (2K telde vóór deze datum niet mee).
 *
 * De invoer hoeft niet gesorteerd te zijn; er wordt op `started_at` oplopend gewerkt.
 */
export function derivePrHistory(
  workouts: readonly PrCandidate[],
  metrics: readonly PrMetric[] = LEGACY_PR_METRICS,
): Map<string, PrEntry[]> {
  // Géén `localeCompare`: ICU-collatie behandelt '.' en '+' als leestekens en zet
  // '…T12:42:11+00:00' ná '…T12:42:11.735+00:00'. Postgres laat de fractie weg zodra die
  // nul is, dus beide vormen staan in dezelfde historiek — en een rit die als eerste
  // gesorteerd wordt, krijgt per definitie geen record. Een kale <-vergelijking op de
  // ISO-string is hier zowel correct als goedkoper.
  const chronological = [...workouts].sort((a, b) =>
    a.started_at < b.started_at ? -1 : a.started_at > b.started_at ? 1 : 0,
  );
  const result = new Map<string, PrEntry[]>();
  let baseline = EMPTY_BASELINE;
  for (const w of chronological) {
    const entries = buildPrEntries(w, baseline, metrics);
    if (entries.length > 0) result.set(w.id, entries);
    baseline = extendBaseline(baseline, w, w.started_at);
  }
  return result;
}

/** De metric die getoond wordt waar er maar één past. */
export function primaryEntry(entries: readonly PrEntry[]): PrEntry | null {
  for (const metric of PR_METRICS) {
    const hit = entries.find((e) => e.metric === metric);
    if (hit) return hit;
  }
  return null;
}

/**
 * Leest `workouts.pr_metrics` terug. De kolom is `jsonb` en dus vormvrij: rijen van vóór
 * de migratie zijn NULL, en een oudere appversie kan een metric-naam schrijven die deze
 * build niet kent. Alles wat niet klopt wordt stil overgeslagen — een archiefrij mag niet
 * omvallen op een veld dat alleen een badge inkleurt.
 */
export function parsePrEntries(raw: unknown): PrEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: PrEntry[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const { metric, value, previous, previous_at } = item as Record<string, unknown>;
    if (typeof metric !== 'string') continue;
    if (!PR_METRICS.includes(metric as PrMetric)) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    entries.push({
      metric: metric as PrMetric,
      value,
      previous: typeof previous === 'number' && Number.isFinite(previous) ? previous : null,
      // Alleen een dátum die ook echt te parsen is: `formatDate` doet er `new Date()` op
      // en een onparseerbare string levert daar 'NaN undefined NaN' in beeld.
      previous_at:
        typeof previous_at === 'string' && !Number.isNaN(Date.parse(previous_at))
          ? previous_at
          : null,
    });
  }
  return entries;
}
