/**
 * Welke story-componenten een SCHERM zijn in plaats van een library-component.
 *
 * EEN BRON. Deze lijst stond tot 2026-09-08 twee keer los in de repo — als frame-namen in
 * `figma-build-spec.mjs` en als reden-tekst in `figma-sync-check.mjs` — en `figma-links.mjs`
 * kende hem helemaal niet. Drie plekken die hetzelfde moeten weten en het los opschrijven,
 * lopen uiteen zodra er een scherm bijkomt.
 *
 * WAT EEN SCHERM ONDERSCHEIDT. Een component is herbruikbaar en hoort in de library; een
 * scherm is een compositie die je één keer samenstelt. Twee gevolgen, allebei afdwingbaar:
 *
 *  · Geen variant-assen. `bleStatus × hrStatus × phase × hasProfileWeight` zou 160 nodes
 *    eisen voor één scherm, en die assen zijn in beeld niet orthogonaal. In plaats daarvan
 *    een handvol REPRESENTATIEVE frames, met de hand gekozen — dat is `frames` hieronder.
 *  · Geen pagina in het library-bestand. Een scherm hoort in `RowTrack - Design` op
 *    *Screens v2*, niet tussen de componenten. `[pagina]`, `[link]` en `figma-links.mjs`
 *    slaan ze daarom over — expliciet en telbaar, niet door de as zachter te maken.
 */
export const SCHERMEN = {
  ActivePhase: {
    // 'Samenvatting Zonder Gewicht' erbij op 2026-09-14: het enige frame met het sterretje
    // achter kcal, en dus het enige waarin de legende eronder te zien is (UX-audit
    // 2026-07-16, F19). De inhoud komt uit de OVERLAY van dat frame, niet uit de boom — een
    // react-native-web `<Modal>` portaleert buiten `#storybook-root` en de walker zet hem
    // sinds 2026-09-08 als aparte overlay naast de schermboom.
    // 'Zonder Toestemming' erbij op 2026-09-16: het enige frame met een geblokkeerde BPM-rij.
    // Zonder toestemming voor gezondheidsgegevens is die rij '—' en niet tikbaar (functionele
    // review F4) — een echte gebruikerstoestand die in geen ander frame te zien is. De variant
    // zelf bestaat al in de library (KpiRow disabled), dus dit vraagt geen nieuw component.
    frames: ['Playground', 'Doel Afstand', 'Zonder Hartslagband', 'Doel Bereikt', 'Samenvatting', 'Samenvatting Zonder Gewicht', 'Landscape', 'Zonder Toestemming'],
    reden: 'schermcompositie — bleStatus × hrStatus × phase × hasProfileWeight zou 160 nodes eisen voor één scherm, en die assen zijn in beeld niet orthogonaal; hoort in RowTrack - Design op Screens v2',
  },
  IdlePhase: {
    frames: ['Playground', 'Niet Verbonden', 'Doel Afstand', 'Toestel Keuze'],
    reden: 'schermcompositie — idem, 320 nodes; hoort in RowTrack - Design op Screens v2',
  },

  // ── De ROUTE-schermen (fase 1 van de schermen-briefing, 2026-09-09) ────────────────────
  // Deze zeven hadden tot vandaag geen render-pad. Ze staan in `app/`, niet in `components/`,
  // en hun stories leunen op de mocks in `.storybook/mocks/` — expo-router voor de navigatie
  // en een vulbare supabase voor de data én de sessie.
  //
  // Ze zijn per definitie een scherm: een route is geen herbruikbaar ding. Hun `reden` is
  // daarom korter dan die van ActivePhase/IdlePhase — daar was het een oordeel over
  // variant-assen, hier volgt het uit wat ze zijn.
  //
  // 'Met Fout' kwam er op 2026-09-14 bij. Deze drie hadden één frame omdat hun tweede vorm —
  // de serverfout — in `useState` zit en pas ná een submit bestaat; een story kon hem niet
  // tonen. Dat kan nu wél, via `parameters.supabase.authFout` plus een `play` die het
  // formulier verstuurt (zie .storybook/formulier.ts). Ze zijn dus geen uitzondering meer op
  // "elk route-scherm heeft minstens twee frames".
  LoginScreen: { frames: ['Playground', 'Met Fout'], reden: 'route-scherm — een route is geen herbruikbaar component; hoort in RowTrack - Design op Screens v2' },
  RegisterScreen: { frames: ['Playground', 'Met Fout'], reden: 'route-scherm — idem' },
  ForgotPasswordScreen: { frames: ['Playground', 'Met Fout'], reden: 'route-scherm — idem' },
  ResetPasswordScreen: { frames: ['Playground', 'Met Link'], reden: 'route-scherm — idem' },
  HistoryScreen: { frames: ['Playground', 'Leeg', 'Een Record'], reden: 'route-scherm — idem' },
  WorkoutDetailScreen: { frames: ['Playground', 'Zonder Hartslag', 'Niet Gevonden'], reden: 'route-scherm — idem' },
  ProfileScreen: { frames: ['Playground', 'Onvolledig', 'Zonder Gewicht'], reden: 'route-scherm — idem' },
};

/** Is dit story-component een scherm? */
export const isScherm = (comp) => Object.hasOwn(SCHERMEN, comp);
