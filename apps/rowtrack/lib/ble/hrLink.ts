import type { HRStatus, HrBleErrorCode } from './types';

/**
 * Wanneer mag een hartslagverbinding zich "verbonden" noemen?
 *
 * Niet wanneer de GATT-link staat — dat kan op iOS zonder één radiotransactie, want
 * een horloge dat al aan de telefoon hangt laat `connectToDevice` door de
 * `peripheral.isConnected`-guard vallen en service discovery antwoordt uit de cache.
 * Pas een binnengekomen meting bewijst iets.
 *
 * Die regel staat hier apart van de dienst, want in de dienst is hij niet te toetsen:
 * daar zit hij verweven met timers en een `BleManager` die buiten een toestel niet
 * bestaat. Een test tegen een namaak-BLE-stack toetst de namaak, niet de regel. Als
 * pure overgangsfunctie is hij wél te toetsen — de dienst houdt de timers, deze
 * module houdt de beslissing.
 *
 * De keerzijde staat er sinds 2026-08-20 naast: stilte telt alleen als bewijs
 * wanneer we konden luisteren. Ging de app naar de achtergrond, dan zwijgt élke
 * band, en een deadline die daar doorheen loopt meet de app in plaats van het
 * toestel. Zie `suspended`/`resumed`.
 */

export type HrLinkPhase =
  /** Niets verbonden, of losgelaten. */
  | 'idle'
  /** Abonnement staat, nog geen meting gezien. De rij mag hier niet groen zijn. */
  | 'waiting'
  /** Er is minstens één bruikbare meting binnengekomen. */
  | 'live';

export type HrLinkState = {
  phase: HrLinkPhase;
  /** Kwam deze verbinding van autoconnect? Die mag stil falen, een handmatige niet. */
  silent: boolean;
};

export type HrLinkEvent =
  /** Het notify-abonnement is geïnstalleerd. Bewijst nog niets. */
  | { type: 'subscribed'; silent: boolean }
  /**
   * Er kwam een meting binnen. `usable` is false voor 0 bpm of een waarde buiten het
   * fysiologische bereik — een horloge van de pols meldt dat, en dat is technisch
   * leven maar praktisch geen hartslag. Zulke packets verzetten de deadline bewust
   * níet, anders houdt een band die alleen maar nullen stuurt zichzelf eeuwig geldig.
   */
  | { type: 'measurement'; usable: boolean }
  /** De deadline verliep: er kwam te lang niets bruikbaars. */
  | { type: 'silence' }
  /** Wij lieten het toestel los (stop, nieuwe scan, opruimen). */
  | { type: 'released' }
  /**
   * De app verdween naar de achtergrond. iOS schorst haar dan op — RowTrack vraagt
   * geen `bluetooth-central` background mode (`app.json`) — dus er kómt niets binnen,
   * hoe gezond de band ook is. Stilte bewijst vanaf hier niets meer.
   */
  | { type: 'suspended' }
  /**
   * De app staat weer vooraan. De band krijgt een vol venster om zich opnieuw te
   * bewijzen, in plaats van meteen af te gaan op stilte die niet van hem kwam.
   */
  | { type: 'resumed' };

export type HrLinkEffect = {
  /** Status om te publiceren, als er iets te melden valt. */
  status?: HRStatus;
  error?: HrBleErrorCode;
  /** Deadline (opnieuw) zetten. */
  rearmDeadline?: boolean;
  /**
   * Deadline stilzetten zonder hem te vervangen. Alleen voor tijd die niet van de
   * band komt — zie `suspended`. Een deadline die blijft staan terwijl de app
   * bevroren is, vuurt bij terugkeer meteen af over een band die gewoon meet.
   */
  clearDeadline?: boolean;
  /** Het toestel loslaten. */
  release?: boolean;
};

export const initialHrLink: HrLinkState = { phase: 'idle', silent: false };

export function stepHrLink(
  state: HrLinkState,
  event: HrLinkEvent,
): { state: HrLinkState; effect: HrLinkEffect } {
  switch (event.type) {
    case 'subscribed':
      return {
        state: { phase: 'waiting', silent: event.silent },
        effect: { status: 'waiting', rearmDeadline: true },
      };

    case 'measurement': {
      // Een late callback van een toestel dat we al losgelaten hebben mag niets meer
      // aanzetten — anders springt de rij terug op groen ná een verbreking.
      if (state.phase === 'idle') return { state, effect: {} };
      if (!event.usable) return { state, effect: {} };
      if (state.phase === 'waiting') {
        return {
          state: { ...state, phase: 'live' },
          effect: { status: 'connected', rearmDeadline: true },
        };
      }
      // Al live: niets te melden, alleen de deadline opschuiven.
      return { state, effect: { rearmDeadline: true } };
    }

    case 'silence': {
      if (state.phase === 'idle') return { state, effect: {} };
      // Autoconnect die nooit iets ontving vroeg de gebruiker niets, dus meldt ook
      // niets: de rij valt terug op "Verbinden". Alle andere gevallen wel — bij een
      // handmatige poging wacht iemand op antwoord, en bij een verbinding die eerst
      // wél data gaf is het stilvallen zélf het nieuws.
      const stil = state.silent && state.phase === 'waiting';
      return {
        state: { phase: 'idle', silent: false },
        effect: stil
          ? { status: 'idle', release: true }
          : { status: 'error', error: 'hr_no_data', release: true },
      };
    }

    case 'released':
      // De aanroeper regelt de status zelf (stop → 'idle', nieuwe scan → 'scanning').
      return { state: { phase: 'idle', silent: false }, effect: {} };

    case 'suspended':
      // De fase blijft staan: de verbinding is niet veranderd, alleen ons vermogen
      // om hem te horen. Enkel de klok gaat uit.
      if (state.phase === 'idle') return { state, effect: {} };
      return { state, effect: { clearDeadline: true } };

    case 'resumed':
      // Een vol venster, niet het restant van vóór de achtergrond. Meet de band nog,
      // dan is de eerste meting binnen een seconde binnen; meet hij niet meer, dan
      // valt hij alsnog af — even snel als anders, maar op zijn eigen stilte.
      if (state.phase === 'idle') return { state, effect: {} };
      return { state, effect: { rearmDeadline: true } };
  }
}
