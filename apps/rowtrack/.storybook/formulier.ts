/**
 * Eén formulier invullen en versturen vanuit een `play`, zodat de foutvorm van een scherm een
 * render-pad krijgt.
 *
 * WAAROM DIT BESTAAT. De drie auth-schermen houden hun serverfout in `useState` ná een submit.
 * Van buitenaf is die state niet te zetten zonder de productiecode iets over stories te
 * leren — een prop of een `__DEV__`-tak. Door de submit werkelijk te doorlopen (met een
 * gemockte GoTrue die faalt, zie `parameters.supabase.authFout`) toont de story de échte
 * foutweg, en blijft het scherm zelf onwetend van Storybook.
 *
 * TWEE DINGEN DIE NIET VANZELF GAAN, allebei gemeten op 2026-09-14:
 *
 * 1. `el.value = 'x'` bereikt de React-state niet. React luistert naar zijn eigen
 *    `input`-event; de waarde moet dus via de native setter van `HTMLInputElement` gaan.
 * 2. Een `TouchableOpacity` van react-native-web is geen `<button>`. De knop is te vinden op
 *    zijn LABEL — de bladnode die exact die tekst draagt — niet op een rol of een tag.
 */
export const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Zet een waarde zó dat React hem oppikt. */
export function zetVeld(el: HTMLInputElement, waarde: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, waarde);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Vult de invoervelden op volgorde en klikt daarna de knop met dit label aan.
 *
 * Gooit wanneer er minder velden zijn dan waarden, of wanneer de knop niet gevonden wordt:
 * een `play` die stil niets doet levert een story op die de oude vorm toont en er groen
 * uitziet — precies het gat dat deze helper moet sluiten.
 */
export async function vulEnVerstuur(wortel: HTMLElement, waarden: string[], knoplabel: string) {
  // `Array.from` in plaats van spread: de tsconfig hier mikt op een lib zonder
  // NodeList-iterator, en dat is geen reden om de tsconfig te verzetten.
  const velden = Array.from(wortel.querySelectorAll('input')) as HTMLInputElement[];
  if (velden.length < waarden.length) {
    throw new Error(`vulEnVerstuur: ${waarden.length} waarden, maar ${velden.length} invoerveld(en) gevonden`);
  }
  waarden.forEach((w, i) => zetVeld(velden[i], w));
  await wacht(50);
  const knop = Array.from(wortel.querySelectorAll('div,span'))
    .find((e) => e.textContent?.trim() === knoplabel && e.children.length === 0);
  if (!knop) throw new Error(`vulEnVerstuur: geen knop met label "${knoplabel}"`);
  knop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await wacht(400);
  // Het klaar-signaal voor elk instrument dat de DOM leest; de tegenhanger staat in
  // .storybook/preview.tsx. Zonder deze regel legt de bouwspec-walker het formulier van vóór
  // de submit vast en staat er in Figma een frame dat de foutvorm niet toont.
  document.documentElement.dataset.play = 'klaar';
}
