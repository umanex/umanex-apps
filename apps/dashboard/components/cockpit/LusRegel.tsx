'use client';

import { useState } from 'react';
import { Play, Terminal } from 'lucide-react';
import { Badge } from '@umanex/ui/components/ui/badge';
import { Button } from '@umanex/ui/components/ui/button';
import type { WerkvoorraadRij } from '@/lib/stand/types';

type Props = {
  rij: WerkvoorraadRij;
  klant: string;
  /** Uit staat de knop volledig; de cockpit van een klant mag nooit shell draaien. */
  checksToegestaan: boolean;
};

type Uitkomst = { code: number; uitvoer: string } | { fout: string } | null;

/**
 * Eén open lus-item, met de mogelijkheid zijn `Check` te draaien.
 *
 * Waarom die knop er is: 146 van de 326 open items dragen een uitvoerbaar commando in hun
 * `- **Check:**`-regel. Dat is geen documentatie maar een testsuite die per ongeluk
 * geschreven is — en hem draaien vindt de items die stil dicht zijn maar nog op `open`
 * staan, precies de faalvorm die de HANDOFF-template zelf beschrijft.
 *
 * Waarom hij zo voorzichtig is: dit voert shell uit op basis van tekst uit een
 * markdownbestand. Het commando staat daarom altijd zichtbaar vóór je klikt, er draait
 * er nooit meer dan één tegelijk, en de server kent alleen het itemnummer — niet het
 * commando. Wat er draait komt van de server, niet uit deze request.
 */
export const LusRegel = ({ rij, klant, checksToegestaan }: Props) => {
  const [bezig, setBezig] = useState(false);
  const [uitkomst, setUitkomst] = useState<Uitkomst>(null);

  const draaiCheck = async () => {
    setBezig(true);
    setUitkomst(null);
    try {
      const res = await fetch('/api/cockpit/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ klant, bestand: rij.bestand, datum: rij.datum }),
      });
      const json = (await res.json()) as { code?: number; uitvoer?: string; fout?: string };
      setUitkomst(
        typeof json.fout === 'string'
          ? { fout: json.fout }
          : { code: json.code ?? -1, uitvoer: json.uitvoer ?? '' },
      );
    } catch (e) {
      setUitkomst({ fout: `check kon niet draaien: ${String(e)}` });
    } finally {
      setBezig(false);
    }
  };

  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">{rij.titel}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{rij.datum}</span>
            <span>{rij.leeftijd} d open</span>
            {rij.type ? (
              <Badge variant="secondary" className="font-normal">
                {rij.type}
              </Badge>
            ) : null}
            <span className="font-mono">{rij.bestand}</span>
          </p>
        </div>
        {rij.check ? (
          checksToegestaan ? (
            <Button size="sm" variant="secondary" onClick={draaiCheck} disabled={bezig}>
              <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {bezig ? 'draait…' : 'Check'}
            </Button>
          ) : null
        ) : (
          // Een entry zónder uitvoerbare check is zelf een bevinding: de HANDOFF-template
          // schrijft er een voor, juist omdat een item dat een staat vastlegt in plaats van
          // een check stil veroudert en daarna elke ochtend terugkomt als openstaand werk.
          <Badge variant="outline" className="font-normal text-muted-foreground">
            geen check
          </Badge>
        )}
      </div>

      {rij.check ? (
        <p className="mt-2 flex items-start gap-1.5 overflow-x-auto rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
          <Terminal className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="whitespace-pre">{rij.check}</span>
        </p>
      ) : null}

      {uitkomst ? (
        'fout' in uitkomst ? (
          <p role="status" className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs">
            {uitkomst.fout}
          </p>
        ) : (
          <div
            role="status"
            className={`mt-2 rounded-md border px-2.5 py-1.5 text-xs ${
              uitkomst.code === 0
                ? 'border-success/40 bg-success/10'
                : 'border-warning/40 bg-warning/10'
            }`}
          >
            <p className="font-medium">
              exit {uitkomst.code}
              {uitkomst.code === 0
                ? ' — het commando slaagde; kijk of dat betekent dat dit item dicht kan'
                : ' — het commando faalde; dit item leeft waarschijnlijk nog'}
            </p>
            {uitkomst.uitvoer ? (
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-2xs text-muted-foreground">
                {uitkomst.uitvoer}
              </pre>
            ) : null}
          </div>
        )
      ) : null}
    </li>
  );
};
