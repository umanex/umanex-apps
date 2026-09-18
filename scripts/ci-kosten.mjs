#!/usr/bin/env node
// ci-kosten.mjs — wat de CI van deze repo werkelijk kost, in GEFACTUREERDE minuten.
//
//   node scripts/ci-kosten.mjs                    # laatste 20 runs, alle workflows
//   node scripts/ci-kosten.mjs --runs 50
//   node scripts/ci-kosten.mjs --workflow evals.yml
//   node scripts/ci-kosten.mjs --budget 120       # rood boven 120 gefactureerde min/run
//
// WAAROM. LEARNINGS 2026-09-11: een omzetting van 26 handgeschreven CI-stappen naar een
// matrix loste een echt probleem op, maar niemand mat wat ze kostte. GitHub factureert per
// JOB en rondt af op hele minuten, en 28 van de 29 jobs duurden minder dan 60 seconden:
// 19 minuten wandklok werden 44 GEFACTUREERDE minuten. Binnen één dag stond umanex-os op
// 685 minuten, liep het maandquotum leeg en faalde élke job vóór hij startte. De acht rode
// suites die daarna op main verschenen waren geen regressie maar dezelfde lege meter.
//
// DE DRIE GEBREKEN DIE HET EERDERE ONTWERP TEGENHIELDEN, EN HOE ZE HIER WEG ZIJN.
//   1. "de matrix-teller is regex-over-YAML met een ongetoetste tak (de blok-lijstvorm)"
//      → er wordt geen YAML gelezen. De jobs komen uit de API van runs die écht gedraaid
//        hebben, dus elke matrix-vorm telt per definitie correct mee.
//   2. "hij zou een commando uit een workflow-commentaar eval-en"
//      → er wordt niets ge-eval'd. Alleen `gh api` met vaste argumenten.
//   3. "hij meet de vloer en niet de duur — een job die van 40s naar 905s groeit is
//      onzichtbaar"
//      → de duur ís de meting. De vloer (aantal jobs) staat ernaast als tweede kolom, want
//        die twee falen op verschillende manieren: veel korte jobs kosten afronding, één
//        lange job kost duur. Een wachter die er maar één ziet, mist de andere helft.
//
// EXIT-CODES
//   0  gemeten, binnen budget
//   1  gemeten, boven budget — of de afrondings-overhead is de grootste post
//   2  NIET gemeten (geen gh, geen netwerk, geen runs) — nooit stil als groen lezen

import { execFileSync } from "node:child_process";

const arg = (naam, standaard) => {
  const i = process.argv.indexOf(naam);
  return i === -1 ? standaard : process.argv[i + 1];
};
const nRuns = Number(arg("--runs", 20));
const workflow = arg("--workflow", null);
const budget = Number(arg("--budget", 0)); // 0 = geen harde grens, alleen rapporteren

// Géén --paginate: dat print één JSON-document PER PAGINA, dus `{...}{...}` — geen geldige
// JSON, en JSON.parse faalt er stil op (gemeten 2026-09-18: de wachter meldde "geen runs
// opgehaald" terwijl dezelfde call met --jq gewoon 3 gaf). We halen per call één pagina.
const gh = (pad) => {
  try {
    return JSON.parse(execFileSync("gh", ["api", pad], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  } catch {
    return null;
  }
};

let repo;
try {
  repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
} catch {
  console.error("NIET GEMETEN — gh niet beschikbaar of geen repo-toegang");
  process.exit(2);
}

const pad = `repos/${repo}/actions/runs?per_page=${nRuns}` + (workflow ? `&workflow=${workflow}` : "");
const data = gh(pad);
if (!data || !Array.isArray(data.workflow_runs) || data.workflow_runs.length === 0) {
  console.error(`NIET GEMETEN — geen runs opgehaald voor ${repo}`);
  process.exit(2);
}

const runs = data.workflow_runs.slice(0, nRuns);
const rijen = [];
let gemeten = 0, overgeslagen = 0;

for (const r of runs) {
  const jobs = gh(`repos/${repo}/actions/runs/${r.id}/jobs`);
  const lijst = jobs?.jobs?.filter((j) => j.started_at && j.completed_at) ?? [];
  if (lijst.length === 0) { overgeslagen++; continue; }
  let sec = 0, gefactureerd = 0, kort = 0, langste = 0;
  for (const j of lijst) {
    const d = (new Date(j.completed_at) - new Date(j.started_at)) / 1000;
    if (!(d >= 0)) continue;
    sec += d;
    gefactureerd += Math.max(1, Math.ceil(d / 60)); // GitHub rondt elke job op naar boven
    if (d < 60) kort++;
    if (d > langste) langste = d;
  }
  gemeten++;
  rijen.push({
    naam: (r.name ?? "?").slice(0, 22),
    jobs: lijst.length,
    kort,
    wand: Math.round(sec / 60),
    gefactureerd,
    langste: Math.round(langste),
  });
}

if (gemeten === 0) {
  console.error(`NIET GEMETEN — ${runs.length} runs opgehaald, geen enkele had voltooide jobs`);
  process.exit(2);
}

console.log(`\n  ${repo} — ${gemeten} run(s) gemeten${overgeslagen ? `, ${overgeslagen} zonder voltooide jobs` : ""}\n`);
console.log("  workflow                jobs  <60s   wandklok  gefactureerd  langste job");
for (const x of rijen) {
  console.log(
    `  ${x.naam.padEnd(22)}  ${String(x.jobs).padStart(4)}  ${String(x.kort).padStart(4)}  ` +
    `${String(x.wand + " min").padStart(9)}  ${String(x.gefactureerd + " min").padStart(12)}  ${String(x.langste + "s").padStart(11)}`
  );
}

const totWand = rijen.reduce((a, x) => a + x.wand, 0);
const totFact = rijen.reduce((a, x) => a + x.gefactureerd, 0);
const totJobs = rijen.reduce((a, x) => a + x.jobs, 0);
const totKort = rijen.reduce((a, x) => a + x.kort, 0);
const overhead = totFact - totWand;
const factor = totWand > 0 ? totFact / totWand : 0;

console.log(`\n  noemer: ${totJobs} jobs over ${gemeten} runs`);
console.log(`    wandklok      ${String(totWand).padStart(5)} min`);
console.log(`    gefactureerd  ${String(totFact).padStart(5)} min   (${factor.toFixed(2)}x)`);
console.log(`    afronding     ${String(overhead).padStart(5)} min   — ${totKort} van ${totJobs} jobs duurde < 60s`);

let rc = 0;
// Drempel op de FACTOR, niet op het verschil. Het geval uit LEARNINGS 2026-09-11 stond op
// 19 min wandklok → 44 gefactureerd (2,3x); een drempel `overhead > wandklok` mist alles
// tussen 1,0x en 2,0x, en umanex-os zelf stond op exact 2,00x — net onder die grens, dus
// stil groen. 1,5x is de eerste waarde waarbij afronding de helft van je rekentijd kost.
if (factor >= 1.5) {
  console.log(
    `\n  ✗ Afronding kost ${overhead} van de ${totFact} gefactureerde minuten (${factor.toFixed(2)}x wandklok).\n` +
    `    Elke job kost minimaal één minuut,\n` +
    `    dus ${totKort} korte jobs zijn ${totKort} minuten. Minder jobs die elk langer duren is\n` +
    `    goedkoper dan veel korte — ook al oogt de matrix netter.`
  );
  rc = 1;
}
if (budget > 0 && totFact / gemeten > budget) {
  console.log(`\n  ✗ ${(totFact / gemeten).toFixed(0)} gefactureerde min/run ligt boven het budget van ${budget}.`);
  rc = 1;
}
if (rc === 0) console.log(`\n  ✓ binnen budget; afronding is niet de grootste post.`);
process.exit(rc);
