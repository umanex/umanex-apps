import { readFileSync } from 'node:fs';
import { registryPad } from '@/lib/paths';
import { slugGeldig } from '@/lib/standRegels.mjs';
import type { KlantConfig } from '@/lib/stand/types';

/**
 * De machine-lokale registry: welke klanten bestaan er en waar staan hun repo's.
 *
 * Eén bestand, gitignored, met een `stand.local.example.json` ernaast. Aansluiten van een
 * nieuwe repo is daarmee één regel — de collector ontdekt de rest op conventie, want de
 * `.umanex-os/`-laag, `apps/<app>/`, de drie lussen en `briefings/` zijn in alle repo's
 * hetzelfde. Wat níet af te leiden is (welke guards een repo heeft, welke apps actief
 * zijn) hoort in de `context.json` van die repo, niet hier.
 *
 * Een ontbrekende registry is geen fout maar een toestand: de cockpit hoort dan te zeggen
 * dat hij nog niet ingericht is, met het pad erbij. Hetzelfde geldt voor een ongeldige
 * slug — die weigeren we hier in plaats van hem stil de verkeerde route te laten pakken.
 */

export type Registry = {
  osRoot: string | null;
  klanten: KlantConfig[];
  /** Niet-fatale bezwaren: ontbrekend bestand, kapotte JSON, geweigerde slugs. */
  bezwaren: string[];
};

const ROLLEN = new Set(['eigen', 'klant', 'systeem']);

export function leesRegistry(): Registry {
  const pad = registryPad();
  let ruw: string;
  try {
    ruw = readFileSync(pad, 'utf8');
  } catch {
    return {
      osRoot: null,
      klanten: [],
      bezwaren: [`geen registry op ${pad} — kopieer stand.local.example.json en vul de paden in`],
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(ruw);
  } catch (e) {
    return { osRoot: null, klanten: [], bezwaren: [`registry is geen geldige JSON: ${String(e)}`] };
  }

  const bezwaren: string[] = [];
  const obj = (json ?? {}) as Record<string, unknown>;
  const osRoot = typeof obj.osRoot === 'string' && obj.osRoot !== '' ? obj.osRoot : null;
  if (!osRoot) bezwaren.push('registry mist `osRoot` — zonder dat pad kan er niet gemeten worden');

  const rij = Array.isArray(obj.klanten) ? obj.klanten : [];
  if (rij.length === 0) bezwaren.push('registry bevat geen enkele klant');

  const klanten: KlantConfig[] = [];
  const gezien = new Set<string>();
  for (const k of rij) {
    const e = (k ?? {}) as Record<string, unknown>;
    const slug = typeof e.slug === 'string' ? e.slug : '';
    if (!slugGeldig(slug)) {
      bezwaren.push(`slug '${slug}' geweigerd — gereserveerd of geen kleine letters/cijfers/streepjes`);
      continue;
    }
    if (gezien.has(slug)) {
      bezwaren.push(`slug '${slug}' staat er twee keer in — de tweede is genegeerd`);
      continue;
    }
    const repo = typeof e.repo === 'string' ? e.repo : '';
    if (repo === '') {
      bezwaren.push(`klant '${slug}' heeft geen repo-pad`);
      continue;
    }
    const rol = typeof e.rol === 'string' && ROLLEN.has(e.rol) ? (e.rol as KlantConfig['rol']) : 'klant';
    gezien.add(slug);
    klanten.push({ slug, naam: typeof e.naam === 'string' && e.naam !== '' ? e.naam : slug, rol, repo });
  }

  return { osRoot, klanten, bezwaren };
}

export function klantBySlug(slug: string): KlantConfig | null {
  return leesRegistry().klanten.find((k) => k.slug === slug) ?? null;
}
