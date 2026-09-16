#!/usr/bin/env node
/**
 * Flow-harness: rijdt de app uit in een echte browser — driver B van de contrast-meting.
 *
 *   pnpm --filter cashflow flow             # alle scenario's
 *   pnpm --filter cashflow flow --selftest  # + de tegenproeven, die hóren te falen
 *   pnpm --filter cashflow flow --headed    # meekijken terwijl het gebeurt
 *   pnpm --filter cashflow flow --no-build  # hergebruik de vorige harness-build
 *   pnpm --filter cashflow flow --dist=.next # serveer een bestaande build, bouw niet (CI)
 *
 * Waarom dit bestaat: het slepen van een post tussen maanden viel tot 2026-08-07 buiten
 * élk vangnet. De scenario-scripts raken alleen de rekenkern, `@umanex/tokens contrast`
 * alleen de rollaag, en `dom-sweep.mjs` leest alleen statische bestanden — waar
 * `MonthCard` en de modals per definitie buiten vallen, want die hangen aan dnd-kit en
 * de store. Het grootste scherm van de app was dus alleen gelezen, nooit uitgereden — en
 * toen het één keer met de hand uitgereden werd, faalde het meteen.
 *
 * Wat hij dekt:
 *   - de sleep tussen twee maandkolommen, met toetsenbord én muis
 *   - de contrast-sweep op het échte scherm, mét beide modals open (dezelfde meting als
 *     `dom-sweep.mjs`, uit `contrast.mjs` — één bron, twee drivers)
 *   - het openen en sluiten van `RepeatMonthModal` en `ReservationPaymentModal`
 *   - loading, empty en error: de drie states die een gebruiker ziet wanneer het misgaat
 *
 * Waarom hij de échte app aanstuurt en niet een gemockte `MonthCard`: dnd-kit meet
 * rechthoeken op, en een sweep meet gecomponeerde kleuren. Een harness die de kolommen
 * zelf neerzet, meet zijn eigen layout — precies de as waarop dit gedrag stukgaat. Dit
 * rijdt op de gebouwde app, dezelfde bundel die `next start` serveert.
 *
 * Waarom hij tóch geen productiedata kan raken: élk verzoek naar de Supabase-origin wordt
 * onderschept. Wat de harness kent (login, het document, de snapshots, de wegschrijf-call)
 * beantwoordt hij uit een fixture; al het overige wordt afgebroken en geteld als lek — één
 * lek en de run faalt. Er gaat dus geen enkele byte naar `cashflow_state` van de echte
 * gebruiker, ook niet wanneer het slepen slaagt en de app wíl wegschrijven.
 *
 * Eigen build in een eigen map (`.next-harness`, via NEXT_DIST_DIR in next.config.mjs) en
 * een eigen server op een eigen poort (3100). De PM2-app op 3000 serveert `.next` uit
 * dezelfde tree — sinds app-werk in de hoofdtree gebeurt is dat de tree waarin je bouwt.
 * Die build mag deze harness niet overschrijven en die server niet herstarten. Daarom
 * bouwt hij nooit in `.next`; hij kan er hooguit een bestaande build uit serveren
 * (`--dist=.next`, wat CI doet met de build van de stap ervoor).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beoordeel, beschrijfFout, meetInPagina, STIL_CSS } from './contrast.mjs';
import { kiesDist } from './harness-dist.mjs';
import { horizontaleOverflow, kopstructuur, toetsenbord } from './a11y-passes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const require_ = createRequire(import.meta.url);

const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const HEADED = args.includes('--headed');
// Gezet door de signaalhandler in main(): een onderbroken run eindigt met 130/143, niet met 1.
let onderbroken = null;
/**
 * De gespawnde `next start`, vanaf het moment van spawnen — niet pas wanneer `startServer()`
 * terugkeert. Tussen die twee ligt de readiness-lus (tot 60 s), en een signaal in dat venster
 * moet dezelfde server kunnen opruimen als een signaal erna. Zonder deze variabele had de
 * handler alleen de returnwaarde, die daar nog niet bestaat.
 */
let actieveServer = null;
const PORT = Number(args.find((a) => a.startsWith('--port='))?.slice(7) ?? 3100);
const BASE = `http://127.0.0.1:${PORT}`;

// ── Build-map ────────────────────────────────────────────────────────────────
// Twee namen, letterlijk, gekozen in `harness-dist.mjs`: `.next` is de live map (PM2 op
// :3000 leest eruit) en wordt alleen geserveerd; `.next-harness` is de eigen map en wordt
// gebouwd, tenzij `--no-build` de vorige build hergebruikt. Vrije invoer is een wisser —
// `next build` maakt de doelmap eerst leeg — dus een allowlist, geen normalisatie.
let gekozen;
try {
  gekozen = kiesDist(args);
} catch (err) {
  console.error(err.message);
  process.exit(2);
}
const { DIST, LIVE_MAP, BOUWEN } = gekozen;
const DIST_PAD = resolve(APP, DIST);

// ── Fixture ──────────────────────────────────────────────────────────────────
// Eén post in de eerste kolom, met een bedrag dat nergens anders voorkomt zodat de
// saldo-assertie hem niet met een andere waarde kan verwarren. Eén spaarpot erbij, want
// zonder pot bestaat de betaalmodal niet: die kiest uit de actieve potten.
const USER_ID = '00000000-0000-4000-8000-000000000001';
const LABEL = 'Harnaspost';
const AMOUNT = 137.42;
const POT = 'Harnaspot';

/** 'YYYY-MM' voor vandaag + n maanden. De app toont drie kolommen vanaf de huidige maand. */
function monthKey(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const BRON = monthKey(0);
const DOEL = monthKey(1);

/**
 * `leeg: true` geeft een geldig document zónder posten — dat is iets anders dan een
 * mislukte fetch, en het hoort ook iets anders te tonen: lege staten per sectie in
 * plaats van een foutscherm.
 */
/**
 * Het bureau-deel van de fixture. Zonder variant ontbreekt de sleutel helemaal — dat is een
 * document van vóór store-versie 16, en precies het geval dat `normalizeBureau` moet dragen.
 */
const JAAR = Number(BRON.slice(0, 4));

function bureauFixture(variant) {
  if (!variant) return undefined;
  const doelen = {
    [String(JAAR)]: {
      year: JAAR, revenueTarget: 120000, quarterTargets: [30000, 30000, 30000, 30000],
      days: { total: 200, buffer: 10, perCategory: { klantwerk: 128, verkoop: 40, 'umanex-os': 12, administratie: 10 } },
      hoursPerDay: 8, daysPerWeek: 5, maxClientShare: 0.3, monthlyCashNeed: 11000,
      targetRevenuePerDay: null, targetMarginPerDay: null,
      signals: {
        negativeCash: { enabled: true, floor: 0 }, overbooking: { enabled: true, toleranceDays: 0 },
        projectOverrun: { enabled: true, ratio: 1 }, clientConcentration: { enabled: true },
        overdueSalesAction: { enabled: true, graceDays: 0 }, revenueGap: { enabled: true },
      },
    },
  };
  if (variant === 'doelen') {
    return { goals: doelen, clients: [], clientGroups: [], projects: [], opportunities: [], timeEntries: [], plannedWork: [] };
  }

  // 'projecten': twee projecten met een bekende uitkomst. Zonder raming → onvoldoende gegevens;
  // met 48 u besteed (8 u/dag) en 16 u resterend → 8 dagen → A = 9000 ÷ 8 = € 1.125/dag.
  const project = (id, over) => ({
    id, clientId: 'harnas-klant', offerType: 'workflowtraject', status: 'lopend', scope: '',
    contractDate: `${BRON}-01`, plannedStart: BRON, plannedEnd: BRON, extensions: [],
    budgetedOwnHours: null, expectedRemainingOwnHours: null, externalCosts: [], milestones: [], invoices: [],
    nextMilestoneNote: '', blockers: '', opportunityId: null, createdAt: `${BRON}-01`, ...over,
  });
  if (variant === 'klanten') return klantenFixture(doelen, project);
  const projects = [
    project('harnas-zonder', { name: 'Harnasproject zonder raming', fixedPriceExVat: 12000,
      milestones: [{ id: 'harnas-m1', label: 'Harnasmijlpaal', plannedMonth: BRON, amount: 4000, realizedOn: null, realizedAmount: null, extensionId: null }] }),
    project('harnas-met', { name: 'Harnasproject met raming', fixedPriceExVat: 9000, budgetedOwnHours: 64, expectedRemainingOwnHours: 16 }),
  ];
  // 'verkoop-dubbel': een document waarin al twee projecten naar de gewonnen kans verwijzen —
  // een half mislukte eerdere omzetting. De tegenproef van "één project" draait erop.
  if (variant.startsWith('cash')) {
    const met = projects.find((p) => p.id === 'harnas-met');
    met.invoices = cashFacturen(variant);
  }
  if (variant === 'verkoop-dubbel') {
    projects.push(project('harnas-dubbel-1', { name: 'Eerste omzetting', fixedPriceExVat: 15000, opportunityId: 'harnas-gewonnen' }));
    projects.push(project('harnas-dubbel-2', { name: 'Tweede omzetting', fixedPriceExVat: 15000, opportunityId: 'harnas-gewonnen' }));
  }
  return {
    goals: doelen,
    clients: [{ id: 'harnas-klant', name: 'Harnasklant', groupId: null }],
    clientGroups: [],
    projects,
    opportunities: variant.startsWith('verkoop') ? verkoopKansen() : [],
    timeEntries: [
      { id: 'harnas-t1', date: `${BRON}-01`, category: 'klantwerk', projectId: 'harnas-met', hours: 24, hoursPerDayAtEntry: 8, label: null, note: '' },
      { id: 'harnas-t2', date: `${BRON}-01`, category: 'klantwerk', projectId: 'harnas-met', hours: 24, hoursPerDayAtEntry: 8, label: null, note: '' },
    ],
    plannedWork: [],
  };
}

/**
 * Vier kansen met een uitkomst die met de hand na te rekenen is, voor "heel dit jaar":
 * gesprek → voorstel 2 van 3 (voorstel, gesprek, gewonnen bereikten een gesprek; voorstel en
 * gewonnen kregen een voorstel) · voorstel → gewonnen 1 van 3 · beslist 1 gewonnen van 2 ·
 * open nu 2 kansen, 1 voorstel, € 20.000 ongewogen, 1 zonder waarde, 1 gekwalificeerd.
 * Elke datum ligt in dit jaar en niet na vandaag, ook in de eerste dagen van januari.
 */
function verkoopKansen() {
  const vandaag = new Date().toISOString().slice(0, 10);
  const d = (mmdd) => { const x = `${JAAR}-${mmdd}`; return x <= vandaag ? x : vandaag; };
  const negenDagenGeleden = new Date(Date.now() - 9 * 86_400_000).toISOString().slice(0, 10);
  const kans = (id, over) => ({
    id, company: `Bedrijf ${id}`, contact: '', clientId: null, trigger: { description: '', source: '', date: null }, need: '',
    offerType: null, budget: { status: 'onbekend', amount: null }, expectedValue: null, decisionMakerInvolved: false,
    expectedDecisionDate: null, expectedExecution: null, nextAction: null, outcomeReason: null, projectId: null, createdAt: d('01-02'), ...over,
  });
  const h = (stage, on, reason = null) => ({ stage, on, reason });
  return [
    kans('harnas-voorstel', {
      company: 'Harnasvoorstel', stage: 'voorstel', expectedValue: 20000, need: 'Twee productteams zonder gedeelde componenten',
      budget: { status: 'besproken', amount: 20000 }, decisionMakerInvolved: true, expectedDecisionDate: d('12-31'),
      nextAction: { text: 'Harnasopvolging', date: negenDagenGeleden },
      history: [h('contact', d('01-05')), h('gesprek', d('01-10')), h('voorstel', d('02-01'))],
    }),
    kans('harnas-gesprek', { company: 'Harnasgesprek', stage: 'gesprek', history: [h('gesprek', d('02-10'))] }),
    kans('harnas-gewonnen', {
      company: 'Harnasklant', stage: 'gewonnen', expectedValue: 15000, offerType: 'productdiagnose', expectedExecution: { start: BRON, end: BRON },
      history: [h('gesprek', d('01-12')), h('voorstel', d('01-20')), h('gewonnen', d('03-01'))],
    }),
    kans('harnas-verloren', {
      company: 'Harnasverloren', stage: 'verloren', outcomeReason: 'Geen budget',
      history: [h('voorstel', d('01-15')), h('verloren', d('02-15'), 'Geen budget')],
    }),
  ];
}

/** Een lokale kalenderdatum `n` dagen vanaf vandaag — dezelfde klok als de browser van de harness. */
function dagVanaf(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Twee facturen op "Harnasproject met raming", elk met een post in de prognose en een uniek
 * bedrag: 604,27 ex btw → 731,17, vervallen sinds tien dagen zonder verwachte betaaldatum; en
 * 1.020,30 → 1.234,56, verwacht over veertien dagen. `cash-gedateerd` geeft de eerste alsnog een
 * verwachte datum (vandaag) — de tegenproef van "staat apart".
 */
function cashFacturen(variant) {
  return [
    { id: 'harnas-factuur-oud', label: 'Harnasslot', kind: 'slot', date: dagVanaf(-40), amountExVat: 604.27, vatRate: 21, dueDate: dagVanaf(-10),
      expectedPaymentDate: variant === 'cash-gedateerd' ? dagVanaf(0) : null, paidOn: null, paidAmount: null, incomeItemId: 'harnas-post-oud' },
    { id: 'harnas-factuur-later', label: 'Harnastermijn', kind: 'termijn', date: dagVanaf(0), amountExVat: 1020.3, vatRate: 21, dueDate: dagVanaf(30),
      expectedPaymentDate: dagVanaf(14), paidOn: null, paidAmount: null, incomeItemId: 'harnas-post-later' },
  ];
}

function cashPosten() {
  return [
    { id: 'harnas-post-oud', monthKey: BRON, label: 'Harnasproject met raming — Harnasslot', amount: 731.17, received: false },
    { id: 'harnas-post-later', monthKey: dagVanaf(14).slice(0, 7), label: 'Harnasproject met raming — Harnastermijn', amount: 1234.56, received: false },
  ];
}

/**
 * Drie klanten, twee in één groep. Gerealiseerd dit jaar: C 50.000 · A 30.000 · B 20.000 →
 * noemer 100.000, C 50 % boven de limiet van 30 %, A precies 30 % en dus níét erboven.
 * Vooruitblik (met resterend in december): C 140.000 · A 40.000 · B 20.000 → noemer 200.000.
 */
function klantenFixture(doelen, project) {
  const vandaag = dagVanaf(0);
  const d = (mmdd) => { const x = `${JAAR}-${mmdd}`; return x <= vandaag ? x : vandaag; };
  const m = (id, amount, over) => ({ id, label: id, plannedMonth: `${JAAR}-12`, amount, realizedOn: null, realizedAmount: null, extensionId: null, ...over });
  return {
    goals: doelen,
    clients: [
      { id: 'harnas-klant-a', name: 'Harnasklant A', groupId: 'harnas-groep' },
      { id: 'harnas-klant-b', name: 'Harnasklant B', groupId: 'harnas-groep' },
      { id: 'harnas-klant-c', name: 'Harnasklant C', groupId: null },
    ],
    clientGroups: [{ id: 'harnas-groep', name: 'Harnasgroep' }],
    projects: [
      project('harnas-k1', { clientId: 'harnas-klant-a', name: 'K1', fixedPriceExVat: 40000, milestones: [m('k1-1', 30000, { realizedOn: d('01-15') }), m('k1-2', 10000)] }),
      project('harnas-k2', { clientId: 'harnas-klant-b', name: 'K2', fixedPriceExVat: 20000, milestones: [m('k2-1', 20000, { realizedOn: d('02-15') })] }),
      project('harnas-k3', { clientId: 'harnas-klant-c', name: 'K3', fixedPriceExVat: 140000, milestones: [m('k3-1', 50000, { realizedOn: d('03-01') }), m('k3-2', 90000)] }),
    ],
    opportunities: [],
    timeEntries: [],
    plannedWork: [],
  };
}

function fixtureData({ leeg = false, buffer = false, bureau = null } = {}) {
  const b = bureauFixture(bureau);
  const doc = prognoseFixture({ leeg, buffer });
  if (bureau?.startsWith('cash')) doc.incomeItems = [...doc.incomeItems, ...cashPosten()];
  return b ? { ...doc, bureau: b } : doc;
}

function prognoseFixture({ leeg = false, buffer = false } = {}) {
  // De buffer-variant zet één bufferpot en één kost die de pot ver overstijgt, zodat de
  // maandfooter alle drie zijn standen laat zien: opbouw, stilstand, en een stand die
  // negatief staat. Zonder die derde stand kan geen enkele check onderscheiden of de
  // footer de positie of de potstand toont — die vallen samen zolang de pot volstaat.
  if (buffer) {
    return {
      referenceBalance: 1000,
      referenceMonth: BRON,
      historyStartMonth: BRON,
      balanceOverrides: [],
      expenseItems: [
        { id: 'harness-1', monthKey: BRON, label: LABEL, amount: AMOUNT, paid: false },
        { id: 'harness-tekort', monthKey: monthKey(2), label: 'Harnastekort', amount: 1600, paid: false },
      ],
      // Inkomen in de middelste kolom, zodat één van de drie footers een overschot toont:
      // anders staat er nooit een `+` op het scherm en blijft die tak van de regex blind.
      incomeItems: [{ id: 'harness-in', monthKey: DOEL, label: 'Harnasinkomen', amount: 500 }],
      recurringItems: [],
      recurringSettlements: [],
      reservationSettlements: [],
      reservations: [
        { id: 'harness-buffer', label: 'Reserve', monthlyAmount: 0, startMonth: BRON, type: 'spaardoel', coversDeficit: true },
      ],
      reservationPayments: [],
      recurringDefers: [],
      reservationDefers: [],
      reopenedMonths: [],
    };
  }
  return {
    referenceBalance: leeg ? 0 : 5000,
    referenceMonth: BRON,
    historyStartMonth: BRON,
    balanceOverrides: [],
    expenseItems: leeg ? [] : [{ id: 'harness-1', monthKey: BRON, label: LABEL, amount: AMOUNT, paid: false }],
    incomeItems: [],
    recurringItems: [],
    recurringSettlements: [],
    reservationSettlements: [],
    reservations: leeg
      ? []
      : [{ id: 'harness-pot', label: POT, monthlyAmount: 60, startMonth: BRON, type: 'spaardoel' }],
    reservationPayments: [],
    recurringDefers: [],
    reservationDefers: [],
    reopenedMonths: [],
  };
}

function session() {
  const nu = Math.floor(Date.now() / 1000);
  return {
    access_token: 'harness-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nu + 3600,
    refresh_token: 'harness-refresh-token',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'harness@umanex.be',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    },
  };
}

// ── Supabase-origin: alles onderscheppen, de rest afbreken ───────────────────
function supabaseUrl() {
  // De omgevingsvariabele gaat voor, zodat CI dezelfde placeholder kan meegeven als de
  // build (zie ci.yml) — `.env.local` staat niet in git en bestaat daar dus niet.
  const uitEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (uitEnv) return uitEnv.trim().replace(/\/+$/, '');

  const env = resolve(APP, '.env.local');
  if (!existsSync(env)) {
    throw new Error(
      `Geen NEXT_PUBLIC_SUPABASE_URL in de omgeving en geen ${env}.\n` +
        'Zonder die waarde weet de harness niet welke origin hij moet afsluiten, en dat is de hele veiligheidsgarantie.',
    );
  }
  const match = readFileSync(env, 'utf8').match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
  if (!match) throw new Error('NEXT_PUBLIC_SUPABASE_URL ontbreekt in .env.local.');
  return match[1].trim().replace(/\/+$/, '');
}

/**
 * Welke Supabase-origins zitten er ingebakken in de build die we zo gaan serveren?
 *
 * `NEXT_PUBLIC_`-waardes worden bij het bouwen in de bundel gezet; de harness leest ze op
 * dat moment níet, hij leest zijn eigen omgeving. Lopen die twee uiteen, dan sluit
 * `page.route()` een origin af waar de app helemaal niet naartoe gaat — en dan is
 * "0 verzoeken naar de echte origin" een lege bewering. De gevaarlijke richting is
 * harness=placeholder met een build op de échte URL: die verzoeken vertrekken gewoon, ze
 * falen niet eens, en niets in de uitslag verraadt het.
 */
function originsInBuild() {
  const gevonden = new Set();
  const patroon = /https:\/\/[a-z0-9-]+\.supabase\.co/g;

  const loop = (dir) => {
    let inhoud;
    try {
      inhoud = readdirSync(dir);
    } catch {
      return;
    }
    for (const naam of inhoud) {
      const pad = `${dir}/${naam}`;
      if (statSync(pad).isDirectory()) loop(pad);
      else if (naam.endsWith('.js')) {
        for (const m of readFileSync(pad, 'utf8').matchAll(patroon)) gevonden.add(m[0]);
      }
    }
  };

  loop(resolve(DIST_PAD, 'static/chunks'));
  return gevonden;
}

/** Weigert te starten wanneer de build een andere origin draagt dan we afsluiten. */
function controleerBuildOrigin(origin) {
  const inBuild = originsInBuild();

  if (inBuild.size === 0) {
    throw new Error(
      `Geen enkele supabase-origin gevonden in ${DIST}/static/chunks.\n` +
        'De harness kan dan niet vaststellen dat hij de origin afsluit waar de app naartoe gaat, ' +
        'en dat is zijn hele veiligheidsgarantie. Bouw opnieuw, of pas deze check aan als de ' +
        'bundel-indeling veranderd is.',
    );
  }

  const vreemd = [...inBuild].filter((o) => o !== origin);
  if (vreemd.length) {
    throw new Error(
      `De build praat met ${vreemd.join(', ')}, de harness sluit ${origin} af.\n` +
        'Die verzoeken zouden langs de onderschepping heen gaan — naar een echte server, met ' +
        'echte data. Een build die de harness zelf maakt erft zijn omgeving, dus dit betekent dat ' +
        `${DIST} een hergebruikte build is (--no-build of --dist=.next) uit een andere omgeving. ` +
        `Bouw hem met NEXT_PUBLIC_SUPABASE_URL=${origin}, of laat de harness zelf bouwen.`,
    );
  }
}

/**
 * Beantwoordt wat de app nodig heeft en breekt al het overige af. Fail-closed: een pad dat
 * hier niet staat, komt niet op het netwerk maar in `lekken` — en laat de run vallen. Dat
 * is de hele veiligheidsgarantie, dus hier nooit een `route.continue()` toevoegen.
 *
 * `gedrag` is wat een scenario aan het antwoord mag draaien — leeg document, trage fetch,
 * serverfout. Zonder die knop kon de harness alleen het geslaagde pad tonen, en juist de
 * drie andere schermen (skeleton, lege staat, foutscherm) zag nooit een guard.
 */
function maakRouteHandler(state, gedrag = {}) {
  const { leeg = false, buffer = false, bureau = null, conflict = false, vertragingMs = 0, documentStatus = 200 } = gedrag;

  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pad = url.pathname;
    const json = (body, status = 200, headers = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });

    // Auth — inloggen, verversen, en de gebruiker opvragen.
    if (pad.startsWith('/auth/v1/token') || pad === '/auth/v1/signup') return json(session());
    if (pad === '/auth/v1/user') return json(session().user);
    if (pad === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
    if (pad.includes('/.well-known/jwks.json')) return json({ keys: [] });

    // Het document. `maybeSingle()` wil één object, geen array.
    if (pad === '/rest/v1/cashflow_state') {
      if (req.method() === 'GET') {
        if (vertragingMs) await new Promise((r) => setTimeout(r, vertragingMs));
        if (documentStatus !== 200) {
          return json({ message: 'harness: opzettelijke serverfout' }, documentStatus);
        }
        return json({ data: fixtureData({ leeg, buffer, bureau }), revision: state.revision }, 200);
      }
      // Elke schrijfpoging wordt geteld en beantwoord alsof ze lukte: de app moet
      // verder kunnen, en het bewijs dat er niets weglekte is juist dat we hier staan.
      state.schrijfpogingen.push(`${req.method()} ${pad}`);
      state.documenten.push(req.postDataJSON()?.data ?? null);
      // `conflict`: de revisie op de server is intussen verschoven. Nul rijen terug is precies wat
      // `saveState` als revisieconflict leest — dezelfde weg als een tweede browser.
      if (conflict) return json([], 200);
      state.revision += 1;
      return json([{ revision: state.revision }], 200);
    }

    if (pad === '/rest/v1/cashflow_snapshots') {
      if (req.method() === 'GET') return json([]);
      state.schrijfpogingen.push(`${req.method()} ${pad}`);
      return json([], 200);
    }

    state.lekken.push(`${req.method()} ${pad}`);
    return route.abort();
  };
}

// ── Server ───────────────────────────────────────────────────────────────────

/** Luistert er al iets op de poort? Zo ja: niet starten. */
async function poortBezet() {
  try {
    await fetch(BASE, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Weigert te draaien zolang er iets anders op de poort luistert. Zonder deze check test de
 * harness wat er toevallig op de poort staat: `next start` valt om met EADDRINUSE terwijl de
 * eerste fetch slaagt tegen de vréémde server, en de run rapporteert over een app die hij nooit
 * gestart heeft.
 *
 * Twee aanroepen, bewust. De eerste staat vóór de build, want anders bouwt de harness ~16 s om
 * daarna alsnog hier af te breken — een fout die met één fetch van 1,5 s vooraf bekend was. De
 * tweede staat vlak vóór de spawn en vangt de race in dat bouwvenster.
 */
async function weigerBezettePoort() {
  if (!(await poortBezet())) return;
  throw new Error(
    `Er luistert al iets op ${BASE}. De harness start zijn eigen server en weigert een vreemde te testen.\n` +
      `Ruim hem op of geef een andere poort: --port=3105`,
  );
}

/**
 * Bouwt de app in DIST. De uitvoer wordt opgevangen en alleen bij een fout getoond; bij
 * succes één regel met de duur. Geen eigen procesgroep: `next build` eindigt vanzelf.
 */
async function bouw() {
  const bin = require_.resolve('next/dist/bin/next');
  const start = Date.now();
  console.log(`Flow-harness — bouwt in ${DIST} …`);
  const proc = spawn(process.execPath, [bin, 'build'], {
    cwd: APP,
    env: { ...process.env, NEXT_DIST_DIR: DIST },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  proc.stdout.on('data', (d) => (logs += d));
  proc.stderr.on('data', (d) => (logs += d));
  const code = await new Promise((r) => proc.on('close', r));
  if (code !== 0) {
    throw new Error(`next build viel om (exit ${code}):\n${logs.split('\n').slice(-40).join('\n')}`);
  }
  console.log(`Flow-harness — build klaar in ${Math.round((Date.now() - start) / 1000)}s`);
}

function buildId() {
  return readFileSync(resolve(DIST_PAD, 'BUILD_ID'), 'utf8').trim();
}

/**
 * "Serveert <map>" mag niet van de schijf komen: Next koppelt de geserveerde map nergens
 * aan wat er net gebouwd is, dus een `next start` zonder NEXT_DIST_DIR zou stil `.next`
 * serveren terwijl de log `.next-harness` claimt. Vraag de server dus om het manifest van
 * díe BUILD_ID; een andere build op die poort geeft 404.
 */
async function controleerGeserveerdeBuild(id) {
  const res = await fetch(`${BASE}/_next/static/${id}/_buildManifest.js`, { redirect: 'manual' });
  if (res.status !== 200) {
    throw new Error(
      `${BASE} serveert niet ${DIST} (BUILD_ID ${id}): het manifest gaf ${res.status}. ` +
        'Een andere build op die poort, of NEXT_DIST_DIR kwam niet bij `next start` aan.',
    );
  }
}

/** Vóór de origin-check: die leest de chunks en zou een ontbrekende build als "bouw opnieuw" melden. */
function controleerBuildAanwezig() {
  if (existsSync(resolve(DIST_PAD, 'BUILD_ID'))) return;
  throw new Error(
    `Geen build in apps/cashflow/${DIST}.` +
      (LIVE_MAP
        ? ' `--dist=.next` serveert alleen wat er staat en bouwt daar nooit in — dat is de map waar een draaiende server uit leest. Laat de flag weg zodat de harness in .next-harness bouwt, of bouw eerst zelf (`pnpm --filter cashflow build`) waar geen server draait.'
        : ' Laat `--no-build` weg zodat de harness hem zelf maakt.'),
  );
}

async function startServer() {

  // Tweede keer, en niet overbodig: tussen de check vóór de build en deze spawn zit de hele
  // bouwtijd, en in dat venster kan iemand de poort alsnog innemen.
  await weigerBezettePoort();

  const bin = require_.resolve('next/dist/bin/next');
  // Eigen procesgroep, zodat de teardown de hele boom kan afsluiten. Een SIGTERM naar
  // alleen het bovenste proces liet hier een luisterende server achter.
  const proc = spawn(process.execPath, [bin, 'start', '--port', String(PORT)], {
    cwd: APP,
    // Dezelfde variabele als bij de build: `next start` leest next.config.mjs opnieuw en
    // moet op dezelfde distDir uitkomen, anders serveert hij `.next` van iemand anders.
    env: { ...process.env, NEXT_DIST_DIR: DIST },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  // Meteen, vóór de eerste await hieronder: vanaf hier bestaat er een detached proces dat een
  // onderbreking zou overleven.
  actieveServer = proc;

  let logs = '';
  proc.stdout.on('data', (d) => (logs += d));
  proc.stderr.on('data', (d) => (logs += d));

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`next start viel om (exit ${proc.exitCode}):\n${logs}`);
    try {
      const res = await fetch(BASE, { redirect: 'manual' });
      if (res.status < 500) return proc;
    } catch {
      /* nog niet op */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  stopServer(proc);
  throw new Error(`next start werd niet bereikbaar op ${BASE} binnen 60s:\n${logs}`);
}

function stopServer(proc = actieveServer) {
  // Een signaal kan vóór de spawn komen — dan is er niets op te ruimen, en dat is geen fout.
  if (!proc) return;
  try {
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      /* al weg */
    }
  }
}

// ── Pagina klaarzetten ───────────────────────────────────────────────────────
const KOLOM = '.grid.grid-cols-3 > div';

/**
 * Logt in en geeft de pagina terug. `wachtOp: 'kolommen'` wacht tot de prognose staat;
 * `'niets'` geeft de pagina meteen terug, want een scenario dat juist de laad- of
 * foutstaat meet mag niet wachten op een scherm dat er nooit komt.
 */
async function openApp(context, state, { gedrag = {}, wachtOp = 'kolommen', pad = '/' } = {}) {
  const page = await context.newPage();
  page.on('pageerror', (err) => state.paginafouten.push(String(err).slice(0, 200)));

  // Twee lagen, in deze volgorde. Playwright laat de laatst geregistreerde route eerst
  // kiezen, dus de vangnet-route staat hier bovenaan en de specifieke eronder.
  //
  // Laag 1 — het vangnet: élke andere host die naar Supabase ruikt, wordt afgebroken en
  // geteld als lek. `controleerBuildOrigin()` hoort dit al onmogelijk te maken, maar een
  // veiligheidsgarantie die op één check rust, rust op te weinig.
  await page.route(
    (url) => /supabase/i.test(url.hostname) && url.origin !== state.origin,
    (route) => {
      state.lekken.push(`${route.request().method()} ${route.request().url()}`);
      return route.abort();
    },
  );

  // Laag 2 — de origin die de app hoort te gebruiken, uit de fixture bediend.
  await page.route(`${state.origin}/**`, maakRouteHandler(state, gedrag));
  await page.goto(`${BASE}${pad}`, { waitUntil: 'domcontentloaded' });

  // Elke wachtstap meldt wat er wél op het scherm stond. Een kale "Timeout waiting for
  // #email" laat je raden of de app niet hydrateerde, of al ingelogd was, of viel.
  const wacht = async (selector, wat) => {
    try {
      await page.waitForSelector(selector, { timeout: 20_000, state: 'visible' });
    } catch {
      const tekst = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 240));
      const lek = state.lekken.length ? ` Onderweg afgebroken: ${state.lekken.slice(0, 2).join(', ')}.` : '';
      throw new Error(`${wat} verscheen niet. Op het scherm stond: "${tekst}"${lek}`);
    }
  };

  // supabase-js bewaart de sessie in localStorage, dus een tweede scenario in dezelfde
  // context komt al ingelogd binnen. Elk scenario krijgt hier een eigen context, maar de
  // check blijft staan: hem weglaten kostte een run aan een timeout op een formulier dat
  // er terecht niet was.
  const loginZichtbaar = await page
    .waitForSelector('#email', { timeout: 5_000, state: 'visible' })
    .then(() => true)
    .catch(() => false);

  if (loginZichtbaar) {
    await page.fill('#email', 'harness@umanex.be');
    await page.fill('#password', 'harness');
    await page.click('button[type=submit]');
  }

  if (wachtOp === 'kolommen') {
    await wacht(KOLOM, 'de maandkolommen');
    if (!gedrag.leeg) await wacht(`text=${LABEL}`, `de fixture-post "${LABEL}"`);
  }
  if (wachtOp === 'bureau') {
    await wacht('[data-bureau-page] > *', 'een bureau-pagina');
    // Voorbij de 800 ms debounce van sync.ts: een schrijfactie die het laden zelf uitlokt,
    // hoort niet mee te tellen in het venster van het scenario.
    await page.waitForTimeout(1_200);
  }
  return page;
}

/** In welke kolom (0-based) staat de post nu? -1 wanneer hij nergens staat. */
async function kolomVanPost(page, label) {
  return page.evaluate(
    ([sel, l]) => [...document.querySelectorAll(sel)].findIndex((k) => k.textContent.includes(l)),
    [KOLOM, label],
  );
}

/** De sleepgreep van de post: de knop 'Versleep' in de rij die het label draagt. */
function greep(page, label) {
  return page.locator('div', { hasText: label }).locator('button[aria-label="Versleep"]').last();
}

// ── De saldoregel ────────────────────────────────────────────────────────────

const SALDO = /Beginsaldo|Vorig saldo/;

/**
 * Bedrag uit een rijtekst als getal. Punt is duizendtal, komma is decimaal. Het teken
 * staat vóór het euroteken en is een echt minteken (U+2212), niet het ASCII-koppelteken
 * dat `Intl` zelf ná het symbool zou zetten — zie `formatAmount` in lib/cashflow/recurring.ts.
 * Zonder die normalisatie valt het teken weg in de klassefilter hieronder en leest een
 * tekort als een tegoed.
 */
function bedragUit(tekst) {
  const cijfers = tekst.replace(/[−–]/g, '-').replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cijfers);
  return Number.isNaN(n) ? null : n;
}

/**
 * De saldoregel van elke maandkolom: staat hij er, welk label draagt hij, welk bedrag, en
 * staat hij bínnen de inkomstensectie? Sinds 2026-08-10 hoort hij daar te staan — de
 * inkomstenkop draagt `subtotals.incoming` en de regels eronder moeten tot die kop
 * optellen — en verdwijnt hij uit een latere maand zodra het doorgerolde saldo nul is.
 *
 * `.last()` is bewust: elke voorouder van de rij bevat het label ook, en in
 * documentvolgorde komt de rij zelf als laatste. Dezelfde truc als in `greep()`.
 */
async function saldoPerKolom(page) {
  const kolommen = page.locator(KOLOM);
  const aantal = await kolommen.count();
  const uit = [];

  for (let i = 0; i < aantal; i++) {
    const kolom = kolommen.nth(i);
    const tekst = (await kolom.innerText()).replace(/\s+/g, ' ');
    const treffer = tekst.match(SALDO);

    if (!treffer) {
      uit.push({ kolom: i, aanwezig: false });
      continue;
    }

    const rijtekst = (await kolom.locator('div').filter({ hasText: SALDO }).last().innerText())
      .replace(/\s+/g, ' ');

    uit.push({
      kolom: i,
      aanwezig: true,
      label: treffer[0],
      bedrag: bedragUit(rijtekst),
      // Binnen de sectie = ná de inkomstenkop en vóór de kop van de volgende sectie.
      inSectie:
        tekst.indexOf('Inkomsten') < treffer.index && treffer.index < tekst.indexOf('Vaste uitgaves'),
      rijtekst,
    });
  }

  return uit;
}

// ── De maandfooter ───────────────────────────────────────────────────────────

/**
 * De twee regels van de footer, in documentvolgorde en pal na elkaar. Dat "pal na elkaar"
 * is de tweede assertie in deze ene regex: stond er nog een derde regel tussen — "Niet
 * gedekt", die tot 2026-09-06 het tekort droeg — dan matcht hij niet meer.
 */
// `formatSigned` schrijft een opbouw als `+€ 862,58`, dus het teken moet in de klasse:
// zonder de `+` matcht een overschotmaand niet en meldt het scenario "geen footer" — een
// instrument dat omvalt in plaats van meet. Het em-streepje hoort er ook in: sinds
// 2026-09-06 toont een half verstreken maand (anker of afgesloten) geen maandbedrag.
const FOOTER = /Deze maand ([+−]?€ [\d.,]+|—) Buffer ([+−]?€ [\d.,]+)/;

async function footerPerKolom(page) {
  const kolommen = page.locator(KOLOM);
  const aantal = await kolommen.count();
  const uit = [];

  for (let i = 0; i < aantal; i++) {
    const tekst = (await kolommen.nth(i).innerText()).replace(/\s+/g, ' ');
    const treffer = tekst.match(FOOTER);
    uit.push(
      treffer
        ? {
            kolom: i,
            aanwezig: true,
            // `null` is "geen bedrag getoond" en is iets anders dan 0 — die twee uit
            // elkaar houden is de hele assertie in de ankerkolom.
            beweging: treffer[1] === '—' ? null : bedragUit(treffer[1]),
            stand: bedragUit(treffer[2]),
            rijtekst: treffer[0],
          }
        : { kolom: i, aanwezig: false, rijtekst: tekst.slice(-140) },
    );
  }

  return uit;
}

// ── De twee sleeppaden ───────────────────────────────────────────────────────

/**
 * Toetsenbord. dnd-kit's KeyboardSensor activeert op Spatie, beweegt op pijltjes en laat
 * los op Spatie.
 *
 * Eén ArrowRight, niet meer: de coordinateGetter springt per stap naar de dichtstbijzijnde
 * kolom in die richting, dus één stap hoort exact één kolom op te schuiven. Ruimer drukken
 * maakt de assertie zwakker — twintig stappen landden bij het eerste groene resultaat in
 * kolom 2, en dat had ook "beweegt onvoorspelbaar" kunnen betekenen.
 */
async function toetsenbordpad(page) {
  const handle = greep(page, LABEL);
  await handle.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);

  const opgepakt = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute('aria-pressed') === 'true';
  });
  if (!opgepakt) throw new Error('de post werd niet opgepakt (aria-pressed bleef uit)');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
}

/**
 * Muis. PointerSensor heeft `activationConstraint: { distance: 8 }`, dus één sprong van
 * A naar B activeert de sleep niet — er moeten tussenliggende bewegingen zijn. Dat is
 * precies waarom `left_click_drag` uit een browser-tool hier niets bewees.
 */
async function muispad(page) {
  const handle = greep(page, LABEL);
  const van = await handle.boundingBox();
  const doel = await page.locator(KOLOM).nth(1).boundingBox();
  if (!van || !doel) throw new Error('greep of doelkolom niet in beeld');

  await page.mouse.move(van.x + van.width / 2, van.y + van.height / 2);
  await page.mouse.down();
  // Eerst een korte beweging om de 8px-drempel te passeren, dan in stappen naar het doel.
  await page.mouse.move(van.x + van.width / 2 + 12, van.y + van.height / 2, { steps: 6 });
  await page.mouse.move(doel.x + doel.width / 2, doel.y + doel.height / 2, { steps: 25 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

/**
 * Sleep-assertie: de post hoort van kolom 0 naar kolom 1 te zijn verhuisd, en de app hoort
 * dat te willen wegschrijven. `sync.ts` schrijft met 800ms debounce weg — even wachten
 * maakt van "er kan niets weglekken" een waarneming in plaats van een redenering.
 */
async function verhuisd(page, state, schrijfVoor) {
  await page.waitForTimeout(1_200);
  const geschreven = state.schrijfpogingen.length - schrijfVoor;
  const na = await kolomVanPost(page, LABEL);
  if (na === 1) {
    return { ok: true, bewijs: `post verhuisde van kolom 0 naar kolom 1 (${BRON} → ${DOEL}); ${geschreven} wegschrijf-call onderschept` };
  }
  if (na === 0) return { ok: false, bewijs: 'post staat na afloop nog steeds in kolom 0 — er is niets verplaatst' };
  return { ok: false, bewijs: `post belandde in kolom ${na}, verwacht was kolom 1` };
}

// ── Contrast op het échte scherm ─────────────────────────────────────────────

/**
 * Dezelfde meting als `dom-sweep.mjs`, maar op de draaiende app. Dit is de enige plek waar
 * `MonthCard` en de modals gemeten worden; statisch zijn ze niet te renderen zonder de
 * store en dnd-kit na te bouwen, en dan meet je je eigen namaak.
 */
async function sweep(page, waar) {
  await page.addStyleTag({ content: STIL_CSS });
  const { fouten, gemeten, onmeetbaar, vrijgesteld } = beoordeel(await page.evaluate(meetInPagina));
  return { waar, fouten, gemeten, onmeetbaar: onmeetbaar.length, vrijgesteld };
}

// ── Modals ───────────────────────────────────────────────────────────────────
/**
 * Selecteer op `aria-label`, niet op `[role=dialog]` alleen. Beide sidepanels staan
 * permanent gemonteerd als `role="dialog" aria-modal="true"` en worden enkel met
 * `translate-x-full` uit beeld geschoven — voor Playwright zijn ze dus zichtbaar, en een
 * kale `[role=dialog]` matcht er meteen één. Dat kwam boven doordat de tegenproef
 * "modal die niemand opent" gróen was.
 */
const MODALS = {
  herhaal: {
    naam: 'Herhaal vorige maand',
    open: (page) => page.locator('button', { hasText: '↻ Herhaal' }).first(),
    dialoog: '[role=dialog][aria-label^="Posten overnemen"]',
  },
  betaling: {
    naam: 'Betaling registreren',
    open: (page) => page.locator('button[aria-label="Betaling registreren"]').first(),
    dialoog: '[role=dialog][aria-label="Betaling registreren"]',
  },
};

/**
 * Opent een modal en sluit hem weer met Escape. Dat sluiten ís de assertie: tot 2026-08-08
 * luisterde geen enkele overlay naar Escape, en de harness moest via "Annuleren" sluiten.
 * Nu dat gefixt is, hoort een teruggedraaide fix hier meteen rood te staan.
 */
async function metModaalOpen(page, modal, tijdensOpen, { sluitToets = 'Escape' } = {}) {
  await modal.open(page).click();
  await page.waitForSelector(modal.dialoog, { timeout: 10_000, state: 'visible' });
  const resultaat = tijdensOpen ? await tijdensOpen() : null;
  await page.keyboard.press(sluitToets);
  await page.waitForSelector(modal.dialoog, { timeout: 5_000, state: 'detached' });
  return resultaat;
}

// ── Sidepanels ───────────────────────────────────────────────────────────────
// Ze blijven gemonteerd wanneer ze dicht zijn, dus is "onbereikbaar" hier een assertie en
// geen vanzelfsprekendheid.
const PANELEN = [
  { naam: 'Vaste uitgaven', knop: 'Vaste uitgaven', dialoog: '[aria-label="Vaste uitgaven beheren"]' },
  { naam: 'Spaarpotten', knop: 'Spaarpotten', dialoog: '[aria-label="Spaarpotten beheren"]' },
];

/** Wat het paneel op dit moment aan de a11y-tree vertelt. */
async function panelStaat(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return {
      rol: el.getAttribute('role'),
      ariaModal: el.getAttribute('aria-modal'),
      ariaHidden: el.getAttribute('aria-hidden'),
      inert: el.hasAttribute('inert'),
    };
  }, selector);
}

// ── Runner ───────────────────────────────────────────────────────────────────
/**
 * Eén scenario = één verse context. Anders erft het volgende scenario de sessie én de
 * localStorage van het vorige, en meet je de nasleep van de vorige run.
 *
 * Een scenario levert zelf zijn oordeel: `{ ok, bewijs }`. Dat moest wel — de eerste versie
 * had de sleep-assertie in de runner zitten, en toen kon er niets anders dan een sleep in.
 */
/**
 * Playwright plakt een hele "Call log" onder elke timeout, met kleurcodes. Eén regel met
 * de selector erbij zegt evenveel en houdt de uitslag leesbaar — juist bij de tegenproeven,
 * waar een timeout de bedoeling ís.
 */
function kortBericht(bericht) {
  const regels = String(bericht)
    // eslint-disable-next-line no-control-regex
    .replace(/\[\d+m/g, '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);
  const eerste = regels[0] ?? 'onbekende fout';
  const wachtte = regels.find((r) => r.startsWith('- waiting for'));
  return wachtte ? `${eerste} — ${wachtte.slice(2)}` : eerste;
}

async function draaiScenario(browser, state, scenario) {
  const { naam, gedrag = {}, wachtOp = 'kolommen', pad = '/', viewport = { width: 1600, height: 1000 }, actie } = scenario;
  const context = await browser.newContext({ viewport });
  try {
    const foutenVoor = state.paginafouten.length;
    const page = await openApp(context, state, { gedrag, wachtOp, pad });
    const uitkomst = await actie(page, { state, schrijfVoor: state.schrijfpogingen.length, foutenVoor });
    return { naam, ...uitkomst };
  } catch (err) {
    return { naam, ok: false, bewijs: kortBericht(err.message ?? err) };
  } finally {
    await context.close();
  }
}

/** De scenario's die altijd draaien. */
function scenarios() {
  return [
    {
      naam: 'sleep — toetsenbord',
      actie: async (page, { state, schrijfVoor }) => {
        const voor = await kolomVanPost(page, LABEL);
        if (voor !== 0) throw new Error(`de fixture staat niet in kolom 0 maar in ${voor}`);
        await toetsenbordpad(page);
        return verhuisd(page, state, schrijfVoor);
      },
    },
    {
      naam: 'sleep — muis',
      actie: async (page, { state, schrijfVoor }) => {
        const voor = await kolomVanPost(page, LABEL);
        if (voor !== 0) throw new Error(`de fixture staat niet in kolom 0 maar in ${voor}`);
        await muispad(page);
        return verhuisd(page, state, schrijfVoor);
      },
    },
    {
      // Het scherm zelf, en daarna elke modal open. Samen dekt dit wat `dom-sweep.mjs`
      // per constructie niet kan zien.
      naam: 'contrast — scherm + modals',
      actie: async (page) => {
        const metingen = [
          await sweep(page, 'prognose'),
          await metModaalOpen(page, MODALS.herhaal, () => sweep(page, MODALS.herhaal.naam)),
          await metModaalOpen(page, MODALS.betaling, () => sweep(page, MODALS.betaling.naam)),
        ];
        const fouten = metingen.flatMap((m) => m.fouten.map((f) => ({ ...f, waar: m.waar })));
        const gemeten = metingen.reduce((n, m) => n + m.gemeten, 0);
        if (fouten.length) {
          return {
            ok: false,
            bewijs: `${fouten.length} kleurcombinatie(s) onder AA (${gemeten} tekstelementen gemeten)`,
            details: fouten.map((f) => `[${f.waar}]\n${beschrijfFout(f)}`),
          };
        }
        const per = metingen.map((m) => `${m.waar} ${m.gemeten}`).join(', ');
        return { ok: true, bewijs: `${gemeten} tekstelementen boven AA (${per})` };
      },
    },
    {
      // Openen en sluiten is het pad dat de sweep hierboven nodig heeft; dit scenario
      // toetst het als gedrag, zodat een kapotte modal niet als contrast-fout leest.
      naam: 'modals — openen en sluiten',
      actie: async (page) => {
        const gezien = [];
        for (const modal of [MODALS.herhaal, MODALS.betaling]) {
          const kop = await metModaalOpen(page, modal, async () =>
            (await page.locator(modal.dialoog).innerText()).replace(/\s+/g, ' '),
          );
          if (!kop.includes(modal.naam)) {
            throw new Error(`modal toonde "${kop.slice(0, 80)}", verwacht "${modal.naam}"`);
          }
          gezien.push(modal.naam);
        }
        return { ok: true, bewijs: `${gezien.length} modals geopend en met Escape gesloten: ${gezien.join(', ')}` };
      },
    },
    {
      // Een gesloten sidepanel blijft in de DOM staan voor zijn schuif-animatie. Het mag
      // dan geen dialoog meer zijn, niet in de a11y-tree staan en niet tabbaar zijn.
      naam: 'sidepanels — dicht is onbereikbaar',
      actie: async (page) => {
        const bewijzen = [];
        for (const paneel of PANELEN) {
          const dicht = await panelStaat(page, paneel.dialoog);
          if (!dicht) throw new Error(`${paneel.naam}: paneel niet gevonden (${paneel.dialoog})`);
          if (dicht.rol || dicht.ariaModal) {
            throw new Error(`${paneel.naam}: dicht paneel meldt zich nog als ${dicht.rol}/aria-modal=${dicht.ariaModal}`);
          }
          if (dicht.ariaHidden !== 'true' || !dicht.inert) {
            throw new Error(`${paneel.naam}: dicht paneel is bereikbaar (aria-hidden=${dicht.ariaHidden}, inert=${dicht.inert})`);
          }

          await page.locator('header button', { hasText: paneel.knop }).first().click();
          await page.waitForSelector(`${paneel.dialoog}[role=dialog]`, { timeout: 10_000, state: 'visible' });
          const open = await panelStaat(page, paneel.dialoog);
          if (open.inert || open.ariaHidden === 'true') {
            throw new Error(`${paneel.naam}: open paneel is verborgen (aria-hidden=${open.ariaHidden}, inert=${open.inert})`);
          }

          // Escape moet ook hier werken; dat was de tweede helft van dezelfde fix.
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
          const opnieuwDicht = await panelStaat(page, paneel.dialoog);
          if (opnieuwDicht.rol || !opnieuwDicht.inert) {
            throw new Error(`${paneel.naam}: Escape sloot het paneel niet (role=${opnieuwDicht.rol}, inert=${opnieuwDicht.inert})`);
          }
          bewijzen.push(paneel.naam);
        }
        return { ok: true, bewijs: `${bewijzen.length} panelen: dicht inert + uit de a11y-tree, open bereikbaar, Escape sluit` };
      },
    },
    {
      // De fixture heeft geen bufferpot, dus het eindsaldo wordt nergens naar €0 geveegd
      // en elke kolom opent op een echt bedrag. Alle drie horen dus een saldoregel te
      // tonen — binnen de inkomstensectie, want de kop telt hem mee.
      naam: 'saldo — regel staat in de inkomstensectie',
      actie: async (page, { state, schrijfVoor }) => {
        const rijen = await saldoPerKolom(page);
        if (rijen.length !== 3) throw new Error(`${rijen.length} kolommen in plaats van 3`);

        const ontbreekt = rijen.filter((r) => !r.aanwezig);
        if (ontbreekt.length) {
          throw new Error(
            `kolom ${ontbreekt.map((r) => r.kolom).join(', ')} toont geen saldoregel terwijl er zonder bufferpot wél een saldo doorrolt`,
          );
        }

        const buiten = rijen.filter((r) => !r.inSectie);
        if (buiten.length) {
          throw new Error(
            `saldoregel staat buiten de inkomstensectie in kolom ${buiten.map((r) => r.kolom).join(', ')}`,
          );
        }

        // Kolom 0 is de ankerkolom: daar is het je banksaldo en dus bewerkbaar. De rest
        // toont het doorgerolde saldo en is read-only.
        if (rijen[0].label !== 'Beginsaldo') {
          throw new Error(`kolom 0 draagt "${rijen[0].label}" in plaats van "Beginsaldo"`);
        }
        const verkeerd = rijen.slice(1).filter((r) => r.label !== 'Vorig saldo');
        if (verkeerd.length) {
          throw new Error(
            `kolom ${verkeerd.map((r) => r.kolom).join(', ')} draagt "${verkeerd[0].label}" in plaats van "Vorig saldo"`,
          );
        }

        // Bewerkbaar in de ankerkolom, read-only daarbuiten. Meetbaar aan de rij zelf: daar
        // draagt het bedrag een knop, elders is het tekst. En de rij is geen post — geen
        // sleepgreep, geen verwijderknop — dus dat is meteen de hele knoppentelling.
        const rij = (i) => page.locator(KOLOM).nth(i).locator('div').filter({ hasText: SALDO }).last();
        const knoppen = [];
        for (const r of rijen) knoppen.push(await rij(r.kolom).locator('button').count());
        if (knoppen[0] !== 1) {
          throw new Error(`kolom 0 heeft ${knoppen[0]} knoppen in de saldoregel in plaats van één aanklikbaar bedrag`);
        }
        if (knoppen[1] || knoppen[2]) {
          throw new Error(`een doorgerold saldo is bewerkbaar (kolom 1: ${knoppen[1]}, kolom 2: ${knoppen[2]} knoppen)`);
        }

        // Klikken en wégklikken zónder iets te typen mag niets wegschrijven — dat is de
        // bug uit HANDOFF 2026-08-05, en het pad verhuist met deze regel mee. Meetbaar aan
        // de onderschepte wegschrijf-calls, niet aan het scherm.
        await rij(0).locator('button').click();
        await page.waitForSelector('[aria-label="Beginsaldo aanpassen"]', { timeout: 5_000, state: 'visible' });
        await page.locator('h1').click();
        await page.waitForSelector('[aria-label="Beginsaldo aanpassen"]', { timeout: 5_000, state: 'detached' });
        // Ruim voorbij de 800 ms debounce van lib/cashflow/sync.ts — dezelfde marge als
        // `verhuisd()`. Korter en de teller staat gegarandeerd op nul, ongeacht de code.
        await page.waitForTimeout(1_200);
        const extra = state.schrijfpogingen.length - schrijfVoor;
        if (extra > 0) {
          throw new Error(`wegklikken zonder wijziging stuurde ${extra} wegschrijf-call(s) — de correctie-guard is weg`);
        }

        if (rijen.some((r) => r.bedrag === null)) throw new Error(`onleesbaar bedrag: ${JSON.stringify(rijen)}`);
        return {
          ok: true,
          bewijs: `3 saldoregels binnen de inkomstensectie (${rijen.map((r) => `${r.label} ${r.bedrag}`).join(' · ')}), alleen kolom 0 bewerkbaar, wegklikken schrijft niets`,
        };
      },
    },
    {
      // Zonder posten en zonder referentiebalans staat elke maand op nul. De ankerkolom
      // toont zijn beginsaldo dan nog steeds — daar corrigeer je je banksaldo — maar een
      // latere maand hoort geen regel te tonen die alleen "€ 0,00" herhaalt.
      naam: 'saldo — geen nulregel in latere maanden',
      gedrag: { leeg: true },
      actie: async (page) => {
        const rijen = await saldoPerKolom(page);
        if (rijen.length !== 3) throw new Error(`${rijen.length} kolommen in plaats van 3`);

        if (!rijen[0].aanwezig) throw new Error('de ankerkolom toont geen beginsaldo');
        if (rijen[0].label !== 'Beginsaldo') {
          throw new Error(`kolom 0 draagt "${rijen[0].label}" in plaats van "Beginsaldo"`);
        }
        if (Math.abs(rijen[0].bedrag) >= 0.005) {
          throw new Error(`de lege fixture geeft kolom 0 een saldo van ${rijen[0].bedrag} in plaats van 0`);
        }

        const blijvers = rijen.slice(1).filter((r) => r.aanwezig);
        if (blijvers.length) {
          throw new Error(
            `kolom ${blijvers.map((r) => r.kolom).join(', ')} toont nog een saldoregel: "${blijvers[0].rijtekst}"`,
          );
        }
        return { ok: true, bewijs: 'ankerkolom houdt zijn beginsaldo, kolom 1 en 2 tonen geen nulregel' };
      },
    },
    {
      // De maandfooter met een bufferpot die het tekort niet meer draagt. Tot 2026-09-06
      // stond daar "Buffer € 0,00" naast een aparte regel "Niet gedekt": de pot was leeg,
      // dus de prominentste regel van de kolom meldde nul op het moment dat je er het
      // slechtst voor stond. En "Deze maand" toonde de potbeweging — die per constructie
      // exact de potstand van de maand ervoor is zodra het tekort de pot overstijgt,
      // waardoor het scherm eruitzag alsof het die stand doorschoof.
      naam: 'buffer — negatieve stand in de footer',
      gedrag: { buffer: true },
      actie: async (page) => {
        const rijen = await footerPerKolom(page);
        if (rijen.length !== 3) throw new Error(`${rijen.length} kolommen in plaats van 3`);

        const ontbreekt = rijen.filter((r) => !r.aanwezig);
        if (ontbreekt.length) {
          throw new Error(
            `kolom ${ontbreekt.map((r) => r.kolom).join(', ')} toont geen footer met "Deze maand" direct gevolgd door "Buffer" — staart: ${ontbreekt[0].rijtekst}`,
          );
        }

        // Anker: half verstreken maand, dus géén maandbedrag — wel de stand. De pot
        // vangt op wat er van het banksaldo van 1000 overblijft na een kost van 137,42.
        // Tweede maand: 500 inkomen, dus opbouw — die kolom draagt het `+`-teken.
        // Derde maand: een kost van 1600 tegen een pot van 1362,58 — het tekort overstijgt
        // de pot, dus dáár moet de stand negatief zijn in plaats van nul.
        const verwacht = [
          { beweging: null, stand: 862.58 },
          { beweging: 500, stand: 1362.58 },
          { beweging: -1600, stand: -237.42 },
        ];
        for (const [i, v] of verwacht.entries()) {
          if (v.beweging === null) {
            if (rijen[i].beweging !== null) {
              throw new Error(`kolom ${i} toont een maandbedrag (${rijen[i].beweging}) in een half verstreken maand — "${rijen[i].rijtekst}"`);
            }
          } else if (rijen[i].beweging === null || Math.abs(rijen[i].beweging - v.beweging) >= 0.005) {
            throw new Error(`kolom ${i} beweegt ${rijen[i].beweging} in plaats van ${v.beweging} — "${rijen[i].rijtekst}"`);
          }
          if (Math.abs(rijen[i].stand - v.stand) >= 0.005) {
            throw new Error(`kolom ${i} staat op ${rijen[i].stand} in plaats van ${v.stand} — "${rijen[i].rijtekst}"`);
          }
        }

        // De invariant over het venster, op het scherm gelezen in plaats van in de kern:
        // wat een maand beweegt, brengt je van de vorige stand naar deze.
        const verschil = rijen[2].stand - rijen[1].stand;
        if (Math.abs(verschil - rijen[2].beweging) >= 0.005) {
          throw new Error(`standverschil ${verschil} ≠ beweging ${rijen[2].beweging} in kolom 2`);
        }

        return {
          ok: true,
          bewijs: `kolom 0 toont "${rijen[0].rijtekst}" (geen maandbedrag in een half verstreken maand) en kolom 2 "${rijen[2].rijtekst}" — stand negatief, beweging is het volle tekort, geen regel "Niet gedekt" ertussen`,
        };
      },
    },
    {
      // De tegenhanger van het scenario hierboven, op de standaardfixture: zonder pot met
      // `coversDeficit` hoort de footer de hint te tonen en géén bedragen. Twee signalen
      // uit dezelfde DOM, in tegengestelde richting — zou de footer tóch zijn twee regels
      // renderen, dan valt de tweede assertie.
      naam: 'buffer — hint zonder bufferpot',
      actie: async (page) => {
        const kolommen = page.locator(KOLOM);
        const aantal = await kolommen.count();
        if (aantal !== 3) throw new Error(`${aantal} kolommen in plaats van 3`);

        const rijen = await footerPerKolom(page);
        const metBedrag = rijen.filter((r) => r.aanwezig);
        if (metBedrag.length) {
          throw new Error(`kolom ${metBedrag.map((r) => r.kolom).join(', ')} toont bufferbedragen zonder bufferpot`);
        }

        for (let i = 0; i < aantal; i++) {
          const tekst = (await kolommen.nth(i).innerText()).replace(/\s+/g, ' ');
          if (!tekst.includes('Geen buffer')) {
            throw new Error(`kolom ${i} toont de hint "Geen buffer" niet — staart: ${tekst.slice(-140)}`);
          }
        }
        return { ok: true, bewijs: 'drie kolommen tonen de hint "Geen buffer" en geen enkel bufferbedrag' };
      },
    },
    {
      // Een trage fetch hoort een skeleton te geven, geen leeg scherm en geen nullen.
      naam: 'state — laden',
      gedrag: { vertragingMs: 2_500 },
      wachtOp: 'niets',
      actie: async (page) => {
        await page.waitForSelector('[aria-busy="true"]', { timeout: 10_000, state: 'visible' });
        // En hij hoort ook weer wég te gaan: een skeleton die blijft staan is even stuk
        // als een die er nooit was.
        await page.waitForSelector(KOLOM, { timeout: 20_000, state: 'visible' });
        return { ok: true, bewijs: 'skeleton met aria-busy tijdens het laden, daarna de prognose' };
      },
    },
    {
      // Geldig document, geen posten: lege staten per sectie, geen blanco kolom.
      naam: 'state — leeg',
      gedrag: { leeg: true },
      actie: async (page) => {
        const verwacht = ['Geen inkomsten', 'Geen vaste uitgaven', 'Geen eenmalige uitgaven'];
        const tekst = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
        const ontbreekt = verwacht.filter((v) => !tekst.includes(v));
        if (ontbreekt.length) throw new Error(`lege staat ontbreekt: ${ontbreekt.join(', ')}`);
        return { ok: true, bewijs: `drie lege staten getoond in plaats van een blanco kolom` };
      },
    },
    {
      // Mislukte fetch: een eigen foutscherm met een herkansing, geen prognose die er
      // wél uitziet alsof ze klopt.
      naam: 'state — fout',
      gedrag: { documentStatus: 500 },
      wachtOp: 'niets',
      actie: async (page) => {
        await page.waitForSelector('text=Gegevens niet geladen', { timeout: 20_000, state: 'visible' });
        const herkansing = await page.locator('button', { hasText: 'Opnieuw proberen' }).count();
        if (!herkansing) throw new Error('foutscherm zonder "Opnieuw proberen" — doodlopend');
        const kolommen = await page.locator(KOLOM).count();
        if (kolommen) throw new Error('de prognose staat er tóch, naast het foutscherm');
        return { ok: true, bewijs: 'foutscherm met herkansing, geen half gevulde prognose' };
      },
    },
  ];
}

/**
 * De tegenproeven. Elke nieuwe assertie krijgt er één: een guard die niet kán afgaan meldt
 * "geen fouten" even overtuigend als een die werkt. Deze horen dus te FALEN; de runner
 * keert hun oordeel om.
 */
// ── Bureau ───────────────────────────────────────────────────────────────────
//
// Dezelfde onderschepping, andere routes. Elke schrijftelling wacht voorbij de 800 ms debounce
// van sync.ts, net als `verhuisd()`: korter en de teller staat gegarandeerd op nul, ongeacht de
// code — een meting die niet kán falen.

const DOELEN = '/bureau/doelen';
const nieuweSchrijfacties = async (page, state, basis) => {
  await page.waitForTimeout(1_200);
  return state.schrijfpogingen.length - basis;
};

/** Contrast, kopstructuur en toetsenbord op één pagina; alle drie moeten schoon zijn. */
async function a11yOp(page, waar) {
  const contrast = await sweep(page, waar);
  const koppen = await kopstructuur(page);
  const toetsen = await toetsenbord(page);
  const problemen = [
    ...contrast.fouten.map((f) => `contrast: ${beschrijfFout(f)}`),
    ...koppen.problemen.map((p) => `koppen: ${p}`),
    ...toetsen.problemen.map((p) => `toetsenbord: ${p}`),
  ];
  return { problemen, gemeten: contrast.gemeten, koppen: koppen.aantal, stops: toetsen.stops, segmenten: toetsen.segmenten };
}

const VERKOOP = '/bureau/verkoop';

/** Opent de sheet van één kans via zijn rij; een afgesloten kans staat achter "Toon afgesloten". */
async function openKans(page, id) {
  if ((await page.locator(`[data-opportunity-row="${id}"]`).count()) === 0) await page.locator('#kansen-gesloten').click();
  await page.locator(`[data-opportunity-row="${id}"] button`, { hasText: 'Openen' }).click();
  await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'visible' });
}

/** Het weggeschreven document: precies één project verwijst naar de kans, en de kans terug naar dat project. */
function eenProjectVoorKans(doc, kansId) {
  const verwijzend = (doc?.bureau?.projects ?? []).filter((p) => p.opportunityId === kansId);
  const kans = (doc?.bureau?.opportunities ?? []).find((o) => o.id === kansId);
  if (verwijzend.length !== 1) return `${verwijzend.length} projecten verwijzen naar de kans in het weggeschreven document`;
  if (kans?.projectId !== verwijzend[0].id) return 'de kans verwijst niet naar het nieuwe project';
  return null;
}

/**
 * Gewonnen → project: één schrijfactie, en in dat document precies één project dat naar de kans
 * verwijst. `vervals` krijgt het weggeschreven document vóór de controle — alleen de tegenproef
 * gebruikt dat, om te tonen dat de controle een dubbele omzetting ziet.
 */
async function omzettingEenmaal(page, state, { vervals } = {}) {
  await openKans(page, 'harnas-gewonnen');
  const basis = state.schrijfpogingen.length;
  await page.fill('#omzetting-naam', 'Harnasdiagnose');
  await page.locator('[role=dialog] button', { hasText: 'Project aanmaken' }).click();
  await page.waitForSelector('[role=dialog] [data-converted]', { timeout: 5_000 });
  const extra = await nieuweSchrijfacties(page, state, basis);
  const knoppen = await page.locator('[role=dialog] button', { hasText: 'Project aanmaken' }).count();
  const doc = structuredClone(state.documenten.at(-1));
  vervals?.(doc);
  if (extra !== 1) throw new Error(`omzetten gaf ${extra} schrijfacties in plaats van één`);
  const fout = eenProjectVoorKans(doc, 'harnas-gewonnen');
  if (fout) throw new Error(fout);
  if (doc.bureau.clients.length !== 1) throw new Error(`${doc.bureau.clients.length} klanten — de bestaande klant had hergebruikt moeten worden`);
  if (knoppen !== 0) throw new Error(`"Project aanmaken" staat er na de omzetting nog ${knoppen} keer`);
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'detached' });
  await openKans(page, 'harnas-gewonnen');
  const opnieuw = await page.locator('[role=dialog] button', { hasText: 'Project aanmaken' }).count();
  const link = await page.locator('[role=dialog] [data-converted] a').innerText();
  if (opnieuw !== 0) throw new Error('na heropenen staat "Project aanmaken" er weer');
  if (link !== 'Harnasdiagnose') throw new Error(`heropende sheet linkt naar "${link}"`);
  return { ok: true, bewijs: `1 schrijfactie; document: 1 project met opportunityId, kans.projectId gezet, 1 klant; knop 0× ook na heropenen, link "${link}"` };
}

/** De trechter: breuken met noemer, geen percentage onder vijf, en de open stand nu. */
async function trechterKlopt(page) {
  const tekst = async (sel) => (await page.locator(sel).innerText()).replace(/\s+/g, ' ');
  const gv = await tekst('[data-conversion="gesprek-voorstel"] dd');
  const vg = await tekst('[data-conversion="voorstel-gewonnen"] dd');
  const beslist = await tekst('[data-conversion="beslist"] dd');
  const lijn = await tekst('[data-pipeline-line]');
  const trechter = await tekst('section[aria-labelledby="trechter-titel"]');
  const fouten = [];
  if (!gv.startsWith('2 van 3')) fouten.push(`gesprek → voorstel "${gv}"`);
  if (!vg.startsWith('1 van 3')) fouten.push(`voorstel → gewonnen "${vg}"`);
  if (!beslist.startsWith('1 van 2')) fouten.push(`beslist "${beslist}"`);
  if (/%/.test(trechter)) fouten.push('een percentage bij noemers onder vijf');
  if (!/te weinig voor een percentage/.test(gv)) fouten.push('geen melding dat de noemer te klein is');
  if (!lijn.includes('Open nu 2 kansen') || !lijn.includes('€ 20.000') || !lijn.includes('1 zonder waarde') || !lijn.includes('1 van 2 gekwalificeerd')) fouten.push(`open-lijn "${lijn}"`);
  if (fouten.length) throw new Error(fouten.join(' · '));
  return { ok: true, bewijs: `"${gv}" · "${vg}" · "${beslist}" · "${lijn}"` };
}

/** Verloren zonder reden: melding, niets weg. Met reden: één overgang mét die reden in het document. */
async function verlorenVraagtReden(page, state, { redenVooraf = false } = {}) {
  await openKans(page, 'harnas-voorstel');
  await page.selectOption('#stadium-nieuw', 'verloren');
  if (redenVooraf) await page.fill('#stadium-reden', 'Harnasreden');
  const basis = state.schrijfpogingen.length;
  await page.locator('[role=dialog] button', { hasText: 'Stadium wijzigen' }).click();
  const melding = await page.locator('#stadium-reden-fout').count();
  const zonder = await nieuweSchrijfacties(page, state, basis);
  if (melding !== 1 || zonder !== 0) throw new Error(`verloren zonder reden: ${melding} melding(en), ${zonder} schrijfactie(s)`);
  await page.fill('#stadium-reden', 'Harnasreden');
  await page.locator('[role=dialog] button', { hasText: 'Stadium wijzigen' }).click();
  await page.waitForSelector('[role=dialog] [data-stage-now="verloren"]', { timeout: 5_000 });
  const met = await nieuweSchrijfacties(page, state, basis);
  const kans = state.documenten.at(-1)?.bureau?.opportunities?.find((o) => o.id === 'harnas-voorstel');
  const laatste = kans?.history?.at(-1);
  if (met !== 1) throw new Error(`met reden ${met} schrijfacties`);
  if (kans?.history?.length !== 4 || laatste?.stage !== 'verloren' || laatste?.reason !== 'Harnasreden') throw new Error(`historie in het document: ${JSON.stringify(kans?.history)}`);
  // De rij staat nu achter "Toon afgesloten": de knop die opende bestaat niet meer.
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'detached' });
  await page.waitForFunction(() => document.activeElement && document.activeElement !== document.body, null, { timeout: 2_000 }).catch(() => {});
  const terug = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  if (terug !== 'kans-nieuw') throw new Error(`focus na sluiten op "${terug}" in plaats van "Nieuwe kans"`);
  return { ok: true, bewijs: 'zonder reden: melding + 0 schrijfacties; met reden: 1 schrijfactie, sheet bleef open, historie 3 → 4 met stadium en reden; focus terug op "Nieuwe kans"' };
}

const CASH = '/bureau/cash';
const KLANTEN = '/bureau/klanten';

/** Klapt de regels van elke week open en geeft alle regelteksten terug. */
async function alleCashRegels(page) {
  const knoppen = page.locator('[data-cash-week] button[aria-expanded="false"]');
  for (let i = await knoppen.count(); i > 0; i--) await knoppen.first().click();
  return page.locator('[data-cash-line]').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ')));
}

/** De vervallen factuur zonder datum staat apart en in geen enkele week; de gedateerde precies één keer, in haar week. */
async function vervallenStaatApart(page) {
  const apart = page.locator('[data-unplaced-reason="achterstallig-zonder-datum"] [data-unplaced="harnas-factuur-oud"]');
  if ((await apart.count()) !== 1) throw new Error('de vervallen factuur zonder datum staat niet in de aparte lijst');
  const tekst = (await apart.innerText()).replace(/\s+/g, ' ');
  if (!tekst.includes('731,17')) throw new Error(`aparte regel zonder bedrag 731,17: "${tekst}"`);
  const regels = await alleCashRegels(page);
  const inWeek = regels.filter((r) => r.includes('731,17'));
  if (inWeek.length) throw new Error(`731,17 staat tóch in een week: "${inWeek[0]}"`);
  const later = regels.filter((r) => r.includes('1.234,56'));
  if (later.length !== 1) throw new Error(`de gedateerde factuur staat ${later.length} keer in de weken`);
  const verwacht = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 14); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const rij = await page.locator('[data-cash-line]', { hasText: '1.234,56' }).evaluate((el) => {
    const detail = el.closest('tr');
    const week = detail?.previousElementSibling;
    return { from: week?.getAttribute('data-from'), to: week?.getAttribute('data-to') };
  });
  if (!(rij.from <= verwacht && verwacht <= rij.to)) throw new Error(`gedateerde factuur in week ${rij.from}–${rij.to}, verwacht ${verwacht}`);
  const alarm = await page.locator('[role=alert]', { hasText: 'sluiten niet aan' }).count();
  if (alarm) throw new Error('de pagina meldt dat de weken niet aansluiten op de maandprognose');
  return { ok: true, bewijs: `731,17 apart ("${tekst.slice(0, 70)}…"), 0× in ${regels.length} weekregels; 1.234,56 één keer, in week ${rij.from}–${rij.to}; geen reconciliatie-alarm` };
}

/**
 * Betaald afvinken: één schrijfactie, de post weg uit de prognose, de factuur betaald — en
 * uitvinken zet een post terug. `vervals` krijgt het document vóór de controle (tegenproef).
 */
async function betaaldHaaltPostWeg(page, state, { vervals } = {}) {
  const rij = page.locator('[data-invoice-row="harnas-factuur-later"]');
  const basis = state.schrijfpogingen.length;
  await rij.locator('button[role=checkbox]').click();
  await rij.locator('[data-ledger="betaald-uit-prognose"]').waitFor({ timeout: 5_000 });
  const extra = await nieuweSchrijfacties(page, state, basis);
  const doc = structuredClone(state.documenten.at(-1));
  vervals?.(doc);
  const post = (doc?.incomeItems ?? []).filter((i) => i.id === 'harnas-post-later');
  const factuur = doc?.bureau?.projects?.find((p) => p.id === 'harnas-met')?.invoices?.find((i) => i.id === 'harnas-factuur-later');
  if (extra !== 1) throw new Error(`betaald afvinken gaf ${extra} schrijfacties`);
  if (post.length) throw new Error('de post staat na betaling nog in de prognose');
  if (!factuur?.paidOn || factuur.incomeItemId !== null) throw new Error(`factuur na betaling: ${JSON.stringify({ paidOn: factuur?.paidOn, incomeItemId: factuur?.incomeItemId })}`);
  const basisTerug = state.schrijfpogingen.length;
  await rij.locator('button[role=checkbox]').click();
  await rij.locator('[data-ledger="in-prognose"]').waitFor({ timeout: 5_000 });
  // De schrijfactie volgt na de debounce van sync.ts; zonder wachten leest dit het vorige document.
  const terugSchrijf = await nieuweSchrijfacties(page, state, basisTerug);
  if (terugSchrijf !== 1) throw new Error(`uitvinken gaf ${terugSchrijf} schrijfacties`);
  const terug = state.documenten.at(-1);
  const nieuweId = terug?.bureau?.projects?.find((p) => p.id === 'harnas-met')?.invoices?.find((i) => i.id === 'harnas-factuur-later')?.incomeItemId;
  const nieuwePost = (terug?.incomeItems ?? []).find((i) => i.id === nieuweId);
  if (!nieuwePost || nieuwePost.amount !== 1234.56) throw new Error(`uitvinken: post ${JSON.stringify(nieuwePost)}`);
  return { ok: true, bewijs: `1 schrijfactie; post weg, factuur betaald; uitvinken: nieuwe post van € 1.234,56 in ${nieuwePost.monthKey}` };
}

/** De twee bases, elk met eigen noemer; "boven limiet" als woord; per groep telt de groep samen. */
async function concentratieKlopt(page) {
  const tekst = async (sel) => (await page.locator(sel).innerText()).replace(/\s+/g, ' ');
  const fouten = [];
  const gerNoemer = await page.locator('[data-concentration="gerealiseerd"] caption').getAttribute('data-denominator');
  const progNoemer = await page.locator('[data-concentration="prognose"] caption').getAttribute('data-denominator');
  if (gerNoemer !== '100000') fouten.push(`noemer gerealiseerd ${gerNoemer}`);
  if (progNoemer !== '200000') fouten.push(`noemer vooruitblik ${progNoemer}`);
  const c = await tekst('[data-concentration="gerealiseerd"] [data-concentration-row="harnas-klant-c"]');
  const a = await tekst('[data-concentration="gerealiseerd"] [data-concentration-row="harnas-klant-a"]');
  if (!/50 %.*boven limiet/.test(c)) fouten.push(`klant C "${c}"`);
  if (/boven limiet/.test(a) || !a.includes('30 %')) fouten.push(`klant A op precies de limiet "${a}"`);
  const pc = await tekst('[data-concentration="prognose"] [data-concentration-row="harnas-klant-c"]');
  if (!pc.includes('70 %')) fouten.push(`vooruitblik C "${pc}"`);
  await page.locator('#klanten-per-groep').click();
  await page.locator('[data-concentration="gerealiseerd"] [data-concentration-row="harnas-groep"]').waitFor({ timeout: 5_000 });
  const groep = await tekst('[data-concentration="gerealiseerd"] [data-concentration-row="harnas-groep"]');
  if (!/Harnasgroep.*2 klanten.*50 %.*boven limiet/.test(groep)) fouten.push(`groep "${groep}"`);
  if (fouten.length) throw new Error(fouten.join(' · '));
  return { ok: true, bewijs: `noemers 100.000 / 200.000; C "${c}"; A "${a}"; vooruitblik C 70 %; groep "${groep}"` };
}

function bureauScenarios() {
  return [
    {
      naam: 'bureau — document zonder bureau-sleutel',
      pad: DOELEN,
      wachtOp: 'bureau',
      actie: async (page, { state, foutenVoor }) => {
        const leeg = page.locator('[data-empty-state]');
        if ((await leeg.count()) !== 1) throw new Error(`${await leeg.count()} lege staten in plaats van één`);
        const tekst = await leeg.innerText();
        if (!tekst.includes('Nog geen doelen')) throw new Error(`lege staat zonder uitleg: "${tekst.slice(0, 80)}"`);
        const fouten = state.paginafouten.length - foutenVoor;
        if (fouten) throw new Error(`${fouten} paginafout(en): ${state.paginafouten.slice(-fouten).join(' | ')}`);
        return { ok: true, bewijs: 'v15-document zonder bureau: één lege staat "Nog geen doelen", geen paginafout' };
      },
    },
    {
      naam: 'doelen — startwaarden schrijven niets tot opslaan',
      pad: DOELEN,
      wachtOp: 'bureau',
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.locator('button', { hasText: 'Startwaarden invullen' }).click();
        await page.waitForSelector('#doel-omzet', { timeout: 5_000, state: 'visible' });
        const waarde = await page.inputValue('#doel-omzet');
        if (waarde !== '200000') throw new Error(`omzetdoel toont "${waarde}", niet de startwaarde 200000`);
        const zonderOpslaan = await nieuweSchrijfacties(page, state, basis);
        if (zonderOpslaan) throw new Error(`startwaarden invullen schreef ${zonderOpslaan} keer weg zonder opslaan`);
        await page.locator('button[type=submit]', { hasText: 'opslaan' }).click();
        const naOpslaan = await nieuweSchrijfacties(page, state, basis);
        if (naOpslaan !== 1) throw new Error(`opslaan gaf ${naOpslaan} schrijfacties in plaats van één`);
        const status = await page.locator('button[type=submit]').innerText();
        return { ok: true, bewijs: `0 schrijfacties na "Startwaarden invullen", 1 na opslaan; knop daarna "${status}"` };
      },
    },
    {
      naam: 'doelen — somregel toont het verschil, corrigeert niets',
      pad: DOELEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.fill('#doel-dagen-klantwerk', '130');
        const regel = await page.locator('[data-sum-line]', { hasText: 'Som categorieën' }).innerText();
        if (!/verschil \+2 d/.test(regel)) throw new Error(`somregel meldt geen verschil +2 d: "${regel}"`);
        const totaal = await page.inputValue('#doel-dagen-totaal');
        if (totaal !== '200') throw new Error(`het totaal veranderde mee naar "${totaal}"`);
        const extra = await nieuweSchrijfacties(page, state, basis);
        if (extra) throw new Error(`typen in het formulier schreef ${extra} keer weg`);
        return { ok: true, bewijs: `"${regel.replace(/\s+/g, ' ')}", totaal blijft 200, 0 schrijfacties` };
      },
    },
    {
      naam: 'doelen — onleesbare invoer blokkeert opslaan',
      pad: DOELEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.fill('#doel-omzet', 'veel');
        await page.locator('button[type=submit]').click();
        await page.waitForSelector('#doel-omzet[aria-invalid="true"]', { timeout: 5_000 });
        // De focus volgt één frame na de melding (requestAnimationFrame): wacht erop, lees niet ervóór.
        await page.waitForFunction(() => document.activeElement?.id === 'doel-omzet', null, { timeout: 2_000 }).catch(() => {});
        const focus = await page.evaluate(() => document.activeElement?.id);
        if (focus !== 'doel-omzet') throw new Error(`focus staat op "${focus}", niet op het ongeldige veld`);
        const extra = await nieuweSchrijfacties(page, state, basis);
        if (extra) throw new Error(`een ongeldig formulier schreef ${extra} keer weg`);
        return { ok: true, bewijs: 'aria-invalid op het omzetveld, focus erop, 0 schrijfacties' };
      },
    },
    {
      naam: 'bureau — contrast, koppen en toetsenbord op doelen',
      pad: DOELEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page) => {
        const r = await a11yOp(page, 'doelen');
        if (r.problemen.length) throw new Error(r.problemen.slice(0, 4).join(' · '));
        return { ok: true, bewijs: `${r.gemeten} tekstelementen boven AA, ${r.koppen} koppen zonder sprong, ${r.stops} tabstops met zichtbare focus` };
      },
    },
    {
      naam: 'tijd — snelle invoer: Enter registreert, focus terug op uren, context blijft',
      pad: '/bureau/tijd',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        const voor = await page.locator('[data-time-entry]').count();
        await page.selectOption('#tijd-project', 'harnas-met');
        await page.fill('#tijd-uren', '1,5');
        await page.press('#tijd-uren', 'Enter');
        await page.waitForFunction((n) => document.querySelectorAll('[data-time-entry]').length === n + 1, voor, { timeout: 5_000 });
        const extra = await nieuweSchrijfacties(page, state, basis);
        const focus = await page.evaluate(() => document.activeElement?.id);
        const [cat, proj, uren] = await Promise.all([page.inputValue('#tijd-categorie'), page.inputValue('#tijd-project'), page.inputValue('#tijd-uren')]);
        const nieuw = await page.locator('[data-time-entry]').last().innerText();
        if (extra !== 1) throw new Error(`registreren gaf ${extra} schrijfacties in plaats van één`);
        if (focus !== 'tijd-uren') throw new Error(`focus staat op "${focus}", niet op het urenveld`);
        if (cat !== 'klantwerk' || proj !== 'harnas-met') throw new Error(`categorie/project niet behouden: ${cat} / ${proj}`);
        if (uren !== '') throw new Error(`urenveld niet leeg na registreren: "${uren}"`);
        if (!/1,5 u/.test(nieuw)) throw new Error(`nieuwe regel toont geen 1,5 u: "${nieuw.replace(/\s+/g, ' ')}"`);
        return { ok: true, bewijs: `1 regel erbij ("${nieuw.replace(/\s+/g, ' ').slice(0, 40)}…"), 1 schrijfactie, focus op #tijd-uren, klantwerk + project behouden, uren leeg` };
      },
    },
    {
      naam: 'tijd — klantwerk zonder project wordt geweigerd',
      pad: '/bureau/tijd',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.fill('#tijd-uren', '2');
        await page.press('#tijd-uren', 'Enter');
        await page.waitForSelector('#tijd-fout', { timeout: 5_000 });
        const melding = await page.locator('#tijd-fout').innerText();
        const invalid = await page.getAttribute('#tijd-project', 'aria-invalid');
        const extra = await nieuweSchrijfacties(page, state, basis);
        if (!melding.includes('Kies een project')) throw new Error(`melding: "${melding}"`);
        if (invalid !== 'true') throw new Error('projectveld niet als ongeldig gemarkeerd');
        if (extra) throw new Error(`${extra} schrijfactie(s) bij een geweigerde registratie`);
        return { ok: true, bewijs: `"${melding}", aria-invalid op #tijd-project, 0 schrijfacties` };
      },
    },
    {
      naam: 'tijd — capaciteit: registraties als besteed, planning als resterend, zonder overlap',
      pad: '/bureau/tijd',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const lijn = () => page.locator('[data-capacity-line]').innerText();
        const voor = (await lijn()).replace(/\s+/g, ' ');
        if (!/besteed 6 d · gepland 0 d/.test(voor)) throw new Error(`vooraf verwacht besteed 6 d, gepland 0 d: "${voor}"`);
        await page.getByRole('tab', { name: 'Planning' }).click();
        await page.selectOption('#plan-project', 'harnas-met');
        await page.fill('#plan-dagen', '2');
        await page.locator('button', { hasText: 'Inplannen' }).click();
        await page.waitForFunction(() => /gepland 2 d/.test(document.querySelector('[data-capacity-line]')?.textContent ?? ''), null, { timeout: 5_000 });
        const na = (await lijn()).replace(/\s+/g, ' ');
        if (!/besteed 6 d · gepland 2 d/.test(na)) throw new Error(`na inplannen verwacht besteed 6 d, gepland 2 d: "${na}"`);
        return { ok: true, bewijs: `"${voor.slice(0, 30)}…" → "${na.slice(0, 30)}…" — besteed onveranderd` };
      },
    },
    {
      naam: 'tijd — revisieconflict zet registreren uit, met hint',
      pad: '/bureau/tijd',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten', conflict: true },
      actie: async (page) => {
        await page.selectOption('#tijd-project', 'harnas-met');
        await page.fill('#tijd-uren', '1');
        await page.press('#tijd-uren', 'Enter');
        await page.waitForSelector('#tijd-registreren:disabled', { timeout: 10_000 });
        const hint = await page.locator('#tijd-conflict').innerText();
        const alarm = await page.locator('[role=alert]', { hasText: 'Elders gewijzigd' }).count();
        if (!hint.includes('herladen')) throw new Error(`geen hint bij de uitgeschakelde knop: "${hint}"`);
        if (!alarm) throw new Error('SyncStatus meldt het conflict niet');
        return { ok: true, bewijs: `na een geweigerde schrijfactie: Registreren uit, "${hint}", SyncStatus-alert zichtbaar` };
      },
    },
    {
      naam: 'bureau — contrast, koppen en toetsenbord op tijd (beide tabs)',
      pad: '/bureau/tijd',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const registratie = await a11yOp(page, 'tijd');
        await page.getByRole('tab', { name: 'Planning' }).click();
        await page.waitForSelector('#plan-dagen', { timeout: 5_000 });
        const planning = await a11yOp(page, 'tijd-planning');
        const problemen = [...registratie.problemen, ...planning.problemen];
        if (problemen.length) throw new Error(problemen.slice(0, 4).join(' · '));
        return { ok: true, bewijs: `registratie ${registratie.gemeten} + planning ${planning.gemeten} tekstelementen boven AA; ${registratie.stops}/${planning.stops} tabstops (+${registratie.segmenten}/${planning.segmenten} datumsegmenten) met zichtbare focus` };
      },
    },
    ...['/bureau/doelen', '/bureau/projecten', '/bureau/projecten/harnas-met', '/bureau/tijd', VERKOOP, CASH, KLANTEN].map((pad) => ({
      naam: `bureau — 390 px zonder horizontale overflow · ${pad.replace('/bureau/', '')}`,
      pad,
      wachtOp: 'bureau',
      gedrag: { bureau: { [DOELEN]: 'doelen', [VERKOOP]: 'verkoop', [CASH]: 'cash', [KLANTEN]: 'klanten', '/bureau/projecten/harnas-met': 'cash' }[pad] ?? 'projecten' },
      viewport: { width: 390, height: 844 },
      actie: async (page) => {
        const r = await horizontaleOverflow(page);
        if (r.scroll > r.breedte) throw new Error(`pagina scrollt ${r.scroll - r.breedte} px horizontaal: ${r.boosdoeners.join(', ')}`);
        return { ok: true, bewijs: `scrollbreedte ${r.scroll} ≤ ${r.breedte}` };
      },
    })),
    {
      naam: 'projecten — zonder urenraming geen rendement, met raming A = € 1.125',
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const rij = (id) => page.locator(`[data-project-row="${id}"]`);
        if ((await rij('harnas-zonder').count()) !== 1 || (await rij('harnas-met').count()) !== 1) throw new Error('de twee fixture-projecten staan niet elk één keer in de tabel');
        const zonder = await rij('harnas-zonder').innerText();
        const onvoldoende = await rij('harnas-zonder').locator('[data-onvoldoende]').count();
        if (onvoldoende !== 2) throw new Error(`project zonder raming toont ${onvoldoende} keer "Onvoldoende gegevens" in plaats van twee (A en B)`);
        if (/\/dag/.test(zonder)) throw new Error(`project zonder raming toont tóch een bedrag per dag: "${zonder.replace(/\s+/g, ' ')}"`);
        const met = (await rij('harnas-met').innerText()).replace(/\s+/g, ' ');
        if (!met.includes('€ 1.125 /dag')) throw new Error(`project met raming toont niet € 1.125 /dag: "${met}"`);
        return { ok: true, bewijs: 'zonder raming: 2× "Onvoldoende gegevens", geen bedrag; met raming: € 1.125 /dag (9.000 ÷ 8 d)' };
      },
    },
    {
      naam: 'projecten — sheet: focus blijft binnen, Escape sluit en geeft hem terug',
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const knop = page.locator('button', { hasText: 'Nieuw project' });
        await knop.click();
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'visible' });
        for (let i = 0; i < 40; i++) {
          await page.keyboard.press('Tab');
          const binnen = await page.evaluate(() => Boolean(document.activeElement?.closest('[role=dialog]')));
          if (!binnen) throw new Error(`na ${i + 1}× Tab staat de focus buiten de sheet`);
        }
        await page.keyboard.press('Escape');
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'detached' });
        const terug = await page.evaluate(() => document.activeElement?.textContent?.trim());
        if (terug !== 'Nieuw project') throw new Error(`na Escape staat de focus op "${terug}", niet op de knop die de sheet opende`);
        return { ok: true, bewijs: '40× Tab binnen [role=dialog], Escape sluit, focus terug op "Nieuw project"' };
      },
    },
    {
      naam: 'projecten — nieuw project: één schrijfactie, nieuwe klant, naar de detailpagina',
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.locator('button', { hasText: 'Nieuw project' }).click();
        await page.fill('#project-klant', 'Nieuwe harnasklant');
        await page.fill('#project-naam', 'Harnasscan');
        await page.selectOption('#project-aanbod', 'productdiagnose');
        await page.fill('#project-prijs', '3.550');
        const hint = await page.locator('#project-klant-hint').innerText();
        if (!hint.includes('wordt aangemaakt')) throw new Error(`geen melding dat de klant nieuw is: "${hint}"`);
        const zonderOpslaan = await nieuweSchrijfacties(page, state, basis);
        if (zonderOpslaan) throw new Error(`invullen schreef ${zonderOpslaan} keer weg`);
        await page.locator('[role=dialog] button[type=submit]').click();
        await page.waitForURL(/\/bureau\/projecten\/[0-9a-f-]{36}$/, { timeout: 10_000 });
        await page.waitForSelector('#project-titel', { timeout: 10_000 });
        const titel = await page.locator('#project-titel').innerText();
        const extra = await nieuweSchrijfacties(page, state, basis);
        if (titel !== 'Harnasscan') throw new Error(`detailpagina toont "${titel}"`);
        if (extra !== 1) throw new Error(`aanmaken gaf ${extra} schrijfacties in plaats van één (klant en project samen)`);
        return { ok: true, bewijs: '0 schrijfacties tijdens invullen, 1 bij aanmaken (klant + project), detailpagina "Harnasscan"' };
      },
    },
    {
      naam: 'projecten — mijlpaal afvinken verplaatst omzet van resterend naar gerealiseerd',
      pad: '/bureau/projecten/harnas-zonder',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page, { state }) => {
        const omzet = () => page.locator('dl').first().locator('div', { hasText: 'Omzet in' }).innerText();
        const voor = (await omzet()).replace(/\s+/g, ' ');
        if (!/€ 0 .*€ 4\.000 getekend resterend/.test(voor)) throw new Error(`vooraf verwacht € 0 gerealiseerd en € 4.000 resterend: "${voor}"`);
        const basis = state.schrijfpogingen.length;
        await page.locator('[data-milestone-row="harnas-m1"] button[role=checkbox]').click();
        const na = (await omzet()).replace(/\s+/g, ' ');
        const extra = await nieuweSchrijfacties(page, state, basis);
        if (!/€ 4\.000 .*€ 0 getekend resterend/.test(na)) throw new Error(`na afvinken verwacht € 4.000 gerealiseerd en € 0 resterend: "${na}"`);
        if (extra !== 1) throw new Error(`afvinken gaf ${extra} schrijfacties`);
        const verwijder = await page.locator('button[aria-label="Verwijder mijlpaal Harnasmijlpaal"]').isDisabled();
        if (!verwijder) throw new Error('een gerealiseerde mijlpaal is nog te verwijderen');
        return { ok: true, bewijs: `"${voor}" → "${na}", 1 schrijfactie, verwijderen uitgeschakeld` };
      },
    },
    {
      naam: 'bureau — contrast, koppen en toetsenbord op projecten',
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const lijst = await a11yOp(page, 'projecten');
        await page.locator('button', { hasText: 'Nieuw project' }).click();
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'visible' });
        const sheet = await sweep(page, 'projectsheet');
        await page.keyboard.press('Escape');
        await page.goto(`${BASE}/bureau/projecten/harnas-met`);
        await page.waitForSelector('#project-titel', { timeout: 20_000 });
        const detail = await a11yOp(page, 'projectdetail');
        const problemen = [...lijst.problemen, ...sheet.fouten.map((f) => `sheet contrast: ${beschrijfFout(f)}`), ...detail.problemen];
        if (problemen.length) throw new Error(problemen.slice(0, 4).join(' · '));
        return { ok: true, bewijs: `lijst ${lijst.gemeten} + sheet ${sheet.gemeten} + detail ${detail.gemeten} tekstelementen boven AA; koppen ${lijst.koppen}/${detail.koppen}; ${lijst.stops}/${detail.stops} tabstops met zichtbare focus (detail: ${detail.segmenten} extra datumsegmenten)` };
      },
    },
    {
      naam: 'verkoop — aantallen en conversies dragen hun noemer, geen percentage onder vijf',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page) => trechterKlopt(page),
    },
    {
      naam: 'verkoop — gewonnen maakt één project, en de knop komt niet terug',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page, { state }) => omzettingEenmaal(page, state),
    },
    {
      naam: 'verkoop — omzetting geweigerd als er al projecten naar de kans verwijzen',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop-dubbel' },
      actie: async (page, { state }) => {
        await openKans(page, 'harnas-gewonnen');
        const basis = state.schrijfpogingen.length;
        await page.fill('#omzetting-naam', 'Harnasdiagnose');
        await page.locator('[role=dialog] button', { hasText: 'Project aanmaken' }).click();
        const melding = await page.locator('[role=dialog] [role=alert]').innerText({ timeout: 5_000 });
        const extra = await nieuweSchrijfacties(page, state, basis);
        if (melding !== 'Deze kans is al een project.') throw new Error(`melding "${melding}"`);
        if (extra !== 0) throw new Error(`geweigerde omzetting schreef ${extra} keer weg`);
        return { ok: true, bewijs: `melding "${melding}", 0 schrijfacties` };
      },
    },
    {
      naam: 'verkoop — verloren vraagt een reden; de overgang komt in de historie',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page, { state }) => verlorenVraagtReden(page, state),
    },
    {
      naam: 'verkoop — opvolgen: verlopen actie en open kans zonder actie, afgesloten niet',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page) => {
        const items = await page.locator('[data-follow-up]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-follow-up'), e.textContent.replace(/\s+/g, ' ')]));
        const ids = items.map(([id]) => id);
        if (JSON.stringify(ids) !== JSON.stringify(['harnas-voorstel', 'harnas-gesprek'])) throw new Error(`opvolgen toont ${JSON.stringify(ids)}`);
        if (!/Harnasopvolging.*over tijd/.test(items[0][1])) throw new Error(`verlopen actie zonder "over tijd": "${items[0][1]}"`);
        if (!items[1][1].includes('geen volgende actie')) throw new Error(`kans zonder actie niet benoemd: "${items[1][1]}"`);
        return { ok: true, bewijs: `2 items in volgorde (verlopen eerst): "${items[0][1].trim()}" · "${items[1][1].trim()}"` };
      },
    },
    {
      naam: 'verkoop — nieuwe kans: halve actie geweigerd, daarna één schrijfactie en focus terug',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.locator('#kans-nieuw').click();
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'visible' });
        await page.fill('#kans-bedrijf', 'Harnasnieuw');
        await page.fill('#kans-actie', 'Harnasbellen');
        await page.locator('[role=dialog] button[type=submit]', { hasText: 'Kans toevoegen' }).click();
        const fout = await page.locator('#kans-actie-datum-fout').count();
        await page.waitForFunction(() => document.activeElement?.id === 'kans-actie-datum', null, { timeout: 2_000 }).catch(() => {});
        const focus = await page.evaluate(() => document.activeElement?.id);
        const zonder = await nieuweSchrijfacties(page, state, basis);
        if (fout !== 1 || zonder !== 0) throw new Error(`actie zonder datum: ${fout} melding(en), ${zonder} schrijfactie(s)`);
        if (focus !== 'kans-actie-datum') throw new Error(`focus na weigering op "${focus}", niet op het datumveld`);
        await page.fill('#kans-actie-datum', new Date().toISOString().slice(0, 10));
        await page.locator('[role=dialog] button[type=submit]', { hasText: 'Kans toevoegen' }).click();
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'detached' });
        const terug = await page.evaluate(() => document.activeElement?.id);
        const met = await nieuweSchrijfacties(page, state, basis);
        const inContact = await page.locator('[data-stage-group="contact"] [data-opportunity-row]', { hasText: 'Harnasnieuw' }).count();
        if (met !== 1) throw new Error(`toevoegen gaf ${met} schrijfacties`);
        if (terug !== 'kans-nieuw') throw new Error(`focus na sluiten op "${terug}"`);
        if (inContact !== 1) throw new Error('de nieuwe kans staat niet onder Contact');
        return { ok: true, bewijs: 'weigering: melding + focus op datum + 0 schrijfacties; daarna 1 schrijfactie, focus terug op "Nieuwe kans", rij onder Contact' };
      },
    },
    {
      naam: 'verkoop — lege staat zonder kansen, geen trechter',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page) => {
        const leeg = await page.locator('[data-empty-state]').count();
        const trechter = await page.locator('section[aria-labelledby="trechter-titel"]').count();
        if (leeg !== 1 || trechter !== 0) throw new Error(`${leeg} lege staten, ${trechter} trechters`);
        return { ok: true, bewijs: '1 lege staat, 0 trechters' };
      },
    },
    {
      naam: 'bureau — contrast, koppen en toetsenbord op verkoop (+ beide sheets)',
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page) => {
        await page.locator('#kansen-gesloten').click();
        const lijst = await a11yOp(page, 'verkoop');
        await openKans(page, 'harnas-gewonnen');
        const detail = await sweep(page, 'kanssheet');
        const koppenDetail = await kopstructuur(page);
        await page.keyboard.press('Escape');
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'detached' });
        await page.locator('#kans-nieuw').click();
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'visible' });
        const nieuw = await sweep(page, 'nieuwe-kans');
        const problemen = [
          ...lijst.problemen,
          ...detail.fouten.map((f) => `kanssheet contrast: ${beschrijfFout(f)}`),
          ...koppenDetail.problemen.map((p) => `kanssheet koppen: ${p}`),
          ...nieuw.fouten.map((f) => `nieuwe kans contrast: ${beschrijfFout(f)}`),
        ];
        if (problemen.length) throw new Error(problemen.slice(0, 4).join(' · '));
        return { ok: true, bewijs: `pagina ${lijst.gemeten} + kanssheet ${detail.gemeten} + nieuwe kans ${nieuw.gemeten} tekstelementen boven AA; koppen ${lijst.koppen}/${koppenDetail.aantal}; ${lijst.stops} tabstops met zichtbare focus` };
      },
    },
    {
      naam: 'cash — vervallen factuur zonder datum staat apart, de gedateerde in haar week',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page) => vervallenStaatApart(page),
    },
    {
      naam: 'cash — lege prognose: lege staat in plaats van dertien nulrijen',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen', leeg: true },
      actie: async (page) => {
        const leeg = await page.locator('[data-empty-state]').count();
        const weken = await page.locator('[data-cash-week]').count();
        if (leeg !== 1 || weken !== 0) throw new Error(`${leeg} lege staten, ${weken} weekrijen`);
        return { ok: true, bewijs: '1 lege staat, 0 weekrijen' };
      },
    },
    {
      naam: 'facturen — betaald haalt de post uit de prognose, uitvinken zet hem terug',
      pad: '/bureau/projecten/harnas-met',
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page, { state }) => betaaldHaaltPostWeg(page, state),
    },
    {
      naam: 'facturen — nieuwe factuur: één schrijfactie, post incl. btw in de maand van de vervaldatum',
      pad: '/bureau/projecten/harnas-met',
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        const f = 'factuur-nieuw-harnas-met';
        await page.fill(`#${f}-label`, 'Harnasvoorschot');
        await page.selectOption(`#${f}-soort`, 'voorschot');
        await page.fill(`#${f}-bedrag`, '2.000');
        const verval = await page.inputValue(`#${f}-verval`);
        const zonder = await nieuweSchrijfacties(page, state, basis);
        if (zonder) throw new Error(`invullen schreef ${zonder} keer weg`);
        await page.locator(`form[data-form="${f}"] button[type=submit]`).click();
        await page.locator('[data-invoice-row]', { hasText: 'Harnasvoorschot' }).waitFor({ timeout: 5_000 });
        const extra = await nieuweSchrijfacties(page, state, basis);
        const doc = state.documenten.at(-1);
        const factuur = doc?.bureau?.projects?.find((p) => p.id === 'harnas-met')?.invoices?.find((i) => i.label === 'Harnasvoorschot');
        const post = (doc?.incomeItems ?? []).find((i) => i.id === factuur?.incomeItemId);
        const mijlpalen = doc?.bureau?.projects?.find((p) => p.id === 'harnas-met')?.milestones?.length;
        if (extra !== 1) throw new Error(`toevoegen gaf ${extra} schrijfacties`);
        if (!post || post.amount !== 2420 || post.monthKey !== verval.slice(0, 7)) throw new Error(`post ${JSON.stringify(post)} bij vervaldatum ${verval}`);
        if (mijlpalen !== 0) throw new Error('een voorschot maakte een mijlpaal — een factuur is geen omzet');
        return { ok: true, bewijs: `0 schrijfacties tijdens invullen, 1 bij toevoegen; post € 2.420 (2.000 + 21 %) in ${post.monthKey}; 0 mijlpalen` };
      },
    },
    {
      naam: 'klanten — twee bases met eigen noemer, limiet als woord, groep telt samen',
      pad: KLANTEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => concentratieKlopt(page),
    },
    {
      naam: 'klanten — lege staat zonder klanten',
      pad: KLANTEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page) => {
        const leeg = await page.locator('[data-empty-state]').count();
        const tabellen = await page.locator('[data-concentration]').count();
        if (leeg !== 1 || tabellen !== 0) throw new Error(`${leeg} lege staten, ${tabellen} concentratietabellen`);
        return { ok: true, bewijs: '1 lege staat, 0 tabellen' };
      },
    },
    {
      naam: 'bureau — contrast, koppen en toetsenbord op cash, klanten en facturen',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page) => {
        await alleCashRegels(page);
        const cash = await a11yOp(page, 'cash');
        await page.goto(`${BASE}/bureau/projecten/harnas-met`);
        await page.waitForSelector('[data-invoice-row]', { timeout: 20_000 });
        const facturen = await a11yOp(page, 'facturen');
        const problemen = [...cash.problemen, ...facturen.problemen];
        if (problemen.length) throw new Error(problemen.slice(0, 4).join(' · '));
        return { ok: true, bewijs: `cash ${cash.gemeten} + projectdetail met facturen ${facturen.gemeten} tekstelementen boven AA; koppen ${cash.koppen}/${facturen.koppen}; ${cash.stops}/${facturen.stops} tabstops met zichtbare focus` };
      },
    },
    {
      naam: 'bureau — contrast, koppen en toetsenbord op klanten',
      pad: KLANTEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => {
        const r = await a11yOp(page, 'klanten');
        if (r.problemen.length) throw new Error(r.problemen.slice(0, 4).join(' · '));
        return { ok: true, bewijs: `${r.gemeten} tekstelementen boven AA; ${r.koppen} koppen; ${r.stops} tabstops met zichtbare focus` };
      },
    },
  ];
}

function bureauTegenproeven() {
  return [
    {
      naam: 'tegenproef — vervallen factuur mét datum staat niet apart',
      moetFalen: true,
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash-gedateerd' },
      actie: async (page) => vervallenStaatApart(page),
    },
    {
      naam: 'tegenproef — de post blijft na betaling in het document',
      moetFalen: true,
      pad: '/bureau/projecten/harnas-met',
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page, { state }) =>
        betaaldHaaltPostWeg(page, state, {
          vervals: (doc) => doc.incomeItems.push({ id: 'harnas-post-later', monthKey: BRON, label: 'blijft staan', amount: 1234.56, received: false }),
        }),
    },
    {
      naam: 'tegenproef — klant op precies de limiet telt als erboven',
      moetFalen: true,
      pad: KLANTEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => {
        await page.locator('[data-concentration="gerealiseerd"] [data-concentration-row="harnas-klant-a"] td').nth(1).evaluate((el) => { el.innerHTML += '<span class="block text-xs">boven limiet</span>'; });
        return concentratieKlopt(page);
      },
    },
    {
      naam: 'tegenproef — dubbele omzetting in het weggeschreven document',
      moetFalen: true,
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page, { state }) =>
        omzettingEenmaal(page, state, {
          vervals: (doc) => {
            const eerste = doc.bureau.projects.find((p) => p.opportunityId === 'harnas-gewonnen');
            doc.bureau.projects.push({ ...eerste, id: 'harnas-tweede-omzetting' });
          },
        }),
    },
    {
      naam: 'tegenproef — percentage bij een noemer onder vijf',
      moetFalen: true,
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page) => {
        await page.locator('[data-conversion="gesprek-voorstel"] dd').evaluate((el) => { el.textContent = '2 van 3 · 67 %'; });
        return trechterKlopt(page);
      },
    },
    {
      naam: 'tegenproef — verloren met een reden die er al stond',
      moetFalen: true,
      pad: VERKOOP,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page, { state }) => verlorenVraagtReden(page, state, { redenVooraf: true }),
    },
    {
      naam: 'tegenproef — startwaarden schrijven meteen weg',
      moetFalen: true,
      pad: DOELEN,
      wachtOp: 'bureau',
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.locator('button', { hasText: 'Startwaarden invullen' }).click();
        const extra = await nieuweSchrijfacties(page, state, basis);
        return extra > 0
          ? { ok: true, bewijs: `${extra} schrijfactie(s) zonder opslaan` }
          : { ok: false, bewijs: 'geen schrijfactie zonder opslaan, zoals het hoort' };
      },
    },
    {
      naam: 'tegenproef — somregel past het totaal aan',
      moetFalen: true,
      pad: DOELEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page) => {
        await page.fill('#doel-dagen-klantwerk', '130');
        const totaal = await page.inputValue('#doel-dagen-totaal');
        return totaal === '202'
          ? { ok: true, bewijs: 'totaal volgde de som' }
          : { ok: false, bewijs: `totaal bleef ${totaal}, zoals het hoort` };
      },
    },
    {
      naam: 'tegenproef — kop overgeslagen',
      moetFalen: true,
      pad: DOELEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page) => {
        await page.evaluate(() => document.querySelector('h1')?.insertAdjacentHTML('afterend', '<h5>Ingeschoven kop</h5>'));
        const r = await kopstructuur(page);
        return r.problemen.length === 0
          ? { ok: true, bewijs: 'geen sprong gezien' }
          : { ok: false, bewijs: r.problemen[0] };
      },
    },
    {
      naam: 'tegenproef — horizontale overflow op 390 px',
      moetFalen: true,
      pad: DOELEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      viewport: { width: 390, height: 844 },
      actie: async (page) => {
        await page.evaluate(() => document.querySelector('[data-bureau-page]')?.insertAdjacentHTML('beforeend', '<div style="width:600px;height:4px"></div>'));
        const r = await horizontaleOverflow(page);
        return r.scroll <= r.breedte
          ? { ok: true, bewijs: 'geen overflow gezien' }
          : { ok: false, bewijs: `scrollbreedte ${r.scroll} > ${r.breedte}` };
      },
    },
    {
      naam: 'tegenproef — registratie zonder wegschrijf-call',
      moetFalen: true,
      pad: '/bureau/tijd',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page, { state }) => {
        const basis = state.schrijfpogingen.length;
        await page.selectOption('#tijd-project', 'harnas-met');
        await page.fill('#tijd-uren', '1');
        await page.press('#tijd-uren', 'Enter');
        const extra = await nieuweSchrijfacties(page, state, basis);
        return extra === 0
          ? { ok: true, bewijs: 'geen schrijfactie na registreren' }
          : { ok: false, bewijs: `${extra} schrijfactie na registreren, zoals het hoort` };
      },
    },
    {
      naam: 'tegenproef — toetsenbordpass stopt op een datumveld',
      moetFalen: true,
      pad: '/bureau/tijd',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        // Het veld Datum staat vroeg in de volgorde; de knoppen erna (Vandaag, Gisteren, Registreren)
        // horen gezien te worden. Zonder segmentherkenning stopt de pass op het datumveld.
        // Zonder segmentherkenning — de vorige versie. Bereikt die Registreren tóch, dan kon het
        // defect op deze pagina niet optreden en bewijst de herstelling niets.
        const r = await toetsenbord(page, 120, { herkenSegmenten: false });
        const gezien = r.volgorde.some((s) => s.naam === 'Registreren');
        return gezien
          ? { ok: true, bewijs: `oude pass liep tóch door tot Registreren (${r.stops} stops)` }
          : { ok: false, bewijs: `oude pass stopte na ${r.stops} stops vóór Registreren, zoals het defect voorspelt` };
      },
    },
    {
      naam: 'tegenproef — rendement uit een halve noemer',
      moetFalen: true,
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const zonder = await page.locator('[data-project-row="harnas-zonder"]').innerText();
        return /\/dag/.test(zonder)
          ? { ok: true, bewijs: 'bedrag per dag zonder raming' }
          : { ok: false, bewijs: 'geen bedrag per dag zonder raming, zoals het hoort' };
      },
    },
    {
      naam: 'tegenproef — sheet laat de focus ontsnappen',
      moetFalen: true,
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        await page.locator('button', { hasText: 'Nieuw project' }).click();
        await page.waitForSelector('[role=dialog]', { timeout: 5_000, state: 'visible' });
        for (let i = 0; i < 40; i++) {
          await page.keyboard.press('Tab');
          if (!(await page.evaluate(() => Boolean(document.activeElement?.closest('[role=dialog]'))))) {
            return { ok: true, bewijs: `focus buiten de sheet na ${i + 1}× Tab` };
          }
        }
        return { ok: false, bewijs: 'focus bleef 40× Tab binnen de sheet, zoals het hoort' };
      },
    },
    {
      naam: 'tegenproef — focus zonder zichtbare ring',
      moetFalen: true,
      pad: DOELEN,
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      actie: async (page) => {
        await page.addStyleTag({ content: '*:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }' });
        const r = await toetsenbord(page);
        return r.problemen.length === 0
          ? { ok: true, bewijs: `${r.stops} tabstops, allemaal zichtbaar` }
          : { ok: false, bewijs: `${r.problemen.length} tabstop(s) zonder zichtbare focus` };
      },
    },
  ];
}

function tegenproeven() {
  return [
    {
      naam: 'tegenproef — sleep doet niets',
      moetFalen: true,
      actie: async (page, { state, schrijfVoor }) => {
        await greep(page, LABEL).focus();
        await page.keyboard.press('Space');
        await page.waitForTimeout(150);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        return verhuisd(page, state, schrijfVoor);
      },
    },
    {
      naam: 'tegenproef — te lichte tekst',
      moetFalen: true,
      actie: async (page) => {
        // Eén element met een kleur die gegarandeerd zakt. Vindt de sweep hem niet, dan
        // meet hij het scherm niet echt.
        await page.evaluate(() => {
          const p = document.createElement('p');
          p.textContent = 'tegenproef: onleesbaar grijs';
          p.style.cssText = 'color:#cfcfcf;background:#ffffff;font-size:13px;padding:4px';
          document.body.appendChild(p);
        });
        const m = await sweep(page, 'prognose + injectie');
        if (m.fouten.length) return { ok: false, bewijs: `${m.fouten.length} fout(en) gevonden, zoals het hoort` };
        return { ok: true, bewijs: 'de geïnjecteerde te lichte tekst glipte door de sweep' };
      },
    },
    {
      // De footer-assertie is pas een meting als ze het oude gedrag afkeurt. Slaagt deze,
      // dan toont kolom 2 nog altijd de potstand (€ 0,00) in plaats van de positie, en
      // zegt "buffer — negatieve stand in de footer" niets.
      naam: 'tegenproef — lege pot geldt als een gezonde stand',
      moetFalen: true,
      gedrag: { buffer: true },
      actie: async (page) => {
        const rijen = await footerPerKolom(page);
        const derde = rijen[2];
        if (!derde?.aanwezig) return { ok: false, bewijs: 'kolom 2 heeft geen leesbare footer' };
        if (Math.abs(derde.stand) >= 0.005 || Math.abs(derde.beweging + 1362.58) >= 0.005) {
          return { ok: false, bewijs: `kolom 2 toont "${derde.rijtekst}" — positie, niet de potstand` };
        }
        return { ok: true, bewijs: 'kolom 2 meldde € 0,00 met de potbeweging ernaast' };
      },
    },
    {
      // Spiegelbeeld van de ankerassertie hierboven: slaagt deze, dan toont de ankerkolom
      // tóch een maandbedrag en zegt "geen maandbedrag in een half verstreken maand" niets.
      naam: 'tegenproef — ankerkolom toont tóch een bedrag',
      moetFalen: true,
      gedrag: { buffer: true },
      actie: async (page) => {
        const rijen = await footerPerKolom(page);
        const eerste = rijen[0];
        if (!eerste?.aanwezig) return { ok: false, bewijs: 'kolom 0 heeft geen leesbare footer' };
        if (eerste.beweging === null) {
          return { ok: false, bewijs: `kolom 0 toont "${eerste.rijtekst}" — geen bedrag, zoals het hoort` };
        }
        return { ok: true, bewijs: `kolom 0 toont een maandbedrag: ${eerste.beweging}` };
      },
    },
    {
      naam: 'tegenproef — modal die niemand opent',
      moetFalen: true,
      actie: async (page) => {
        // Niets aanklikken, wél de modal verwachten. Deze tegenproef verdiende zichzelf
        // meteen terug: met een kale `[role=dialog]`-selector was hij groen, want de
        // sidepanels staan permanent gemonteerd.
        await page.waitForSelector(MODALS.herhaal.dialoog, { timeout: 3_000, state: 'visible' });
        return { ok: true, bewijs: 'de modal stond open zonder dat iemand hem opende' };
      },
    },
    {
      naam: 'tegenproef — willekeurige toets sluit niets',
      moetFalen: true,
      actie: async (page) => {
        // Sluiten met 'a' in plaats van Escape. Slaagt dit, dan sluit de modal om een
        // andere reden dan de toets en zegt de Escape-assertie niets.
        await metModaalOpen(page, MODALS.herhaal, null, { sluitToets: 'a' });
        return { ok: true, bewijs: 'de modal ging dicht van een willekeurige toets' };
      },
    },
    {
      naam: 'tegenproef — open paneel telt als verborgen',
      moetFalen: true,
      actie: async (page) => {
        // Het geopende paneel mág niet inert zijn. Meldt de assertie hier tóch "verborgen",
        // dan meet ze de open-staat niet.
        await page.locator('header button', { hasText: 'Spaarpotten' }).first().click();
        await page.waitForSelector('[aria-label="Spaarpotten beheren"][role=dialog]', { timeout: 10_000, state: 'visible' });
        const open = await panelStaat(page, '[aria-label="Spaarpotten beheren"]');
        if (!open.inert && open.ariaHidden !== 'true') {
          return { ok: false, bewijs: 'open paneel is bereikbaar, zoals het hoort' };
        }
        return { ok: true, bewijs: 'een open paneel gold als verborgen' };
      },
    },
    {
      naam: 'tegenproef — foutscherm zonder fout',
      moetFalen: true,
      actie: async (page) => {
        // Het document komt gewoon door; het foutscherm hoort er dus níet te staan.
        await page.waitForSelector('text=Gegevens niet geladen', { timeout: 3_000, state: 'visible' });
        return { ok: true, bewijs: 'foutscherm verscheen terwijl de fetch slaagde' };
      },
    },
    {
      // Toetst dat `inSectie` echt de plaats meet en niet alleen de aanwezigheid: dit is
      // de oude indeling, met de saldoregel bóven de inkomstenkop.
      naam: 'tegenproef — saldoregel boven de sectie',
      moetFalen: true,
      actie: async (page) => {
        const rijen = await saldoPerKolom(page);
        const boven = rijen.filter((r) => r.aanwezig && !r.inSectie);
        if (!boven.length) throw new Error('elke saldoregel staat binnen de inkomstensectie');
        return { ok: true, bewijs: 'saldoregel stond nog boven de sectie' };
      },
    },
    {
      // Toetst dat de wegschrijf-teller in het saldo-scenario écht kan afgaan: een échte
      // correctie hóórt wél weg te schrijven. Meldt hij ook hier nul, dan meet hij niets.
      naam: 'tegenproef — correctie schrijft niets weg',
      moetFalen: true,
      actie: async (page, { state, schrijfVoor }) => {
        const rij = page.locator(KOLOM).nth(0).locator('div').filter({ hasText: SALDO }).last();
        await rij.locator('button').click();
        const veld = page.locator('[aria-label="Beginsaldo aanpassen"]');
        await veld.waitFor({ timeout: 5_000, state: 'visible' });
        await veld.fill('4242');
        await page.locator('h1').click();
        await page.waitForTimeout(1_200);
        const extra = state.schrijfpogingen.length - schrijfVoor;
        if (extra > 0) throw new Error(`de correctie schreef ${extra} keer weg, zoals het hoort`);
        return { ok: true, bewijs: 'een echte correctie schreef niets weg' };
      },
    },
    {
      // Toetst de andere kant: de verdwijn-regel moet ook echt kunnen afgaan. Op de lege
      // fixture staat elke maand op nul, dus een saldoregel in kolom 1 hoort er niet te zijn.
      naam: 'tegenproef — nulregel in een latere maand',
      moetFalen: true,
      gedrag: { leeg: true },
      actie: async (page) => {
        const rijen = await saldoPerKolom(page);
        if (!rijen[1]?.aanwezig) throw new Error('kolom 1 toont terecht geen nulregel');
        return { ok: true, bewijs: `kolom 1 toonde "${rijen[1].rijtekst}"` };
      },
    },
  ];
}

async function main() {
  const state = {
    origin: supabaseUrl(),
    revision: 1,
    lekken: [],
    schrijfpogingen: [],
    /** De `data` van elke schrijfpoging op het document — wat de app echt zou opslaan. */
    documenten: [],
    paginafouten: [],
  };

  // Vóór de build, niet erna: een bezette poort maakt deze run hoe dan ook onmogelijk, en dat
  // is in 1,5 s te weten in plaats van na een volledige build van ~16 s.
  await weigerBezettePoort();

  if (BOUWEN) await bouw();
  controleerBuildAanwezig();

  // Vóór de server, vóór de browser: klopt de origin die we afsluiten met de origin in de
  // build? Zo niet, dan is elke uitspraak over lekken daarna waardeloos.
  controleerBuildOrigin(state.origin);

  console.log(`Flow-harness — ${BRON} → ${DOEL}, origin afgesloten: ${state.origin} (ook in de build)`);

  const id = buildId();
  const teDraaien = [
    ...scenarios(),
    ...bureauScenarios(),
    ...(SELFTEST ? [...tegenproeven(), ...bureauTegenproeven()] : []),
  ];
  const resultaten = [];

  // Alles ná de spawn staat in de try: de server is detached en overleeft een exit(1),
  // dus een throw hier (manifest-check, browser die niet start) zou hem als wees op :3100
  // achterlaten en de volgende run laten weigeren. Ctrl+C bereikt hem om dezelfde reden
  // niet (eigen procesgroep) en Node's default-handler slaat de finally over — dus een
  // eigen signaalhandler, en Playwright's handlers uit zodat er maar één is.
  //
  // De registratie staat vóór `startServer()`, niet erna. Die functie spawnt detached en pollt
  // daarna tot 60 s op readiness; een Ctrl+C in dát venster vond hier geen handler en liet de
  // server als wees op :3100 achter — precies het geval dat PR #314 als gesloten rapporteerde.
  // `stopServer()` zonder argument leest `actieveServer`, die al vanaf de spawn gevuld is.
  let browser;
  const bijSignaal = (signaal) => {
    onderbroken = signaal;
    stopServer();
    const dicht = browser ? browser.close().catch(() => {}) : Promise.resolve();
    dicht.then(() => process.exit(signaal === 'SIGTERM' ? 143 : 130));
  };
  process.once('SIGINT', bijSignaal);
  process.once('SIGTERM', bijSignaal);

  const server = await startServer();
  try {
    await controleerGeserveerdeBuild(id);
    console.log(`Flow-harness — serveert ${DIST} (BUILD_ID ${id}) op ${BASE}`);
    browser = await chromium.launch({ headless: !HEADED, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
    for (const scenario of teDraaien) {
      const r = await draaiScenario(browser, state, scenario);
      resultaten.push({ ...r, moetFalen: scenario.moetFalen === true });
    }
  } finally {
    process.off('SIGINT', bijSignaal);
    process.off('SIGTERM', bijSignaal);
    // Server eerst — die teardown mag niet achter een browser.close() hangen die kan gooien.
    stopServer(server);
    if (browser) await browser.close().catch(() => {});
  }

  console.log('');
  const breedte = Math.max(...resultaten.map((r) => r.naam.length));
  for (const r of resultaten) {
    const geslaagd = r.moetFalen ? !r.ok : r.ok;
    console.log(`  ${geslaagd ? '✓' : '✗'} ${r.naam.padEnd(breedte)}  ${r.bewijs}`);
    if (!geslaagd && r.details) for (const d of r.details) console.error(d);
  }

  console.log('');
  console.log(`  schrijfpogingen onderschept: ${state.schrijfpogingen.length}`);
  console.log(`  verzoeken naar buiten afgebroken: ${state.lekken.length}${state.lekken.length ? ` — ${state.lekken.join(', ')}` : ''}`);
  if (state.paginafouten.length) {
    console.log(`  paginafouten: ${state.paginafouten.length} — ${state.paginafouten.slice(0, 3).join(' | ')}`);
  }

  const echteFouten = resultaten.filter((r) => (r.moetFalen ? r.ok : !r.ok));
  const gezakt = echteFouten.length > 0 || state.lekken.length > 0;
  console.log('');
  console.log(gezakt ? `${echteFouten.length} scenario('s) gefaald` : `alle ${resultaten.length} scenario's geslaagd`);
  process.exit(gezakt ? 1 : 0);
}

main().catch((err) => {
  // De server-stop laat een lopend scenario gooien; dan is dit de weg naar buiten, niet de handler.
  if (onderbroken) process.exit(onderbroken === 'SIGTERM' ? 143 : 130);
  console.error(err.message ?? err);
  process.exit(1);
});
