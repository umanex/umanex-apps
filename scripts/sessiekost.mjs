#!/usr/bin/env node
// sessiekost.mjs — wat een sessie kost, en wanneer knippen goedkoper is dan doorgaan.
//
//   node scripts/sessiekost.mjs              # de sessies van deze repo, nieuwste eerst
//   node scripts/sessiekost.mjs --alle       # alle repo's
//   node scripts/sessiekost.mjs --dagen 7    # venster (default 14)
//
// WAAROM. LEARNINGS 2026-09-11 stelde vast dat geen enkele check, guard of samenvatting in
// deze repo's kijkt naar wat een wijziging kost aan looptijd of geld — een verviervoudiging
// kon stil landen en drie uur later terugkomen als "CI is stuk". Dit dekt de tokenkant van
// die as. De CI-minutenkant (job-budget) is een andere as en staat nog in BACKLOG.md.
//
// DE MEETEENHEID. Kosten worden uitgedrukt in input-token-equivalenten, omdat de soorten
// verschillend geprijsd zijn: cache-read telt 0,1x, cache-creatie 1,25x, output 5x. Dat is
// een verhouding, geen valuta — het vergelijkt sessies met elkaar, niet met je factuur.
//
// WAT DE METING OPLEVERDE (103 sessies, 2026-09-01 → 09-18, 40 838 turns):
//   · 74,3% van alle kost is cache-read: de conversatie die bij élke beurt meereist
//   · één extra tool-call kost gemiddeld 44,3k eenheden en levert mediaan 0,4k tekens op
//   · kost per turn groeit met de sessie: 30,6k (<50 turns) → 65,8k (>1500 turns)
// Daarom is de marginale kost per turn het signaal, niet het totaal: hij zegt wat de vólgende
// beurt gaat kosten. Verdubbelt hij, dan is een verse sessie met dezelfde opdracht goedkoper
// dan doorgaan.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const WEGING = { input: 1, cache_creation: 1.25, cache_read: 0.1, output: 5 };
const WORTEL = join(homedir(), ".claude", "projects");

const arg = (naam, standaard) => {
  const i = process.argv.indexOf(naam);
  return i === -1 ? standaard : process.argv[i + 1];
};
const alle = process.argv.includes("--alle");
const dagen = Number(arg("--dagen", 14));
const grens = Date.now() - dagen * 864e5;

if (!existsSync(WORTEL)) {
  console.error(`geen transcripts op ${WORTEL} — niets te meten`);
  process.exit(2); // niet 0: "niets gevonden" is geen geslaagde meting
}

// De map-naam is de cwd met '/' → '-'. Zonder --alle meten we alleen deze repo.
const hier = process.cwd().replace(/\//g, "-");
const mappen = readdirSync(WORTEL).filter((m) => alle || m === hier || hier.startsWith(m + "-"));

const sessies = [];
for (const m of mappen) {
  const dir = join(WORTEL, m);
  let bestanden;
  try { bestanden = readdirSync(dir).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
  for (const f of bestanden) {
    const pad = join(dir, f);
    let st;
    try { st = statSync(pad); } catch { continue; }
    if (st.mtimeMs < grens) continue;
    const s = { id: f.slice(0, 8), repo: m, turns: 0, kost: 0, soort: { input: 0, cache_creation: 0, cache_read: 0, output: 0 }, perTurn: [] };
    for (const regel of readFileSync(pad, "utf8").split("\n")) {
      if (!regel) continue;
      let e;
      try { e = JSON.parse(regel); } catch { continue; }
      if (e.type !== "assistant") continue;
      const u = e.message?.usage;
      if (!u) continue;
      const d = {
        input: u.input_tokens ?? 0,
        cache_creation: u.cache_creation_input_tokens ?? 0,
        cache_read: u.cache_read_input_tokens ?? 0,
        output: u.output_tokens ?? 0,
      };
      let k = 0;
      for (const [soort, n] of Object.entries(d)) { s.soort[soort] += n; k += n * WEGING[soort]; }
      s.kost += k; s.turns += 1; s.perTurn.push(k);
    }
    if (s.turns > 0) sessies.push(s);
  }
}

if (sessies.length === 0) {
  console.error(`geen sessies in de laatste ${dagen} dagen${alle ? "" : ` voor ${process.cwd()}`}`);
  process.exit(2);
}

sessies.sort((a, b) => b.kost - a.kost);
const M = (n) => (n / 1e6).toFixed(1).padStart(7) + " M";
const k = (n) => (n / 1e3).toFixed(1).padStart(6) + "k";

// De marginale kost: het laatste vijfde van de sessie tegen het eerste vijfde. Dát zegt wat
// de volgende beurt kost — een gemiddelde over de hele sessie verbergt de groei.
const marginaal = (s) => {
  if (s.turns < 20) return null;
  const n = Math.floor(s.turns / 5);
  const kop = s.perTurn.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const staart = s.perTurn.slice(-n).reduce((a, b) => a + b, 0) / n;
  return { kop, staart, factor: staart / kop };
};

console.log(`\n  ${sessies.length} sessie(s), laatste ${dagen} dagen${alle ? " (alle repo's)" : ""}\n`);
console.log("  sessie    turns        kost   per turn   marginaal   advies");
let knip = 0;
for (const s of sessies.slice(0, 15)) {
  const m = marginaal(s);
  const perTurn = s.kost / s.turns;
  let advies = "";
  if (m && m.factor >= 2) { advies = "KNIP — de staart kost " + m.factor.toFixed(1) + "x de kop"; knip++; }
  else if (m && m.factor >= 1.5) advies = "let op";
  console.log(
    `  ${s.id}  ${String(s.turns).padStart(5)}  ${M(s.kost)}  ${k(perTurn)}  ` +
    `${m ? k(m.staart) : "     —"}   ${advies}`
  );
}

const tot = sessies.reduce((a, s) => a + s.kost, 0);
const som = (veld) => sessies.reduce((a, s) => a + s.soort[veld] * WEGING[veld], 0);
console.log(`\n  waar de kost zit (noemer: ${M(tot).trim()} over ${sessies.reduce((a, s) => a + s.turns, 0)} turns)`);
for (const veld of ["cache_read", "cache_creation", "output", "input"]) {
  const deel = som(veld);
  console.log(`    ${veld.padEnd(15)} ${M(deel)}  ${((100 * deel) / tot).toFixed(1).padStart(5)}%`);
}

const cacheDeel = (100 * som("cache_read")) / tot;
if (cacheDeel > 50) {
  console.log(
    `\n  ${cacheDeel.toFixed(0)}% is cache-read: je betaalt vooral het hérlezen van de conversatie.\n` +
    `  Dat schaalt met het AANTAL beurten, niet met hun inhoud. Bundel losse probes in één run\n` +
    `  (templates/checklijst.sh) vóór je checks schrapt — de checks zijn niet wat duur is.`
  );
}
// Drie uitkomsten, niet twee: 0 = gemeten en rustig, 1 = gemeten en het advies is knippen,
// 2 = niets gemeten. Een lege meting mag nooit als groen lezen.
process.exit(knip > 0 ? 1 : 0);
