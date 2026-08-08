'use client';

import { useEffect, useRef } from 'react';

/**
 * Houdt een gesloten overlay buiten de tab-volgorde.
 *
 * Waarom dit bestaat: beide sidepanels blijven gemonteerd wanneer ze dicht zijn — de
 * schuif-animatie heeft dat nodig — en werden alleen met `translate-x-full` uit beeld
 * geschoven. Ze bleven daardoor volwaardig bereikbaar: tabben landde in een paneel dat
 * niemand geopend had, en `aria-modal="true"` vertelde screenreaders bovendien dat de
 * rest van de pagina er niet toe deed. `aria-hidden` alleen lost dat niet op — dat haalt
 * het paneel uit de accessibility tree maar laat het tabbaar, wat erger is dan niets:
 * focus verdwijnt dan naar een element waarover de screenreader zwijgt.
 *
 * `inert` doet beide: uit de tab-volgorde én uit de accessibility tree. Het staat hier
 * imperatief in plaats van als JSX-attribuut omdat React 18 het niet als prop kent.
 *
 * Kanttekening: server-rendered HTML draagt het attribuut nog niet, dus tussen de eerste
 * paint en de hydratatie is een gesloten paneel kort tabbaar. Het `aria-hidden` in de JSX
 * dekt datzelfde venster wél, dus wat overblijft is een focus-blip van enkele
 * milliseconden op een leeg paneel.
 */
export function useInertWhenClosed(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.inert = !open;
  }, [open]);

  return ref;
}
