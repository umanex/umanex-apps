// Het signaalcontract van de cockpit. Eén envelop per bestand, conform
// `umanex-os/docs/de-stand.md` — de schrijfkant is `umanex-os/scripts/stand.sh`.
//
// Deze types beschrijven wat er op schijf staat, niet wat de UI toont. Dat onderscheid
// is de reden dat de views hier niets van fs of shell hoeven te weten: ze krijgen een
// `Signaal<T>` als prop en renderen hem.

export type Zichtbaarheid = 'klant' | 'cockpit';

/** De envelop rond elk signaalbestand. */
export type Signaal<T> = {
  signaal: string;
  versie: number;
  klant: string;
  repo: string;
  /** Meetmoment uit de JSON. Nooit het moment van laden — ontwerpprincipe 1. */
  measured_at: string;
  interval_dagen: number;
  verouderd_na_dagen: number;
  zichtbaarheid: Zichtbaarheid;
  bron: { commit: string; branch: string; instrument: string; script: string };
  noemer: Record<string, unknown>;
  data: T[];
};

export type LusSoort = 'HANDOFF' | 'BACKLOG' | 'LEARNINGS';

export type WerkvoorraadRij = {
  soort: LusSoort;
  bestand: string;
  datum: string;
  leeftijd: number;
  status: string;
  type: string;
  /** Het commando uit de `- **Check:**`-regel, leeg als de entry er geen draagt. */
  check: string;
  titel: string;
  project: string;
};

export type BacklogRij = {
  bestand: string;
  datum: string;
  leeftijd: number;
  status: string;
  type: string;
  titel: string;
  project: string;
};

export type BriefingRij = {
  bestand: string;
  project: string;
  datum: string;
  soort: string;
  status: string;
  af_met_bewijs: number;
  af_zonder_bewijs: number;
  open: number;
  open_met_bewijs: number;
  naam: string;
};

export type DebtRij = {
  patroon: 'hex' | 'arb-px' | 'inline-px' | 'svg' | 'fallback';
  project: string;
  bestand: string;
  aantal: number;
};

export type LaagRij = {
  pad: string;
  soort: 'bestand' | 'seed' | 'glob';
  status: 'identiek' | 'afwijkend' | 'ontbreekt' | 'bron' | 'n.v.t.';
  detail: string;
};

export type DoctorRij = {
  blok: string;
  bereik: 'repo' | 'machine';
  status: 'ok' | 'waarschuwing' | 'fout';
  tekst: string;
};

export type IndexRij = {
  project: string;
  handoff: number;
  backlog: number;
  learnings: number;
  briefings: number;
  gevalideerd: number;
  af_met_bewijs: number;
  af_zonder_bewijs: number;
  open_items: number;
  debt_hex: number;
  debt_arb_px: number;
  debt_inline_px: number;
};

/** Eén klant uit `stand.local.json`. */
export type KlantConfig = {
  slug: string;
  naam: string;
  rol: 'eigen' | 'klant' | 'systeem';
  repo: string;
};

/**
 * De staat van één signaal op het scherm.
 *
 * `ontbreekt` is geen fout maar een eigen antwoord: er is nooit gemeten, of het bestand
 * is weg. `null ≠ 0` — een tegel die bij een ontbrekende meting `0` toont, liegt.
 */
export type Versheid = 'vers' | 'verouderd' | 'ontbreekt';

export type Gelezen<T> =
  | { staat: 'vers' | 'verouderd'; signaal: Signaal<T>; dagen: number }
  | { staat: 'ontbreekt'; reden: string };
