import { readFileSync } from 'node:fs';
import { standBestand } from '@/lib/paths';
import { versheid } from '@/lib/standRegels.mjs';
import type {
  BacklogRij,
  BriefingRij,
  DebtRij,
  DoctorRij,
  Gelezen,
  IndexRij,
  LaagRij,
  Signaal,
  WerkvoorraadRij,
} from '@/lib/stand/types';

/**
 * De leeskant: JSON van schijf naar een getypt `Gelezen<T>`.
 *
 * Meer doet deze laag niet. Hij meet niets, draait geen commando en kent geen pad dat uit
 * een request komt — alleen een slug en een vaste bestandsnaam. Dat is wat de views
 * verplaatsbaar houdt naar een app die wél publiek mag staan: zij krijgen `Gelezen<T>`
 * als prop en hoeven niet te weten of dat van schijf, uit een API of uit een database kwam.
 *
 * Drie uitkomsten, niet twee. `ontbreekt` betekent "er is nooit gemeten of het bestand is
 * weg" en is iets anders dan een meting die nul telt. Een tegel die dat verschil wegpoetst
 * toont een getal dat niemand gemeten heeft.
 */

function lees<T>(slug: string, bestand: string): Gelezen<T> {
  const pad = standBestand(slug, bestand);
  let ruw: string;
  try {
    ruw = readFileSync(pad, 'utf8');
  } catch {
    return { staat: 'ontbreekt', reden: `nog niet gemeten — ${bestand} ontbreekt voor ${slug}` };
  }

  let signaal: Signaal<T>;
  try {
    signaal = JSON.parse(ruw) as Signaal<T>;
  } catch (e) {
    return { staat: 'ontbreekt', reden: `${bestand} is geen geldige JSON: ${String(e)}` };
  }

  // De envelop moet compleet zijn vóór we hem als meting behandelen. Een half bestand is
  // een kapotte meting, geen lege — en `data` ontbreken is niet hetzelfde als een lege lijst.
  if (!Array.isArray(signaal?.data) || typeof signaal?.measured_at !== 'string') {
    return { staat: 'ontbreekt', reden: `${bestand} mist data of measured_at — envelop onvolledig` };
  }

  const v = versheid(signaal.measured_at, signaal.verouderd_na_dagen);
  if (v.staat === 'ontbreekt') {
    return { staat: 'ontbreekt', reden: v.reden ?? 'meetmoment onbruikbaar' };
  }
  return { staat: v.staat, signaal, dagen: v.dagen as number };
}

export const leesIndex = (slug: string) => lees<IndexRij>(slug, 'index.json');
export const leesBacklog = (slug: string) => lees<BacklogRij>(slug, 'backlog.json');
export const leesBriefings = (slug: string) => lees<BriefingRij>(slug, 'briefings.json');
export const leesDebt = (slug: string) => lees<DebtRij>(slug, 'design-debt.json');
export const leesLaag = (slug: string) => lees<LaagRij>(slug, 'laag.json');

// Cockpit-only. Deze twee lezen uit `<slug>/cockpit/`, de map die bij een klant-push niet
// meegaat. Dat de scheiding een pad is en geen veld, is precies waarom hij hier geen
// extra controle nodig heeft: er is geen filter die iemand kan vergeten.
export const leesWerkvoorraad = (slug: string) =>
  lees<WerkvoorraadRij>(slug, 'cockpit/werkvoorraad.json');
export const leesDoctor = (slug: string) => lees<DoctorRij>(slug, 'cockpit/doctor.json');

/** Het meetmoment van de index, als één regel voor de kopbalk. Null zonder meting. */
export function gemetenOp(slug: string): { moment: string; dagen: number } | null {
  const i = leesIndex(slug);
  return i.staat === 'ontbreekt' ? null : { moment: i.signaal.measured_at, dagen: i.dagen };
}
