/**
 * De gedeelde focus-ring van de umanex-rollaag.
 *
 * Waarom een constante en niet "gewoon overtikken": de klassenreeks stond tot nu toe
 * alleen in `buttonVariants`, waardoor elk element dat géén Button is zijn eigen vorm
 * verzon. In jobradar leverde dat er drie naast elkaar op — de ring van @umanex/ui, een
 * `focus-visible:outline`-variant in app-code, en helemaal niets (browserstandaard) op de
 * links. Drie vormen die alle drie "zichtbaar" zijn, en juist daarom nooit opvallen.
 *
 * De reeks is compleet en zelfdragend: `ring-offset-background` hoort erbij, want zonder
 * die klasse valt de 2px offset terug op Tailwinds default (wit) en krijgt elk element in
 * dark mode een witte halo. Bewust NIET erin: `transition-colors` — dat gaat over hover,
 * niet over focus, en hoort dus bij de component die het nodig heeft.
 *
 * Gebruik: `className={cn(focusRing, 'rounded …')}`. Geef het element ook een radius mee;
 * de ring volgt de border-radius van waar hij omheen ligt.
 */
export const focusRing =
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
