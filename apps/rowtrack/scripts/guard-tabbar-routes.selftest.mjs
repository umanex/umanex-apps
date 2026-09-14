#!/usr/bin/env node
/**
 * Tegenproef voor `guard-tabbar-routes.mjs` — tweezijdig.
 *
 * Rood kúnnen worden volstaat niet: de guard moet afgaan op precies het defect waarvoor hij
 * bestaat, zwijgen op een ongemuteerde kopie, én zwijgen op wat er alleen maar verdacht uitziet.
 *
 * **Elke mutatie eist een uitkomst op zijn effect.** De eerste versie van deze zelftest gebruikte
 * een regex die bij de eerste binnenste `/>` stopte; geval 4 en 5 slaagden daardoor op toeval van
 * de huidige propvolgorde, en een mutatie die niets raakte was van een geslaagde niet te
 * onderscheiden. `muteer` geeft nu terug wat hij veranderde, en een mutatie zonder effect is een
 * gezakt geval — CLAUDE.md, *een muterende stap is zelf een meting*.
 */

import { cpSync, mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HIER = fileURLToPath(new URL('.', import.meta.url));
const WORTEL = join(HIER, '..');
const GUARD = join(HIER, 'guard-tabbar-routes.mjs');

function draai(appRoot) {
  try {
    const uit = execFileSync('node', [GUARD], {
      env: { ...process.env, GUARD_APP_ROOT: appRoot },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, uit };
  } catch (e) {
    return { code: e.status ?? 1, uit: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

function kopie() {
  const dir = mkdtempSync(join(tmpdir(), 'guard-tabbar-'));
  mkdirSync(join(dir, 'app'), { recursive: true });
  cpSync(join(WORTEL, 'app'), join(dir, 'app'), { recursive: true });
  return dir;
}

const LAYOUT = 'app/(tabs)/_layout.tsx';

/** Knipt één heel `<Tabs.Screen …/>`-element weg — van zijn start tot de volgende, dus
 *  ongevoelig voor binnenste tags en voor de volgorde van de props. */
function zonderEersteScreen(bron) {
  const d = bron.split(/<Tabs\.Screen\b/);
  if (d.length < 3) return bron;
  return d[0] + d.slice(2).map((s) => '<Tabs.Screen' + s).join('');
}

const gevallen = [
  { naam: 'controle — ongemuteerd', verwacht: 0, bevat: null, muteer: () => 'geen' },

  { naam: 'story in (tabs)/', verwacht: 2, bevat: '[stories]',
    muteer: (d) => { writeFileSync(join(d, 'app/(tabs)/profile.stories.tsx'), 'export default {};\n'); return 'story'; } },

  // Vier van de zeven bestanden die dit defect veroorzaakten stonden in app/(auth)/, niet in
  // (tabs). Zonder dit geval blijft de recursieve helft van de [stories]-as ongetoetst.
  { naam: 'story buiten (tabs) — in (auth)/', verwacht: 2, bevat: '[stories]',
    muteer: (d) => { writeFileSync(join(d, 'app/(auth)/login.stories.tsx'), 'export default {};\n'); return 'story'; } },

  // expo-router: alléén `_layout` is een layout. De eerste guard sloeg alles met `_` over.
  { naam: 'underscore-bestand dat géén _layout is', verwacht: 2, bevat: '[tabs]',
    muteer: (d) => { writeFileSync(join(d, 'app/(tabs)/_helpers.tsx'), 'export default function H(){return null}\n'); return '_helpers'; } },

  // Een map zonder _layout is geen eigen navigator: zijn routes worden gehesen.
  { naam: 'geneste _layout weg — kinderen worden gehesen', verwacht: 2, bevat: '[tabs]',
    muteer: (d) => {
      const p = join(d, 'app/(tabs)/history/_layout.tsx');
      if (!existsSync(p)) return null;
      rmSync(p); return 'layout weg';
    } },

  // Negatieve controle: een map zonder routebestanden levert bij expo-router géén route op,
  // dus de guard hoort te zwijgen. De eerste versie meldde hem als ongedeclareerde tab.
  { naam: 'lege map in (tabs)/ — hoort GROEN te blijven', verwacht: 0, bevat: null,
    muteer: (d) => { mkdirSync(join(d, 'app/(tabs)/__notities')); writeFileSync(join(d, 'app/(tabs)/__notities/x.md'), '#\n'); return 'lege map'; } },

  { naam: 'niet-gedeclareerde route in (tabs)/', verwacht: 2, bevat: '[tabs]',
    muteer: (d) => { writeFileSync(join(d, 'app/(tabs)/verdwaald.tsx'), 'export default function X(){return null}\n'); return 'route'; } },

  { naam: 'declaratie weg terwijl de route blijft', verwacht: 2, bevat: '[tabs]',
    muteer: (d) => {
      const p = join(d, LAYOUT); const voor = readFileSync(p, 'utf8');
      const na = zonderEersteScreen(voor);
      if (na === voor) return null;
      writeFileSync(p, na); return 'screen weg';
    } },

  { naam: 'parser blind — geen enkele Tabs.Screen', verwacht: 2, bevat: 'kan hier niet meten',
    muteer: (d) => {
      const p = join(d, LAYOUT); const voor = readFileSync(p, 'utf8');
      const na = voor.replace(/<Tabs\.Screen\b/g, '<Tabs.Scherm');
      if (na === voor) return null;
      writeFileSync(p, na); return 'alle screens hernoemd';
    } },

  // De GEDEELTELIJKE parse-mislukking. Drie van de vier gelezen ziet er gezond uit en is het
  // niet: de guard zou dan een bestaande declaratie als ontbrekend melden.
  { naam: 'parser leest er één niet — hoort te stoppen, niet te oordelen', verwacht: 2, bevat: 'kan hier niet meten',
    muteer: (d) => {
      const p = join(d, LAYOUT); const voor = readFileSync(p, 'utf8');
      const na = voor.replace(/\bname=/, 'naam=');
      if (na === voor) return null;
      writeFileSync(p, na); return 'één name= hernoemd';
    } },

  { naam: 'kapotte opstelling — geen app/(tabs)/', verwacht: 2, bevat: 'kan hier niet meten',
    muteer: (d) => { rmSync(join(d, 'app/(tabs)'), { recursive: true }); return '(tabs) weg'; } },
];

let gezakt = 0;
for (const g of gevallen) {
  const dir = kopie();
  try {
    const effect = g.muteer(dir);
    if (effect === null) {
      gezakt++;
      console.error(`  ❌ ${g.naam} — de MUTATIE raakte niets; dit geval meet niets`);
      continue;
    }
    const { code, uit } = draai(dir);
    const codeOk = code === g.verwacht;
    const tekstOk = g.bevat === null || uit.includes(g.bevat);
    if (codeOk && tekstOk) {
      console.log(`  ✅ ${g.naam} — exit ${code}`);
    } else {
      gezakt++;
      console.error(`  ❌ ${g.naam} — exit ${code} (verwacht ${g.verwacht})${g.bevat && !tekstOk ? `, "${g.bevat}" ontbrak` : ''}`);
      console.error(`     uitvoer: ${uit.trim().split('\n').join(' | ')}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(gezakt === 0 ? `\n✅ tegenproef: ${gevallen.length}/${gevallen.length}` : `\n❌ tegenproef: ${gevallen.length - gezakt}/${gevallen.length}`);
process.exit(gezakt === 0 ? 0 : 1);
