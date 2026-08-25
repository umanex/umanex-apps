/**
 * Kiest de build-map van de flow-harness uit de argumenten. Apart gezet zodat de guard
 * zonder bijwerkingen te toetsen is: `node -e` met een lijst argumenten, niets wordt gespawnd.
 *
 * Alleen twee namen, letterlijk. `next build` maakt de doelmap eerst leeg (cleanDistDir,
 * default true), dus vrije invoer is een wisser: `--dist=.` zou apps/cashflow wissen,
 * `--dist=..` apps/, en `--dist=.NEXT` op een hoofdletterongevoelige schijf `.next` zelf —
 * de map waar PM2 op :3000 uit leest. Daarom geen normalisatie en geen insluitingscheck,
 * maar een allowlist; Next zelf weigert alleen '' en 'public' (server/config.js:215-225).
 */
export const LIVE = '.next';
export const EIGEN = '.next-harness';

export function kiesDist(args) {
  // Streng op de vorm: `--dist .next`, `--dist` zonder `=`, `--DIST=` of een tweede `--dist=`
  // zouden anders stil terugvallen op de default — en die bouwt.
  const opties = args.filter((a) => /^-{1,2}dist\b/i.test(a));
  if (opties.length > 1) {
    throw new Error(`--dist staat ${opties.length} keer (${opties.join(' ')}); één keer, met '=': --dist=${LIVE}`);
  }
  const optie = opties[0];
  if (optie !== undefined && !optie.startsWith('--dist=')) {
    throw new Error(`${JSON.stringify(optie)}: schrijf --dist=${LIVE} (met '=', kleine letters) — anders valt de harness stil terug op ${EIGEN} en bouwt hij.`);
  }
  const DIST = optie?.slice('--dist='.length) ?? EIGEN;
  if (DIST !== LIVE && DIST !== EIGEN) {
    throw new Error(
      `--dist=${JSON.stringify(DIST)} is niet toegestaan: alleen ${LIVE} (serveer een bestaande build, bouw niet) ` +
        `of ${EIGEN} (bouw en serveer). \`next build\` maakt de doelmap eerst leeg, dus een vrije naam is een wisser.`,
    );
  }
  const LIVE_MAP = DIST === LIVE;
  return { DIST, LIVE_MAP, BOUWEN: !LIVE_MAP && !args.includes('--no-build') };
}
