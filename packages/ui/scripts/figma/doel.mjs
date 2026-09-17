/**
 * De vaste feiten van de Figma-keten voor packages/ui — één plek, gelezen door story-axes,
 * build-spec, build-prune, de builder (via de min-spec) en figma-sync-check.mjs.
 *
 * WAAROM ÉÉN MODULE. De uitsluitingslijsten stonden tot 2026-09-16 alleen in de sync-guard. De
 * bouwspec moet dezelfde lijst lezen, anders bouwt hij een variant-as die de guard daarna als
 * "code kent hem niet" afkeurt — twee kopieën van een oordeel lopen stil uiteen.
 */

/** Het doelbestand. Een identiteit, geen naam: de naam verandert zodra iemand hem hernoemt. */
export const FILE_KEY = 'ko2OuasYxyY2YRD69MYhWX';

/**
 * De vijftien componenten die met de hand gebouwd zijn, vóór deze keten bestond. Hun node-ids
 * staan als deep-link in de stories en in figma/manifest.json; een herbouw zou die breken.
 * De keten slaat ze daarom over, en `bouw-batch.js` weigert een batch die er één noemt.
 */
export const LEGACY = [
  'Badge', 'Button', 'Card', 'Checkbox', 'DropdownMenu', 'Input', 'Label', 'NativeSelect',
  'Separator', 'Sheet', 'Slider', 'Tabs', 'Textarea', 'ThemeToggle', 'Tooltip',
];

/**
 * Welke node is op een pagina de component — en welke `data-slot` draagt hij in de DOM.
 *
 * Standaard heet de component zoals de pagina en is zijn slot de kebab-vorm daarvan
 * (`Switch` → `switch`). Een overlay is de uitzondering: in Figma is de CONTENT de component,
 * niet de trigger (zelfde conventie als de handgebouwde `SheetContent` en `TooltipContent`).
 */
export const PRIMAIR = {
  Dialog: { naam: 'DialogContent', slot: 'dialog-content' },
};

export const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

/** `{ naam, slot }` voor een paginanaam. */
export const primairVan = (pagina) => PRIMAIR[pagina] ?? { naam: pagina, slot: kebab(pagina) };

/**
 * Props die de code kent maar die GEEN visuele variant-as zijn. Elke uitsluiting draagt zijn
 * reden, zodat ze telbaar is in plaats van stilzwijgend weggelaten — een weggelaten as ziet er
 * in het rapport identiek uit aan een as die klopt.
 *
 * Numerieke controls (Slider.min/max/step) staan hier bewust NIET in: `control: 'number'`
 * levert geen options, dus de as-lezer ziet ze per constructie al niet als as. Een uitsluiting
 * die nooit vuurt zou een filtering suggereren die niet plaatsvindt.
 */
export const NIET_VISUEEL = {
  'Input.type': 'HTML input-type; verandert het uiterlijk van het veld niet',
  'Tooltip.side': 'bepaalt de plaatsing t.o.v. de trigger, niet het uiterlijk van TooltipContent',
};

/**
 * Assen die alleen in Figma bestaan omdat de code ze als interne state draagt (geen prop, dus
 * niet uit cva of argTypes af te leiden). Ook hier: mét reden.
 */
export const FIGMA_ONLY = {
  'ThemeToggle.mode': 'useState(isDark) bepaalt Moon vs Sun; interne state, geen prop',
};
