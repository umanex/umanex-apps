'use client';

import { useEffect } from 'react';

/**
 * Sluit een overlay met Escape.
 *
 * Waarom dit bestaat: geen van de twee modals en geen van de twee sidepanels luisterde
 * naar Escape. Dat is de reflex van iedereen die per ongeluk een overlay opent, en het
 * dialogpatroon van WAI-ARIA vraagt het expliciet. Vier plaatsen, één gedrag — vandaar
 * een hook en geen vier losse listeners.
 *
 * `actief` staat er voor de sidepanels: die blijven gemonteerd wanneer ze dicht zijn (de
 * schuif-animatie heeft dat nodig), en een dicht paneel mag niet meeluisteren.
 *
 * De `defaultPrevented`-guard is er voor het geval twee overlays ooit tegelijk open staan:
 * wie als eerste sluit, markeert het event, zodat er niet twee tegelijk dichtklappen. In
 * de huidige app is dat niet bereikbaar — een open sidepanel legt zijn scrim over de
 * knoppen die een modal openen — maar de guard kost niets en de aanname kan verlopen.
 */
export function useDismissOnEscape(onDismiss: () => void, actief = true) {
  useEffect(() => {
    if (!actief) return;

    const opToets = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      onDismiss();
    };

    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, [actief, onDismiss]);
}
