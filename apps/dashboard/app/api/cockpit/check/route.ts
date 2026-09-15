import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { weigerNietLokaal } from '@/lib/localOnly';
import { weigering, zoekCheck } from '@/lib/cockpitCheckRules.mjs';
import { leesWerkvoorraad } from '@/lib/stand/lezen';
import { klantBySlug } from '@/lib/stand/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Draait het `Check`-commando van één lus-entry, en niets anders.
 *
 * De request noemt een klant, een bestand en een datum. Wát er draait komt uit de gemeten
 * `cockpit/werkvoorraad.json` — nooit uit de request. Dat is de reden dat deze route geen
 * commando-parameter heeft en er ook nooit een krijgt: zodra het commando uit de request
 * komt, is elke poort erachter cosmetisch.
 *
 * Drie sluizen, in deze volgorde:
 *   1. loopback — dezelfde als de vier bestaande routes, als eerste regel
 *   2. de meting — de entry moet bestaan en een commando dragen
 *   3. de poort — allowlist per pijplijnsegment, plus een denylist op de hele tekst
 */
export async function POST(request: Request) {
  const nietLokaal = weigerNietLokaal(request);
  if (nietLokaal) return nietLokaal;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: 'geen geldige JSON in de request' }, { status: 400 });
  }

  const { klant, bestand, datum } = (body ?? {}) as Record<string, unknown>;
  if (typeof klant !== 'string' || typeof bestand !== 'string' || typeof datum !== 'string') {
    return NextResponse.json({ fout: 'klant, bestand en datum zijn verplicht' }, { status: 400 });
  }

  const config = klantBySlug(klant);
  if (!config) return NextResponse.json({ fout: `onbekende klant '${klant}'` }, { status: 404 });
  if (!existsSync(config.repo)) {
    return NextResponse.json(
      { fout: `de repo van ${klant} staat niet op ${config.repo}` },
      { status: 409 },
    );
  }

  const werk = leesWerkvoorraad(klant);
  if (werk.staat === 'ontbreekt') {
    return NextResponse.json({ fout: werk.reden }, { status: 409 });
  }

  const gevonden = zoekCheck(werk.signaal.data, bestand, datum);
  if ('fout' in gevonden) return NextResponse.json({ fout: gevonden.fout }, { status: 404 });

  const reden = weigering(gevonden.commando);
  if (reden) return NextResponse.json({ fout: reden }, { status: 409 });

  // `/bin/zsh -lc` net als lib/launch.ts: de checks zijn geschreven om in Jeroens eigen
  // shell te draaien, met zijn pad en zijn aliassen. Een andere shell zou ze anders laten
  // falen dan ze in een terminal doen, en dan meet de knop iets anders dan de entry belooft.
  try {
    const uitvoer = execFileSync('/bin/zsh', ['-lc', gevonden.commando], {
      cwd: config.repo,
      timeout: 20_000,
      maxBuffer: 1024 * 256,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return NextResponse.json({ code: 0, commando: gevonden.commando, uitvoer: kort(uitvoer) });
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string; signal?: string };
    // Een niet-nul exit is géén fout van deze route: dat ís de uitkomst van de check, en
    // meestal betekent het dat het item nog leeft. Alleen een timeout of een crash van de
    // shell zelf is een fout, en die herken je aan het ontbreken van een exit-status.
    if (typeof err.status === 'number') {
      return NextResponse.json({
        code: err.status,
        commando: gevonden.commando,
        uitvoer: kort(`${err.stdout ?? ''}${err.stderr ?? ''}`),
      });
    }
    return NextResponse.json(
      { fout: err.signal === 'SIGTERM' ? 'het commando duurde langer dan 20 s' : String(e) },
      { status: 500 },
    );
  }
}

/** Genoeg om te lezen, te weinig om de pagina onbruikbaar te maken. */
function kort(tekst: string): string {
  const regels = tekst.split('\n');
  if (regels.length <= 30) return tekst.trimEnd();
  return `${regels.slice(0, 30).join('\n')}\n… en ${regels.length - 30} regels meer`;
}
