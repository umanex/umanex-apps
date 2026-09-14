#!/usr/bin/env node
/**
 * Tegenproef voor `guard-tabbar-routes.mjs` — tweezijdig.
 *
 * Rood kúnnen worden volstaat niet: de guard moet afgaan op precies het defect waarvoor hij
 * bestaat, en zwijgen op een ongemuteerde kopie. Vijf gevallen, elk op een wegwerpkopie van de
 * echte `app/`-boom:
 *
 *   1  controle          ongemuteerd            → exit 0
 *   2  story in app/     het gemeten defect     → exit 2, [stories]
 *   3  route erbij       een vijfde tab         → exit 2, [tabs]
 *   4  declaratie weg    de andere richting     → exit 2, [tabs]
 *   5  parser blind      geen Tabs.Screen meer  → exit 2, en NIET stil groen
 *
 * Geval 5 is de negatieve controle op de guard zelf: een parser die niets meer matcht, ziet er
 * in de uitvoer identiek uit aan "alles in orde". Zonder dit geval meet een groene run niets.
 */

import { cpSync, mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
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
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
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

const gevallen = [
  {
    naam: 'controle — ongemuteerd',
    muteer: () => {},
    verwacht: 0,
    bevat: null,
  },
  {
    naam: 'story in de routeboom',
    muteer: (d) => writeFileSync(join(d, 'app/(tabs)/profile.stories.tsx'), 'export default {};\n'),
    verwacht: 2,
    bevat: '[stories]',
  },
  {
    naam: 'niet-gedeclareerde route in (tabs)/',
    muteer: (d) => writeFileSync(join(d, 'app/(tabs)/verdwaald.tsx'), 'export default function X(){return null}\n'),
    verwacht: 2,
    bevat: '[tabs]',
  },
  {
    naam: 'declaratie weg terwijl de route blijft',
    muteer: (d) => {
      const p = join(d, 'app/(tabs)/_layout.tsx');
      const bron = readFileSync(p, 'utf8');
      // knip het eerste <Tabs.Screen …/>-blok weg
      writeFileSync(p, bron.replace(/<Tabs\.Screen[\s\S]*?\/>\s*/, ''));
    },
    verwacht: 2,
    bevat: '[tabs]',
  },
  {
    naam: 'parser blind — geen enkele Tabs.Screen',
    muteer: (d) => {
      const p = join(d, 'app/(tabs)/_layout.tsx');
      const bron = readFileSync(p, 'utf8');
      writeFileSync(p, bron.replace(/<Tabs\.Screen[\s\S]*?\/>\s*/g, ''));
    },
    verwacht: 2,
    bevat: 'dit meet niets',
  },
];

let gezakt = 0;
for (const g of gevallen) {
  const dir = kopie();
  try {
    g.muteer(dir);
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
