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
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beoordeel, beschrijfFout, meetInPagina, STIL_CSS } from './contrast.mjs';
import { kiesDist } from './harness-dist.mjs';
import { horizontaleOverflow, kopstructuur, toetsenbord } from './a11y-passes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const require_ = createRequire(import.meta.url);

const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
/** `--screenshots=<map>`: geen scenario's, maar schermafbeeldingen van elke bureau-route in drie standen. */
const SCREENSHOTS = args.find((a) => a.startsWith('--screenshots='))?.slice('--screenshots='.length) ?? null;
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
  if (variant === 'vol') return volFixture(doelen, project);
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
    // Een met de hand ingevoerde verwachte inkomst, aan geen factuur gekoppeld.
    { id: 'harnas-post-los', monthKey: DOEL, label: 'Harnas losse post', amount: 555.55, received: false },
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

/** Alles tegelijk, voor de review-screenshots: klanten, projecten met facturen, kansen, tijd en planning. */
function volFixture(doelen, project) {
  const klanten = klantenFixture(doelen, project);
  const vandaag = dagVanaf(0);
  const projecten = [
    project('harnas-zonder', { name: 'Harnasproject zonder raming', fixedPriceExVat: 12000,
      milestones: [{ id: 'harnas-m1', label: 'Harnasmijlpaal', plannedMonth: BRON, amount: 4000, realizedOn: null, realizedAmount: null, extensionId: null }] }),
    project('harnas-met', { name: 'Harnasproject met raming', fixedPriceExVat: 9000, budgetedOwnHours: 64, expectedRemainingOwnHours: 16, invoices: cashFacturen('cash'),
      externalCosts: [{ id: 'harnas-kost', label: 'Freelancer research', expected: 1200, actual: null }] }),
    ...klanten.projects,
  ];
  const t = (id, date, category, projectId, hours, label = null) => ({ id, date, category, projectId, hours, hoursPerDayAtEntry: 8, label, note: '' });
  return {
    ...klanten,
    clients: [{ id: 'harnas-klant', name: 'Harnasklant', groupId: null }, ...klanten.clients],
    projects: projecten,
    opportunities: verkoopKansen(),
    timeEntries: [
      t('harnas-t1', `${BRON}-01`, 'klantwerk', 'harnas-met', 24), t('harnas-t2', `${BRON}-01`, 'klantwerk', 'harnas-met', 24),
      t('harnas-t3', vandaag, 'verkoop', null, 3), t('harnas-t4', vandaag, 'administratie', null, 1.5), t('harnas-t5', vandaag, 'klantwerk', 'harnas-zonder', 4, 'revisie'),
    ],
    plannedWork: [
      { id: 'harnas-plan-1', periodKind: 'week', periodKey: `${getISOWeekYear(new Date())}-W${String(getISOWeek(new Date())).padStart(2, '0')}`, category: 'klantwerk', projectId: 'harnas-zonder', days: 3 },
      { id: 'harnas-plan-2', periodKind: 'month', periodKey: dagVanaf(35).slice(0, 7), category: 'verkoop', projectId: null, days: 4 },
    ],
  };
}

function fixtureData({ leeg = false, buffer = false, bureau = null, tekort = false, labels = false } = {}) {
  const b = bureauFixture(bureau);
  const doc = prognoseFixture({ leeg, buffer, labels });
  // `tekort`: een negatief banksaldo, zodat de prognose al in de ankermaand onder nul eindigt.
  if (tekort) doc.referenceBalance = -250;
  if (bureau?.startsWith('cash') || bureau === 'vol') {
    doc.incomeItems = [...doc.incomeItems, ...cashPosten()];
    // Een kost in de tweede maand, zodat het laagste maandeinde niet het eerste is: anders kan geen
    // meting het verschil zien tussen "laagste" en "eerste".
    doc.expenseItems = [...doc.expenseItems, { id: 'harnas-oktoberkost', monthKey: DOEL, label: 'Harnas oktoberkost', amount: 3000, paid: false }];
  }
  return b ? { ...doc, bureau: b } : doc;
}

function prognoseFixture({ leeg = false, buffer = false, labels = false } = {}) {
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
    // `labels`: wat alleen met afgewerkte of gesplitste posten rendert en tot 2026-09-17 met
    // opacity werd uitgedoofd — "Budget:" in de ankermaand, "Betaald · Provisie · Cash" onder de
    // pot, de afgeleide uitgave "– resterend" in de maand erna, en achter de filter "Alle" een
    // betaalde uitgave, een betaalde vaste kost en een gefinaliseerde pot. Zonder deze fixture
    // kon de sweep ze nooit meten, hoe goed het instrument ook was.
    expenseItems: leeg
      ? []
      : [
          { id: 'harness-1', monthKey: BRON, label: LABEL, amount: AMOUNT, paid: false },
          ...(labels ? [{ id: 'harness-betaald', monthKey: BRON, label: 'Harnas betaald', amount: 42, paid: true }] : []),
        ],
    incomeItems: [],
    recurringItems: labels ? [{ id: 'harness-vast', label: 'Harnas vast', amount: 80, type: 'expense', frequency: 'monthly', startMonth: BRON }] : [],
    recurringSettlements: labels ? [{ id: 'harness-vast-betaald', recurringId: 'harness-vast', monthKey: BRON, paid: true, actualAmount: 80 }] : [],
    reservationSettlements: labels ? [{ id: 'harness-afgerond-final', reservationId: 'harness-afgerond', monthKey: BRON, effectiveAmount: 30, finalized: true }] : [],
    reservations: leeg
      ? []
      : [
          { id: 'harness-pot', label: POT, monthlyAmount: 60, startMonth: BRON, type: 'spaardoel' },
          ...(labels
            ? [
                { id: 'harness-budget', label: 'Harnasbudget', monthlyAmount: 200, startMonth: BRON, type: 'maandelijks_budget' },
                { id: 'harness-afgerond', label: 'Harnas afgerond', monthlyAmount: 30, startMonth: BRON, type: 'spaardoel' },
              ]
            : []),
        ],
    reservationPayments: labels
      ? [{ id: 'harness-betaling', reservationId: 'harness-pot', monthKey: DOEL, label: 'Harnasbetaling', invoiceAmount: 150, fromReservation: 100, fromCash: 50 }]
      : [],
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
  const { leeg = false, buffer = false, bureau = null, tekort = false, labels = false, conflict = false, vertragingMs = 0, documentStatus = 200 } = gedrag;

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
        return json({ data: fixtureData({ leeg, buffer, bureau, tekort, labels }), revision: state.revision }, 200);
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
      // Binnen de sectie = ná de inkomstenkop en vóór de kop van de volgende sectie. De kop heet sinds
      // 2026-09-17 "Saldo + inkomsten" zodra er een saldoregel staat; een `indexOf` op het oude woord
      // gaf dan −1 en maakte deze vergelijking per constructie waar. Daarom: eerst de kop vinden.
      inSectie: (() => {
        const kop = tekst.search(/Saldo \+ inkomsten|Inkomsten/);
        if (kop < 0) throw new Error(`kolom ${i}: geen inkomstenkop gevonden`);
        return kop < treffer.index && treffer.index < tekst.indexOf('Vaste uitgaves');
      })(),
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
      // De kleine grijze regels onder potten en betalingen. Eerst tellen dat ze er staan: een
      // sweep over een scherm zonder die regels is groen omdat er niets te meten valt.
      naam: 'contrast — potlabels, betalingen en afgeleide uitgaven',
      gedrag: { labels: true },
      actie: async (page) => {
        // "Alle" in elke sectie van de ankerkolom: betaalde en gefinaliseerde posten staan achter de filter.
        const filters = page.locator('button[aria-label^="Filter: openstaand"]');
        const aantalFilters = await filters.count();
        if (aantalFilters === 0) throw new Error('geen filterknop "Open" gevonden — de afgewerkte posten blijven verborgen');
        for (let i = 0; i < aantalFilters; i++) await page.locator('button[aria-label^="Filter: openstaand"]').first().click();
        const gezocht = ['Budget:', 'Betaald:', 'Provisie:', 'Cash:', '– resterend', 'Harnas betaald', 'Harnas vast', 'Harnas afgerond'];
        const tekst = await page.locator('body').innerText();
        const ontbreekt = gezocht.filter((t) => !tekst.includes(t));
        if (ontbreekt.length) throw new Error(`de fixture rendert ${ontbreekt.join(', ')} niet — dan meet de sweep ze ook niet`);
        const m = await sweep(page, 'prognose met labels');
        if (m.fouten.length) {
          return { ok: false, bewijs: `${m.fouten.length} kleurcombinatie(s) onder AA (${m.gemeten} tekstelementen gemeten)`, details: m.fouten.map((f) => beschrijfFout(f)) };
        }
        return { ok: true, bewijs: `${gezocht.length} labelsoorten in beeld, ${m.gemeten} tekstelementen boven AA` };
      },
    },
    {
      // De standaardfixture heeft geen bufferpot: dan is Buffer gelijk aan Vrij en zou "+ bufferpot € 0"
      // ruis zijn. Zelfde keuze als de footer op dit scherm.
      naam: 'antwoord — zonder bufferpot geen brugregel',
      actie: async (page) => {
        const kaart = page.locator('[data-cash-answer]');
        if ((await kaart.getAttribute('data-cash-answer')) !== 'ok') return { ok: false, bewijs: 'geen antwoord op de kaart' };
        if (await page.locator('[data-answer-bridge]').count()) return { ok: false, bewijs: 'brugregel zonder bufferpot' };
        if (!(await page.locator('[data-month-footer]').first().innerText()).includes('Geen buffer')) {
          throw new Error('de fixture heeft wél een bufferpot — dit scenario meet dan niets');
        }
        const waarde = Number(await page.locator('[data-answer-value]').getAttribute('data-answer-value'));
        return { ok: true, bewijs: `kaart toont ${waarde} zonder brugregel, footer meldt "Geen buffer"` };
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
        const kaart = await page.locator('[data-cash-answer]').getAttribute('data-cash-answer');
        if (kaart !== 'leeg') return { ok: false, bewijs: `de antwoordkaart staat op "${kaart}" bij een leeg document` };
        if (await page.locator('[data-answer-value]').count()) return { ok: false, bewijs: 'de antwoordkaart toont een bedrag bij een leeg document' };
        return { ok: true, bewijs: `drie lege staten getoond in plaats van een blanco kolom; antwoordkaart "leeg" zonder bedrag` };
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
  await rij.locator('[data-ledger="niet-in-prognose"]').waitFor({ timeout: 5_000 });
  // De schrijfactie volgt na de debounce van sync.ts; zonder wachten leest dit het vorige document.
  const terugSchrijf = await nieuweSchrijfacties(page, state, basisTerug);
  const open = state.documenten.at(-1);
  const factuurOpen = open?.bureau?.projects?.find((p) => p.id === 'harnas-met')?.invoices?.find((i) => i.id === 'harnas-factuur-later');
  if (terugSchrijf !== 1) throw new Error(`uitvinken gaf ${terugSchrijf} schrijfacties`);
  if (factuurOpen?.paidOn !== null || factuurOpen?.incomeItemId !== null) throw new Error(`uitvinken: factuur ${JSON.stringify({ paidOn: factuurOpen?.paidOn, incomeItemId: factuurOpen?.incomeItemId })}`);
  if ((open?.incomeItems ?? []).some((i) => i.amount === 1234.56)) throw new Error('uitvinken zette tóch een post terug — naast een eventuele handmatige post is dat dubbel');
  const basisPrognose = state.schrijfpogingen.length;
  await rij.locator('button', { hasText: 'Zet in prognose' }).click();
  await rij.locator('[data-ledger="in-prognose"]').waitFor({ timeout: 5_000 });
  const prognoseSchrijf = await nieuweSchrijfacties(page, state, basisPrognose);
  const terug = state.documenten.at(-1);
  const nieuweId = terug?.bureau?.projects?.find((p) => p.id === 'harnas-met')?.invoices?.find((i) => i.id === 'harnas-factuur-later')?.incomeItemId;
  const nieuwePost = (terug?.incomeItems ?? []).find((i) => i.id === nieuweId);
  if (prognoseSchrijf !== 1 || !nieuwePost || nieuwePost.amount !== 1234.56) throw new Error(`"Zet in prognose": ${prognoseSchrijf} schrijfacties, post ${JSON.stringify(nieuwePost)}`);
  return { ok: true, bewijs: `1 schrijfactie; post weg, factuur betaald; uitvinken: open zonder post (1 schrijfactie); "Zet in prognose": post € 1.234,56 in ${nieuwePost.monthKey}` };
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

const OVERZICHT = '/bureau';
const TEGELS = ['omzet', 'getekend', 'kansen', 'capaciteit', 'rendement', 'cash'];

/** Het klantconcentratiesignaal staat vóór de tegels, met "Let op" als woord en een link naar klanten. */
async function signaalMetWoord(page) {
  const signaal = page.locator('[data-signal="klantconcentratie:harnas-klant-c"]');
  if ((await signaal.count()) !== 1) throw new Error('geen concentratiesignaal voor klant C');
  const woord = (await signaal.locator('[class*="rounded-full"]').innerText()).trim();
  const href = await signaal.locator('a').getAttribute('href');
  const eerst = await page.evaluate(() => {
    const lijst = document.querySelector('[data-signal-list]');
    const tegel = document.querySelector('[data-kpi]');
    return Boolean(lijst && tegel && lijst.compareDocumentPosition(tegel) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  if (woord !== 'Let op') throw new Error(`niveau als woord "${woord}"`);
  if (href !== '/bureau/klanten') throw new Error(`link ${href}`);
  if (!eerst) throw new Error('de signalen staan niet vóór de tegels');
  return { ok: true, bewijs: `"Let op" · ${(await signaal.innerText()).replace(/\s+/g, ' ').slice(0, 90)} · link ${href} · vóór de tegels` };
}

/** Zes tegels, elk "Onvoldoende gegevens", en nergens een bedrag van nul. */
async function leegNooitNul(page) {
  const tegels = await page.locator('[data-kpi]').evaluateAll((els) => els.map((e) => ({ kpi: e.getAttribute('data-kpi'), onvoldoende: e.querySelectorAll('[data-onvoldoende]').length, tekst: e.textContent.replace(/\s+/g, ' ') })));
  if (JSON.stringify(tegels.map((t) => t.kpi)) !== JSON.stringify(TEGELS)) throw new Error(`tegels ${JSON.stringify(tegels.map((t) => t.kpi))}`);
  const zonder = tegels.filter((t) => t.onvoldoende !== 1).map((t) => t.kpi);
  if (zonder.length) throw new Error(`zonder "Onvoldoende gegevens": ${zonder.join(', ')}`);
  const nul = tegels.filter((t) => /€\s?0(?![\d.,])/.test(t.tekst));
  if (nul.length) throw new Error(`€ 0 in ${nul.map((t) => `${t.kpi}: "${t.tekst.match(/.{0,30}€\s?0(?![\d.,]).{0,10}/)?.[0]}"`).join(' · ')}`);
  return { ok: true, bewijs: `6 tegels in briefvolgorde, elk 1× "Onvoldoende gegevens", 0× € 0` };
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
    ...[OVERZICHT, '/bureau/doelen', '/bureau/projecten', '/bureau/projecten/harnas-met', '/bureau/tijd', VERKOOP, CASH, KLANTEN].map((pad) => ({
      naam: `bureau — 390 px zonder horizontale overflow · ${pad === OVERZICHT ? 'overzicht' : pad.replace('/bureau/', '')}`,
      pad,
      wachtOp: 'bureau',
      gedrag: { bureau: { [OVERZICHT]: 'verkoop', [DOELEN]: 'doelen', [VERKOOP]: 'verkoop', [CASH]: 'cash', [KLANTEN]: 'klanten', '/bureau/projecten/harnas-met': 'cash' }[pad] ?? 'projecten' },
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
        if (!met.includes('€ 1.125/dag')) throw new Error(`project met raming toont niet € 1.125/dag: "${met}"`);
        return { ok: true, bewijs: 'zonder raming: 2× "Onvoldoende gegevens", geen bedrag; met raming: € 1.125/dag (9.000 ÷ 8 d)' };
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
      naam: 'facturen — betaald haalt de post uit de prognose; uitvinken zet haar open zonder post, "Zet in prognose" zet hem terug',
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
    {
      naam: 'bureau — leeg (document zonder bureau-sleutel): onvoldoende gegevens, nooit nul',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { leeg: true },
      actie: async (page, { state, foutenVoor }) => {
        const leeg = await page.locator('[data-empty-state]').count();
        if (leeg !== 1) throw new Error(`${leeg} lege staten`);
        const r = await leegNooitNul(page);
        const fouten = state.paginafouten.length - foutenVoor;
        if (fouten) throw new Error(`${fouten} paginafout(en): ${state.paginafouten.slice(-fouten).join(' | ')}`);
        return { ...r, bewijs: `${r.bewijs}; 1 lege staat met actie; 0 paginafouten` };
      },
    },
    {
      naam: 'bureau — vol: noemer, bron en precies één link per tegel',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { bureau: 'verkoop' },
      actie: async (page) => {
        const tegels = await page.locator('[data-kpi]').evaluateAll((els) => els.map((e) => ({
          kpi: e.getAttribute('data-kpi'),
          noemer: e.querySelector('[data-kpi-noemer]')?.textContent?.trim() ?? '',
          bron: e.querySelector('[data-kpi-bron]')?.textContent?.trim() ?? '',
          links: [...e.querySelectorAll('a')].map((a) => a.getAttribute('href')),
        })));
        const fouten = tegels.filter((t) => !t.noemer || !t.bron || t.links.length !== 1 || !t.links[0].startsWith('/')).map((t) => `${t.kpi} (noemer "${t.noemer}", bron "${t.bron}", links ${JSON.stringify(t.links)})`);
        if (tegels.length !== 6) throw new Error(`${tegels.length} tegels`);
        if (fouten.length) throw new Error(fouten.join(' · '));
        return { ok: true, bewijs: tegels.map((t) => `${t.kpi} → ${t.links[0]}`).join(' · ') };
      },
    },
    {
      naam: 'bureau — omzettegel is de som van de gerealiseerde omzet op de projectenpagina',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => {
        const tegel = (await page.locator('[data-kpi="omzet"] p.text-3xl').innerText()).replace(/\s+/g, ' ');
        await page.locator('nav[aria-label="Bureau"] a', { hasText: 'Projecten' }).click();
        await page.waitForSelector('[data-project-row]', { timeout: 10_000 });
        const som = (await page.locator('[data-realized]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-realized'))))).reduce((a, b) => a + b, 0);
        if (tegel !== '€ 100.000' || som !== 100000) throw new Error(`tegel "${tegel}", som op de bestemming ${som}`);
        return { ok: true, bewijs: `tegel "${tegel}" = Σ gerealiseerd over de projectrijen (${som})` };
      },
    },
    {
      naam: 'bureau — jaarkeuze filtert de tegels en blijft staan na navigatie',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => {
        const omzet = () => page.locator('[data-kpi="omzet"]').innerText().then((t) => t.replace(/\s+/g, ' '));
        const voor = await omzet();
        await page.locator('button[aria-label="Een jaar vooruit"]').click();
        await page.waitForFunction((j) => document.querySelector('#overzicht-titel')?.textContent?.includes(String(j)), JAAR + 1, { timeout: 5_000 });
        const na = await omzet();
        if (!voor.includes('€ 100.000') || !na.includes('Onvoldoende gegevens')) throw new Error(`vóór "${voor.slice(0, 60)}", na "${na.slice(0, 60)}"`);
        await page.locator('nav[aria-label="Bureau"] a', { hasText: 'Projecten' }).click();
        await page.waitForSelector('#projecten-titel', { timeout: 10_000 });
        await page.locator('nav[aria-label="Bureau"] a', { hasText: 'Overzicht' }).click();
        await page.waitForSelector('#overzicht-titel', { timeout: 10_000 });
        const titel = await page.locator('#overzicht-titel').innerText();
        if (!titel.includes(String(JAAR + 1))) throw new Error(`na navigatie terug op "${titel}"`);
        return { ok: true, bewijs: `${JAAR}: "€ 100.000"; ${JAAR + 1}: "Onvoldoende gegevens"; na Projecten → Overzicht nog "${titel}"` };
      },
    },
    {
      naam: 'bureau — signalen eerst, met niveau als woord en een link',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => signaalMetWoord(page),
    },
    {
      naam: 'state — laden op het overzicht',
      pad: OVERZICHT,
      gedrag: { vertragingMs: 2_500 },
      wachtOp: 'niets',
      actie: async (page) => {
        await page.waitForSelector('[aria-busy="true"]', { timeout: 10_000, state: 'visible' });
        await page.waitForSelector('[data-kpi]', { timeout: 20_000, state: 'visible' });
        return { ok: true, bewijs: 'skeleton met aria-busy, daarna de tegels' };
      },
    },
    {
      naam: 'state — fout op het overzicht',
      pad: OVERZICHT,
      gedrag: { documentStatus: 500 },
      wachtOp: 'niets',
      actie: async (page) => {
        await page.waitForSelector('text=Gegevens niet geladen', { timeout: 20_000, state: 'visible' });
        const herkansing = await page.locator('button', { hasText: 'Opnieuw proberen' }).count();
        const tegels = await page.locator('[data-kpi]').count();
        if (!herkansing || tegels) throw new Error(`herkansing ${herkansing}, tegels ${tegels}`);
        return { ok: true, bewijs: 'foutscherm met "Opnieuw proberen", 0 tegels' };
      },
    },
    {
      naam: 'bureau — contrast, koppen en toetsenbord op het overzicht',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => {
        const r = await a11yOp(page, 'overzicht');
        if (r.problemen.length) throw new Error(r.problemen.slice(0, 4).join(' · '));
        return { ok: true, bewijs: `${r.gemeten} tekstelementen boven AA; ${r.koppen} koppen; ${r.stops} tabstops met zichtbare focus` };
      },
    },
  ];
}

/**
 * Schermafbeeldingen voor een visuele review: elke bureau-route vol op 1440 en 390, leeg op 1440,
 * en een gedeeltelijke stand. Geen oordeel — dat doet wie kijkt; de run faalt alleen als een
 * pagina niet laadt of een paginafout gooit.
 */
function screenshotScenarios(map) {
  mkdirSync(map, { recursive: true });
  const routes = ['/bureau', '/bureau/projecten', '/bureau/projecten/harnas-met', '/bureau/verkoop', '/bureau/tijd', '/bureau/klanten', '/bureau/cash', '/bureau/doelen'];
  const standen = { vol: { bureau: 'vol' }, leeg: { leeg: true }, deels: { bureau: 'projecten' } };
  const shots = [
    ...routes.flatMap((pad) => [['vol', pad, 1440], ['vol', pad, 390]]),
    ...routes.filter((p) => p !== '/bureau/projecten/harnas-met').map((pad) => ['leeg', pad, 1440]),
    ['leeg', '/bureau', 390],
    ['deels', '/bureau', 1440],
    ['deels', '/bureau/projecten/harnas-zonder', 1440],
    ['deels', '/bureau/tijd', 1440],
  ];
  return shots.map(([stand, pad, breedte]) => {
    const slug = pad === '/bureau' ? 'overzicht' : pad.replace('/bureau/', '').replace(/\//g, '-');
    const bestand = join(map, `${stand}-${breedte}-${slug}.png`);
    return {
      naam: `screenshot — ${stand} ${breedte} ${slug}`,
      pad,
      wachtOp: 'bureau',
      gedrag: standen[stand],
      viewport: { width: breedte, height: breedte === 390 ? 844 : 900 },
      actie: async (page, { state, foutenVoor }) => {
        await page.screenshot({ path: bestand, fullPage: true });
        const fouten = state.paginafouten.length - foutenVoor;
        if (fouten) throw new Error(`${fouten} paginafout(en)`);
        const hoogte = await page.evaluate(() => document.documentElement.scrollHeight);
        return { ok: true, bewijs: `${bestand.split('/').pop()} (${breedte}×${hoogte})` };
      },
    };
  });
}

/**
 * Elk maandeinde op de cashpagina is de Buffer van die maand; deze fixture heeft geen bufferpot, dus
 * valt die samen met het vrije saldo waarmee de volgende maand op `/` opent — "Vorig saldo" in kolom 1
 * en 2. Het kopgetal is het laagste (en in deze fixture niet het eerste), en de overzichtstegel noemt
 * datzelfde laagste punt. Dat Buffer en Vrij uit elkaar lopen zodra er een pot is, toetst
 * `geldtaalOpCash`. Geen eis dat de weektabel lager staat: met een opbouw en een factuur in dezelfde
 * week kan hij hoger staan.
 */
async function kopgetalIsMaandeinde(page) {
  await page.waitForSelector('[data-month-end]', { timeout: 10_000 });
  const eindes = await page.locator('[data-month-end]').evaluateAll((els) => els.map((e) => ({ maand: e.getAttribute('data-month-end'), waarde: Number(e.getAttribute('data-value')) })));
  const kop = await page.locator('[data-lowest-month-end]').evaluate((el) => ({ maand: el.getAttribute('data-lowest-month'), waarde: Number(el.getAttribute('data-lowest-month-end')), eind: el.nextElementSibling?.textContent?.replace(/\s+/g, ' ').replace(/ · tekort$/, '').trim() ?? '' }));
  const weekRegel = await page.locator('[data-lowest-week]').count();
  const laagste = eindes.reduce((min, e) => (min === null || e.waarde < min.waarde ? e : min), null);
  if (!laagste || laagste.maand === eindes[0].maand) throw new Error(`de fixture onderscheidt het laagste maandeinde niet van het eerste: ${JSON.stringify(eindes)}`);
  if (kop.maand !== laagste.maand || kop.waarde !== laagste.waarde) throw new Error(`kopgetal ${JSON.stringify(kop)} is niet het laagste maandeinde ${JSON.stringify(laagste)}`);

  await page.goto(`${BASE}/`);
  await page.waitForSelector(KOLOM, { timeout: 20_000 });
  const saldi = await saldoPerKolom(page);
  const perMaand = Object.fromEntries([[BRON, saldi[1]], [DOEL, saldi[2]]].filter(([, r]) => r?.aanwezig && r.label === 'Vorig saldo').map(([m, r]) => [m, r.bedrag]));
  const vergeleken = eindes.filter((e) => perMaand[e.maand] !== undefined);
  const fout = vergeleken.filter((e) => Math.abs(e.waarde - perMaand[e.maand]) > 0.005);
  if (vergeleken.length !== 2) throw new Error(`niet beide maandeinden te vergelijken: cash ${JSON.stringify(eindes)}, / ${JSON.stringify(perMaand)}`);
  if (fout.length) throw new Error(`maandeinde wijkt af van "Vorig saldo" op /: ${fout.map((e) => `${e.maand} cash ${e.waarde} / ${perMaand[e.maand]}`).join(' · ')}`);

  await page.goto(`${BASE}/bureau`);
  await page.waitForSelector('[data-kpi="cash"]', { timeout: 20_000 });
  const tegel = (await page.locator('[data-kpi="cash"]').innerText()).replace(/\s+/g, ' ');
  if (!tegel.includes(`laagste punt ${kop.eind}:`)) throw new Error(`overzichtstegel noemt het laagste punt niet ("${kop.eind}"): "${tegel.slice(0, 160)}"`);
  const tegelWeek = tegel.includes('weektabel (kosten vroeg, inkomsten laat): Vrij tot');
  if (weekRegel && !tegelWeek) throw new Error('de cashpagina toont een diepere weekstand, de tegel noemt hem niet met dezelfde woorden');
  return { ok: true, bewijs: `maandeinden ${eindes.map((e) => `${e.maand} ${e.waarde}`).join(' · ')}; kopgetal ${kop.maand} ${kop.waarde} (niet het eerste); gelijk aan "Vorig saldo" op / voor ${vergeleken.length} maanden; tegel "${kop.eind}"${weekRegel ? ', weekregel op beide met "kosten vroeg, inkomsten laat"' : ''}` };
}

/**
 * Eén geldtaal (2026-09-17): Buffer = vrij + bufferpot, overal hetzelfde getal. Op de bufferfixture
 * lopen Vrij en Buffer uit elkaar (het overschot van de eerste maand landt in de pot), dus eerst dat
 * vaststellen — een fixture waarin ze samenvallen kan het verschil niet meten.
 *
 * Op `/`: per kolom telt de brugregel onder de footer op tot de Buffer. Op `/bureau/cash`: elk
 * maandeinde is de footer-Buffer van zijn kolom, het kopgetal is het laagste en zijn brug telt op.
 * Op `/bureau`: de tegel toont datzelfde getal groot.
 */
const BRUG = /^vrij ([+−-]?€ [\d.,]+) \+ bufferpot ([+−-]?€ [\d.,]+)$/;

async function geldtaalOpPrognose(page) {
  const kolommen = page.locator(KOLOM);
  const aantal = await kolommen.count();
  const footers = await footerPerKolom(page);
  const rijen = [];
  for (let i = 0; i < aantal; i++) {
    const brug = kolommen.nth(i).locator('[data-buffer-bridge]');
    if ((await brug.count()) !== 1) throw new Error(`kolom ${i}: ${await brug.count()} brugregels, verwacht 1`);
    // De zichtbare bedragen, niet de attributen: die zijn per constructie `position − pot` en `pot`,
    // en tellen dus altijd op — ook als de component de verkeerde pot krijgt (review 2026-09-17).
    const tekst = (await brug.innerText()).replace(/\s+/g, ' ').trim();
    const t = tekst.match(BRUG);
    if (!t) return { ok: false, bewijs: `kolom ${i}: brugregel leest "${tekst}"` };
    const f = footers[i];
    if (!f?.aanwezig) throw new Error(`kolom ${i}: geen leesbare footer`);
    rijen.push({ kolom: i, maand: [BRON, DOEL, monthKey(2)][i], vrij: bedragUit(t[1]), pot: bedragUit(t[2]), buffer: f.stand });
  }
  if (!rijen.some((r) => Math.abs(r.pot) >= 0.005)) throw new Error(`de fixture heeft nergens een gevulde pot — Vrij en Buffer vallen overal samen: ${JSON.stringify(rijen)}`);
  const optel = rijen.filter((r) => Math.abs(r.vrij + r.pot - r.buffer) > 0.005);
  if (optel.length) return { ok: false, bewijs: `brug telt niet op tot de Buffer: ${JSON.stringify(optel)}` };

  // Een onafhankelijke bron voor de pot: de maandeinden op /bureau/cash komen uit het weekmodel, niet uit de footer.
  await page.goto(`${BASE}${CASH}`);
  await page.waitForSelector('[data-month-end]', { timeout: 20_000 });
  const potten = Object.fromEntries(await page.locator('[data-month-end]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-month-end'), Number(e.getAttribute('data-pot'))])));
  const vergeleken = rijen.filter((r) => potten[r.maand] !== undefined);
  if (!vergeleken.length) throw new Error(`geen kolom te vergelijken met /bureau/cash: ${JSON.stringify(potten)}`);
  const pot = vergeleken.filter((r) => Math.abs(r.pot - potten[r.maand]) > 0.005);
  if (pot.length) return { ok: false, bewijs: `pot in de brug wijkt af van het maandeinde op /bureau/cash: ${pot.map((r) => `${r.maand} ${r.pot} / ${potten[r.maand]}`).join(' · ')}` };
  return { ok: true, bewijs: `${rijen.map((r) => `kolom ${r.kolom}: vrij ${r.vrij} + pot ${r.pot} = Buffer ${r.buffer}`).join(' · ')}; pot gelijk aan /bureau/cash voor ${vergeleken.length} maanden` };
}

async function geldtaalOpCash(page) {
  await page.waitForSelector('[data-month-end]', { timeout: 10_000 });
  const eindes = await page.locator('[data-month-end]').evaluateAll((els) => els.map((e) => ({ maand: e.getAttribute('data-month-end'), buffer: Number(e.getAttribute('data-value')), vrij: Number(e.getAttribute('data-free')), pot: Number(e.getAttribute('data-pot')) })));
  // Het object eerst: een maandeinde met een gevulde pot. Gelezen uit `data-pot`, niet uit het verschil
  // tussen de twee waarden — dat verschil is precies wat de meting hieronder moet kunnen zien verdwijnen.
  if (!eindes.some((e) => Math.abs(e.pot) >= 0.005)) throw new Error(`geen maandeinde met een gevulde bufferpot: ${JSON.stringify(eindes)}`);
  const kop = await page.locator('[data-lowest-month-end]').evaluate((el) => ({ maand: el.getAttribute('data-lowest-month'), waarde: Number(el.getAttribute('data-lowest-month-end')) }));
  const brug = await page.locator('[data-lowest-bridge]').evaluate((el) => ({ vrij: Number(el.getAttribute('data-free')), pot: Number(el.getAttribute('data-pot')) }));
  const laagste = eindes.reduce((min, e) => (min === null || e.buffer < min.buffer ? e : min), null);
  if (kop.maand !== laagste.maand || Math.abs(kop.waarde - laagste.buffer) > 0.005) return { ok: false, bewijs: `kopgetal ${JSON.stringify(kop)} is niet de laagste Buffer ${JSON.stringify(laagste)}` };
  if (Math.abs(brug.vrij + brug.pot - kop.waarde) > 0.005) return { ok: false, bewijs: `brug onder het kopgetal telt niet op: ${JSON.stringify(brug)} ≠ ${kop.waarde}` };

  await page.goto(`${BASE}/`);
  await page.waitForSelector(KOLOM, { timeout: 20_000 });
  const footers = await footerPerKolom(page);
  const perMaand = Object.fromEntries([BRON, DOEL, monthKey(2)].map((m, i) => [m, footers[i]?.aanwezig ? footers[i].stand : undefined]));
  const vergeleken = eindes.filter((e) => perMaand[e.maand] !== undefined);
  if (!vergeleken.length) throw new Error(`geen maandeinde te vergelijken met de footers op /: ${JSON.stringify({ eindes, perMaand })}`);
  const afwijkend = vergeleken.filter((e) => Math.abs(e.buffer - perMaand[e.maand]) > 0.005);
  if (afwijkend.length) return { ok: false, bewijs: `maandeinde wijkt af van de footer-Buffer op /: ${afwijkend.map((e) => `${e.maand} cash ${e.buffer} / footer ${perMaand[e.maand]}`).join(' · ')}` };
  return { ok: true, bewijs: `maandeinden ${eindes.map((e) => `${e.maand} Buffer ${e.buffer} (vrij ${e.vrij})`).join(' · ')}; kopgetal ${kop.maand} ${kop.waarde} = laagste, brug ${brug.vrij} + ${brug.pot}; gelijk aan de footer op / voor ${vergeleken.length} maanden` };
}

/**
 * De overzichtstegel: groot staat de laagste Buffer, niet wat er vandaag vrij is. Alleen het grote getal
 * gelezen — dezelfde waarde staat ook in de tweede regel, en een check over de hele tegel bleef groen als
 * het grote getal terugviel op vrij vandaag (review 2026-09-17). Start op `/bureau`, zodat een defect in
 * de tegel vóór de meting staat; het kopgetal komt daarna van `/bureau/cash`.
 */
async function geldtaalOpTegel(page) {
  await page.waitForSelector('[data-kpi="cash"] [data-kpi-value]', { timeout: 20_000 });
  const titel = (await page.locator('[data-kpi="cash"] h3').innerText()).trim();
  const groot = bedragUit(await page.locator('[data-kpi="cash"] [data-kpi-value]').innerText());
  const vandaag = bedragUit((await page.locator('[data-kpi="cash"] [data-kpi-noemer]').innerText()).match(/vrij vandaag ([+−-]?€\s?[\d.,]+)/)?.[1] ?? ''); // Intl schrijft een U+00A0 na het €-teken

  await page.goto(`${BASE}${CASH}`);
  await page.waitForSelector('[data-lowest-month-end]', { timeout: 20_000 });
  const laagste = Number(await page.locator('[data-lowest-month-end]').getAttribute('data-lowest-month-end'));
  // Het object eerst: kan deze fixture "laagste Buffer" van "vrij vandaag" onderscheiden?
  if (vandaag === null || Math.abs(vandaag - laagste) <= 0.5) throw new Error(`de fixture onderscheidt vrij vandaag (${vandaag}) niet van de laagste Buffer (${laagste})`);
  if (titel !== 'Buffer, 13 weken' || groot === null || Math.abs(groot - laagste) > 0.5) return { ok: false, bewijs: `tegel "${titel}" toont ${groot} groot, verwacht de laagste Buffer ${laagste} (vrij vandaag ${vandaag})` };
  return { ok: true, bewijs: `tegel "${titel}": groot ${groot} = laagste Buffer ${laagste}, vrij vandaag ${vandaag} in de noemer` };
}

/**
 * De antwoordkaart bovenaan `/` (stap 1c). Drie dingen die alleen sámen iets zeggen: het grote getal
 * is de laagste Buffer — hetzelfde getal als het kopgetal op `/bureau/cash` — de brug eronder telt op,
 * en de drie maandfooters staan nog altijd op één horizontale lijn nu de kaart ruimte inneemt.
 */
async function antwoordKaart(page) {
  const kaart = page.locator('[data-cash-answer]');
  const soort = await kaart.getAttribute('data-cash-answer');
  if (soort !== 'ok') return { ok: false, bewijs: `kaart staat op "${soort}" in plaats van een antwoord` };
  const waarde = Number(await page.locator('[data-answer-value]').getAttribute('data-answer-value'));
  const brug = page.locator('[data-answer-bridge]');
  const stand = (await page.locator('[data-answer-stand]').innerText()).trim();
  const oorzaak = (await page.locator('[data-answer-cause]').innerText()).replace(/\s+/g, ' ').trim();
  if (!['gedekt', 'tekort'].includes(stand)) return { ok: false, bewijs: `stand leest "${stand}", geen woord` };
  const kaartTekst = (await kaart.innerText()).replace(/\s+/g, ' ');
  if (!/laagste punt, eind [a-z]+ \d{4}/.test(kaartTekst)) return { ok: false, bewijs: `geen maand in woorden: "${kaartTekst.slice(0, 120)}"` };
  if (!oorzaak) return { ok: false, bewijs: 'geen oorzaakregel' };
  if ((await brug.count()) !== 1) return { ok: false, bewijs: `${await brug.count()} brugregels op de kaart` };
  const vrij = Number(await brug.getAttribute('data-free'));
  const pot = Number(await brug.getAttribute('data-pot'));
  if (Math.abs(vrij + pot - waarde) > 0.005) return { ok: false, bewijs: `brug telt niet op: ${vrij} + ${pot} ≠ ${waarde}` };

  // De footers blijven op één lijn — de kaart mag hun uitlijning niet breken.
  const meting = await page.locator('[data-month-footer]').evaluateAll((els) => ({
    tops: els.map((e) => Math.round(e.getBoundingClientRect().top)),
    onder: els.map((e) => Math.round(e.getBoundingClientRect().bottom)),
    viewport: window.innerHeight,
  }));
  const yFooters = meting.tops;
  if (yFooters.length !== 3 || new Set(yFooters).size !== 1) return { ok: false, bewijs: `footers staan op y ${yFooters.join(', ')}` };
  // En ze moeten in beeld blijven: de kaart neemt hoogte af van de kolommen.
  const buiten = meting.onder.filter((b) => b > meting.viewport);
  if (buiten.length) return { ok: false, bewijs: `${buiten.length} footer(s) onder de vouw: onderkant ${buiten.join(', ')} bij ${meting.viewport} px hoog` };
  const hoogte = Math.round((await kaart.boundingBox()).height);
  if (hoogte > 160) return { ok: false, bewijs: `de kaart is ${hoogte} px hoog — meer dan drie regels` };

  // Onafhankelijke bron: het kopgetal op /bureau/cash komt uit dezelfde rekenkern, via een ander pad.
  await page.goto(`${BASE}${CASH}`);
  await page.waitForSelector('[data-lowest-month-end]', { timeout: 20_000 });
  const kop = Number(await page.locator('[data-lowest-month-end]').getAttribute('data-lowest-month-end'));
  if (Math.abs(kop - waarde) > 0.005) return { ok: false, bewijs: `kaart ${waarde} ≠ kopgetal op /bureau/cash ${kop}` };
  return { ok: true, bewijs: `kaart ${waarde} (${stand}) = kopgetal ${kop}; brug ${vrij} + ${pot}; "${oorzaak}"; footers op y=${yFooters[0]}, kaart ${hoogte} px` };
}

/** De kaart rekent vanaf vandaag: bladeren in de ledger verandert haar niet. */
async function antwoordBlijftOpVandaag(page, { zonderNavigatie = false } = {}) {
  const voor = Number(await page.locator('[data-answer-value]').getAttribute('data-answer-value'));
  const kolomVoor = (await page.locator(KOLOM).first().innerText()).split('\n')[0].trim();
  if (!zonderNavigatie) {
    await page.locator('button[aria-label="Een maand vooruit"]').click();
    await page.waitForTimeout(300);
  }
  const kolomNa = (await page.locator(KOLOM).first().innerText()).split('\n')[0].trim();
  // Het object eerst: is er wel genavigeerd? Zonder die controle meet "waarde onveranderd" niets.
  if (kolomVoor === kolomNa) return { ok: false, bewijs: `de ledger staat nog op ${kolomNa} — er is niet genavigeerd` };
  const na = Number(await page.locator('[data-answer-value]').getAttribute('data-answer-value'));
  if (Math.abs(na - voor) > 0.005) return { ok: false, bewijs: `kaart verschoof van ${voor} naar ${na} door te bladeren` };
  return { ok: true, bewijs: `ledger ${kolomVoor} → ${kolomNa}, kaart blijft ${na}` };
}

function reviewScenarios() {
  return [
    {
      naam: 'antwoord — kaart toont de laagste Buffer, met brug en uitgelijnde footers',
      gedrag: { buffer: true },
      actie: async (page) => antwoordKaart(page),
    },
    {
      naam: 'antwoord — kaart blijft op vandaag als je door de ledger bladert',
      gedrag: { buffer: true },
      actie: async (page, ctx) => antwoordBlijftOpVandaag(page, ctx),
    },
    {
      naam: 'geldtaal — brug onder de footer telt op tot de Buffer',
      gedrag: { buffer: true },
      actie: async (page) => geldtaalOpPrognose(page),
    },
    {
      naam: 'geldtaal — cash toont de laagste Buffer, gelijk aan de footer op /',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { buffer: true },
      actie: async (page) => geldtaalOpCash(page),
    },
    {
      naam: 'geldtaal — tegel toont de laagste Buffer groot, vrij vandaag in de noemer',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { buffer: true },
      actie: async (page) => geldtaalOpTegel(page),
    },
    {
      naam: 'cash — kopgetal is het laagste maandeinde, gelijk aan het saldo op /',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page) => kopgetalIsMaandeinde(page),
    },
    {
      // Zelfde meting, eigen tegenproef: die van hierboven zet het kopgetal op het eerste maandeinde,
      // deze verschuift een maandeinde zelf. Eén scenario kan maar één defect dragen.
      naam: 'cash — maandeinden gelijk aan het saldo op /',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page) => kopgetalIsMaandeinde(page),
    },
    {
      naam: 'bureau — lege staat houdt een cashtekort in beeld',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { leeg: true, tekort: true },
      actie: async (page) => {
        const leeg = await page.locator('[data-empty-state]').count();
        const signaal = page.locator('[data-signal="cash-negatief"]');
        const geenDoelen = await page.locator('[data-signal="geen-doelen"]').count();
        if (leeg !== 1) throw new Error(`${leeg} lege staten`);
        if ((await signaal.count()) !== 1) throw new Error('het cashtekort staat niet in de signalen naast de lege staat');
        if (geenDoelen) throw new Error('"Geen doelen" staat dubbel: in de lege staat én als signaal');
        const tekst = (await signaal.innerText()).replace(/\s+/g, ' ');
        if (!/Maandeinde .*−€ 250/.test(tekst)) throw new Error(`signaal zonder maandeinde: "${tekst}"`);
        return { ok: true, bewijs: `1 lege staat, signaal "${tekst.slice(0, 80)}", geen dubbel "Geen doelen"` };
      },
    },
    {
      naam: 'facturen — nieuwe factuur gekoppeld aan een bestaande post: geen tweede post',
      pad: '/bureau/projecten/harnas-met',
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page, { state }) => {
        const f = 'factuur-nieuw-harnas-met';
        await page.fill(`#${f}-label`, 'Harnaskoppeling');
        await page.fill(`#${f}-bedrag`, '459,13');
        await page.selectOption(`#${f}-prognose`, 'harnas-post-los');
        const basis = state.schrijfpogingen.length;
        await page.locator(`form[data-form="${f}"] button[type=submit]`).click();
        await page.locator('[data-invoice-row]', { hasText: 'Harnaskoppeling' }).waitFor({ timeout: 5_000 });
        const extra = await nieuweSchrijfacties(page, state, basis);
        const doc = state.documenten.at(-1);
        const factuur = doc?.bureau?.projects?.find((p) => p.id === 'harnas-met')?.invoices?.find((i) => i.label === 'Harnaskoppeling');
        const posten = (doc?.incomeItems ?? []).filter((i) => Math.abs(i.amount - 555.55) < 0.005);
        if (extra !== 1) throw new Error(`${extra} schrijfacties`);
        if (factuur?.incomeItemId !== 'harnas-post-los') throw new Error(`factuur gekoppeld aan ${factuur?.incomeItemId}`);
        if (posten.length !== 1 || doc.incomeItems.length !== 3) throw new Error(`${posten.length} posten van 555,55, ${doc.incomeItems.length} posten in totaal (verwacht 1 en 3)`);
        return { ok: true, bewijs: '1 schrijfactie; factuur.incomeItemId = harnas-post-los; 1 post van € 555,55, 3 posten in totaal' };
      },
    },
    {
      naam: 'projecten — mijlpaal bewerken vertrekt van de opgeslagen waarden',
      pad: '/bureau/projecten/harnas-k1',
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page, { state, oudeDatum = false }) => {
        const vandaag = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
        const rij = () => page.locator('[data-milestone-row="k1-1"]');
        await rij().locator('button[role=checkbox]').click();
        await page.waitForFunction(() => document.querySelector('[data-milestone-row="k1-1"] button[role=checkbox]')?.getAttribute('data-state') === 'unchecked', null, { timeout: 5_000 });
        await rij().locator('button[role=checkbox]').click();
        await page.waitForFunction(() => document.querySelector('[data-milestone-row="k1-1"] button[role=checkbox]')?.getAttribute('data-state') === 'checked', null, { timeout: 5_000 });
        await rij().locator('button', { hasText: 'Bewerken' }).click();
        await page.fill('input[aria-label="Omschrijving"]', 'k1-1 hernoemd');
        // Tegenproef: de oude realisatiedatum staat nog in het formulier — precies wat de bevroren invoer deed.
        if (oudeDatum) await page.fill('input[aria-label="Realisatiedatum"]', `${JAAR - 1}-12-31`);
        const basis = state.schrijfpogingen.length;
        await page.locator('button', { hasText: /^OK$/ }).first().click();
        await page.locator('[data-milestone-row="k1-1"]', { hasText: 'k1-1 hernoemd' }).waitFor({ timeout: 5_000 });
        await nieuweSchrijfacties(page, state, basis);
        const m = state.documenten.at(-1)?.bureau?.projects?.find((p) => p.id === 'harnas-k1')?.milestones?.find((x) => x.id === 'k1-1');
        if (m?.label !== 'k1-1 hernoemd' || m?.realizedOn !== vandaag || m?.realizedAmount !== null) throw new Error(`na bewerken: ${JSON.stringify({ label: m?.label, realizedOn: m?.realizedOn, realizedAmount: m?.realizedAmount })}, verwacht realizedOn ${vandaag}`);
        return { ok: true, bewijs: `afvinken → terugzetten → bewerken: label hernoemd, realizedOn ${m.realizedOn} (vandaag), realizedAmount null` };
      },
    },
    {
      naam: 'conflict — Enter in een rij schrijft niets',
      pad: '/bureau/projecten/harnas-met',
      wachtOp: 'bureau',
      gedrag: { bureau: 'vol', conflict: true },
      actie: async (page, { zonderConflict = false }) => {
        // Eerst een geweigerde schrijfactie: dat maakt het conflict. De tegenproef slaat dat over en
        // toont dat dezelfde Enter zonder conflict de kosten wél verandert — dus dat de meting het ziet.
        await page.locator('[data-invoice-row="harnas-factuur-later"] button[role=checkbox]').click();
        if (!zonderConflict) await page.locator('[role=alert]', { hasText: 'Elders gewijzigd' }).waitFor({ timeout: 10_000 });
        const kosten = () => page.locator('section', { hasText: 'Directe externe kosten' }).locator('p', { hasText: 'werkelijk bekend voor' }).innerText();
        const voor = await kosten();
        await page.fill('#kost-werkelijk-harnas-kost', '999');
        await page.press('#kost-werkelijk-harnas-kost', 'Enter');
        await page.waitForTimeout(300);
        const na = await kosten();
        if (voor !== na) throw new Error(`Enter tijdens conflict veranderde de kosten: "${voor}" → "${na}"`);
        return { ok: true, bewijs: `conflict actief; Enter in "werkelijk": "${na.replace(/\s+/g, ' ')}" onveranderd` };
      },
    },
    {
      naam: 'bureau — focus blijft in de rij bij bewerken en verwijderen',
      pad: '/bureau/projecten/harnas-met',
      wachtOp: 'bureau',
      gedrag: { bureau: 'vol' },
      actie: async (page, { verstoor = false }) => {
        // Tegenproef: na elke klik valt de focus op body — de toestand van vóór de fix.
        if (verstoor) await page.evaluate(() => document.addEventListener('click', () => setTimeout(() => document.activeElement?.blur(), 0), true));
        const focus = () => page.evaluate(() => ({ label: document.activeElement?.getAttribute('aria-label') ?? '', tekst: document.activeElement?.textContent?.trim() ?? '', tag: document.activeElement?.tagName }));
        await page.locator('button[aria-label="Verwijder factuur Harnasslot"]').click();
        const bevestig = await focus();
        await page.locator('[data-invoice-row="harnas-factuur-oud"] button', { hasText: 'Niet verwijderen' }).click();
        await page.waitForTimeout(100);
        const terug = await focus();
        await page.goto(`${BASE}/bureau/projecten/harnas-zonder`);
        await page.waitForSelector('[data-milestone-row="harnas-m1"]', { timeout: 20_000 });
        await page.locator('button[aria-label="Bewerk mijlpaal Harnasmijlpaal"]').click();
        const bewerk = await focus();
        await page.locator('button', { hasText: 'Annuleren' }).first().click();
        await page.waitForTimeout(100);
        const naAnnuleren = await focus();
        const fouten = [];
        if (bevestig.tekst !== 'Niet verwijderen') fouten.push(`na Verwijderen op "${bevestig.tekst || bevestig.tag}"`);
        if (terug.label !== 'Verwijder factuur Harnasslot') fouten.push(`na Niet verwijderen op "${terug.label || terug.tag}"`);
        if (bewerk.label !== 'Omschrijving') fouten.push(`na Bewerken op "${bewerk.label || bewerk.tag}"`);
        if (naAnnuleren.label !== 'Bewerk mijlpaal Harnasmijlpaal') fouten.push(`na Annuleren op "${naAnnuleren.label || naAnnuleren.tag}"`);
        if (fouten.length) throw new Error(fouten.join(' · '));
        return { ok: true, bewijs: 'Verwijderen → "Niet verwijderen" → terug op "Verwijder factuur"; Bewerken → Omschrijving → Annuleren → terug op "Bewerk mijlpaal"' };
      },
    },
    {
      naam: 'bureau — lege staat per route (leeg document)',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { leeg: true },
      actie: async (page) => {
        const routes = [OVERZICHT, '/bureau/projecten', VERKOOP, '/bureau/tijd', KLANTEN, CASH, DOELEN];
        const uit = [];
        for (const pad of routes) {
          if (pad !== OVERZICHT) {
            await page.locator('nav[aria-label="Bureau"] a', { hasText: { [OVERZICHT]: 'Overzicht', '/bureau/projecten': 'Projecten', [VERKOOP]: 'Verkoop', '/bureau/tijd': 'Tijd', [KLANTEN]: 'Klanten', [CASH]: 'Cash', [DOELEN]: 'Doelen' }[pad] }).click();
            await page.waitForURL(`${BASE}${pad}`, { timeout: 10_000 });
            await page.waitForSelector('[data-bureau-page] h2', { timeout: 10_000 });
          }
          const r = await page.evaluate(() => {
            const leeg = [...document.querySelectorAll('[data-empty-state]')];
            const knoppen = [...document.querySelectorAll('[data-bureau-page] button, [data-bureau-page] a')].filter((el) => !el.closest('nav'));
            return { leeg: leeg.length, actieInLeeg: leeg.reduce((n, el) => n + el.querySelectorAll('a, button').length, 0), actiesOpPagina: knoppen.length };
          });
          uit.push({ pad, ...r });
        }
        const fout = uit.filter((x) => x.leeg !== 1);
        if (fout.length) throw new Error(fout.map((x) => `${x.pad}: ${x.leeg} lege staten`).join(' · '));
        return { ok: true, bewijs: uit.map((x) => `${x.pad.replace('/bureau', '') || '/'} 1 (actie erin ${x.actieInLeeg})`).join(' · ') };
      },
    },
    {
      naam: 'projecten — zonder mijlpalen geen € 0, in de tabel en op de detailpagina',
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const rij = page.locator('[data-project-row="harnas-met"]');
        const cellen = await rij.locator('td[data-onvoldoende]').count();
        const rijTekst = (await rij.innerText()).replace(/\s+/g, ' ');
        if (cellen !== 2 || /€\s?0(?![\d.,])/.test(rijTekst)) throw new Error(`tabelrij: ${cellen} onvoldoende-cellen, "${rijTekst}"`);
        await page.goto(`${BASE}/bureau/projecten/harnas-met`);
        await page.waitForSelector('#project-titel', { timeout: 20_000 });
        const omzet = (await page.locator('dl').first().locator('div', { hasText: 'Omzet in' }).innerText()).replace(/\s+/g, ' ');
        if (!omzet.includes('Onvoldoende gegevens') || /€\s?0(?![\d.,])/.test(omzet)) throw new Error(`detail: "${omzet}"`);
        return { ok: true, bewijs: `tabel: 2 cellen "Onvoldoende gegevens", geen € 0; detail: "${omzet.slice(0, 80)}"` };
      },
    },
    {
      naam: 'projecten — datums in Nederlandse notatie, geen yyyy-MM',
      pad: '/bureau/projecten',
      wachtOp: 'bureau',
      gedrag: { bureau: 'projecten' },
      actie: async (page) => {
        const tabel = (await page.locator('[data-project-row]').allInnerTexts()).join(' ');
        await page.goto(`${BASE}/bureau/projecten/harnas-met`);
        await page.waitForSelector('#project-titel', { timeout: 20_000 });
        const kop = (await page.locator('article header').innerText()).replace(/\s+/g, ' ');
        const iso = /\b\d{4}-\d{2}(-\d{2})?\b/;
        if (iso.test(tabel) || iso.test(kop)) throw new Error(`ISO-datum in ${iso.test(tabel) ? `tabel "${tabel.match(iso)[0]}"` : `kop "${kop}"`}`);
        if (!/uitvoering [a-z]{3} \d{4} · getekend \d{1,2} [a-z]+ \d{4}/.test(kop)) throw new Error(`kop "${kop}"`);
        return { ok: true, bewijs: `kop "${kop.match(/uitvoering.*/)?.[0]}"; 0 ISO-datums in tabel en kop` };
      },
    },
    {
      naam: 'projecten — hoogstens één primaire knop per sectie op de detailpagina',
      pad: '/bureau/projecten/harnas-met',
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page) => {
        const secties = await page.locator('article section').evaluateAll((els) => els.map((el) => ({
          titel: el.querySelector('h3')?.textContent ?? '?',
          // Het klassetoken zelf: een Checkbox draagt `data-[state=checked]:bg-primary`, wat een
          // substringtoets als primaire knop telde (gemeten: "Facturen en betalingen: 4").
          primair: [...el.querySelectorAll('button')].filter((b) => b.classList.contains('bg-primary')).length,
        })));
        const teVeel = secties.filter((x) => x.primair > 1);
        if (teVeel.length) throw new Error(teVeel.map((x) => `${x.titel}: ${x.primair}`).join(' · '));
        const totaal = secties.reduce((a, x) => a + x.primair, 0);
        return { ok: true, bewijs: `${secties.length} secties, ${totaal} primaire knop(pen) in totaal, nergens meer dan één` };
      },
    },
    {
      naam: 'cash — rijen even hoog, regelknop heet "N regels"',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      actie: async (page) => {
        const hoogtes = await page.locator('[data-cash-week]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
        const uniek = [...new Set(hoogtes)];
        const knoppen = await page.locator('[data-cash-week] button').allInnerTexts();
        if (uniek.length !== 1) throw new Error(`rijhoogtes ${JSON.stringify(uniek)}`);
        if (!knoppen.length || knoppen.some((t) => !/^\d+ regels?$/.test(t.trim()))) throw new Error(`knopteksten ${JSON.stringify(knoppen)}`);
        return { ok: true, bewijs: `${hoogtes.length} rijen van ${uniek[0]} px; knoppen ${JSON.stringify(knoppen)}` };
      },
    },
    {
      naam: 'cash — 390: einde vrij per week in beeld zonder te scrollen',
      pad: CASH,
      wachtOp: 'bureau',
      gedrag: { bureau: 'cash' },
      viewport: { width: 390, height: 844 },
      actie: async (page) => {
        const r = await page.locator('[data-cash-week]').evaluateAll((els) => els.map((e) => {
          const eind = e.querySelector('[data-closing-mobile]');
          const rect = eind?.getBoundingClientRect();
          return { tekst: eind?.textContent ?? '', zichtbaar: Boolean(rect && rect.width > 0 && rect.left >= 0 && rect.right <= window.innerWidth), waarde: e.querySelector('[data-closing-free]')?.getAttribute('data-closing-free') };
        }));
        const fout = r.filter((x) => !x.zichtbaar || !x.tekst.startsWith('einde'));
        if (r.length !== 13 || fout.length) throw new Error(`${r.length} weken, ${fout.length} zonder zichtbaar einde: ${JSON.stringify(fout[0])}`);
        return { ok: true, bewijs: `13 weken, elk "${r[0].tekst}"-vorm binnen 390 px` };
      },
    },
    {
      naam: 'bureau — signalen op één regel op 1440',
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { bureau: 'vol' },
      actie: async (page) => {
        const r = await page.locator('[data-signal]').evaluateAll((els) => els.map((li) => {
          const tekst = li.querySelector('span.min-w-0');
          const regel = parseFloat(getComputedStyle(tekst).lineHeight);
          return { id: li.getAttribute('data-signal'), regels: Math.round(tekst.getBoundingClientRect().height / regel) };
        }));
        const meer = r.filter((x) => x.regels !== 1);
        if (!r.length || meer.length) throw new Error(`${r.length} signalen, meer dan één regel: ${JSON.stringify(meer)}`);
        return { ok: true, bewijs: `${r.length} signalen, elk 1 regel` };
      },
    },
    {
      naam: 'bureau — 390: header en subnav',
      pad: '/bureau/doelen',
      wachtOp: 'bureau',
      gedrag: { bureau: 'doelen' },
      viewport: { width: 390, height: 844 },
      actie: async (page) => {
        const r = await page.evaluate(() => {
          const uit = [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('Uitloggen'));
          const nav = document.querySelector('nav[aria-label="Hoofdnavigatie"] a');
          const sub = [...document.querySelectorAll('nav[aria-label="Bureau"] a')].map((a) => {
            const rect = a.getBoundingClientRect();
            return { label: a.textContent, binnen: rect.left >= 0 && rect.right <= window.innerWidth };
          });
          return { uitTop: Math.round(uit.getBoundingClientRect().top), navTop: Math.round(nav.getBoundingClientRect().top), sub };
        });
        const buiten = r.sub.filter((x) => !x.binnen).map((x) => x.label);
        if (r.uitTop !== r.navTop) throw new Error(`Uitloggen op y=${r.uitTop}, navigatie op y=${r.navTop}`);
        if (r.sub.length !== 7 || buiten.length) throw new Error(`subnav ${r.sub.length} items, buiten beeld: ${buiten.join(', ')}`);
        return { ok: true, bewijs: `Uitloggen en navigatie op y=${r.navTop}; 7/7 subnav-items binnen 390 px` };
      },
    },
  ];
}

/**
 * Elke review-meting met het defect teruggezet in de DOM, vóór de meting: de scenario's hierboven
 * horen dan te falen. Zonder dit is "groen na de fix" niet te onderscheiden van "meet niets".
 */
function reviewTegenproeven() {
  const defect = {
    'cash — kopgetal is het laagste maandeinde, gelijk aan het saldo op /': () => {
      // Het defect: het kopgetal wijst naar het eerste maandeinde in plaats van het laagste.
      const eerste = document.querySelector('[data-month-end]');
      const kop = document.querySelector('[data-lowest-month-end]');
      kop.setAttribute('data-lowest-month', eerste.getAttribute('data-month-end'));
      kop.setAttribute('data-lowest-month-end', eerste.getAttribute('data-value'));
    },
    'cash — maandeinden gelijk aan het saldo op /': () => {
      // Het defect: een maandeinde dat niet uit de rekenkern komt. Het kopgetal schuift consequent mee,
      // zodat alleen de vergelijking met "Vorig saldo" op / het kan zien.
      const tweede = document.querySelectorAll('[data-month-end]')[1];
      const nieuw = String(Number(tweede.getAttribute('data-value')) + 1);
      const kop = document.querySelector('[data-lowest-month-end]');
      if (kop.getAttribute('data-lowest-month') === tweede.getAttribute('data-month-end')) kop.setAttribute('data-lowest-month-end', nieuw);
      tweede.setAttribute('data-value', nieuw);
    },
    'bureau — lege staat houdt een cashtekort in beeld': () => { document.querySelector('[data-signal-list]')?.remove(); },
    // Het defect: het grote getal op de kaart wijkt af van de rekenkern (zoals vrij vandaag in plaats van het laagste punt).
    'antwoord — kaart toont de laagste Buffer, met brug en uitgelijnde footers': () => {
      const el = document.querySelector('[data-answer-value]');
      el.setAttribute('data-answer-value', String(Number(el.getAttribute('data-answer-value')) + 100));
    },
    // Het defect: de brug toont een pot die niet bij de Buffer hoort (zoals `buffer.delta` in plaats van `buffer.total`).
    'geldtaal — brug onder de footer telt op tot de Buffer': () => {
      const brug = document.querySelector('[data-buffer-bridge]');
      brug.textContent = brug.textContent.replace(/bufferpot .*$/, 'bufferpot € 9.999,99');
    },
    // Het defect van vóór 2026-09-17: de maandeinden dragen Vrij in plaats van de Buffer.
    'geldtaal — cash toont de laagste Buffer, gelijk aan de footer op /': () => {
      document.querySelectorAll('[data-month-end]').forEach((el) => el.setAttribute('data-value', el.getAttribute('data-free')));
    },
    // Het defect van vóór 2026-09-17: groot staat wat er vandaag vrij is.
    'geldtaal — tegel toont de laagste Buffer groot, vrij vandaag in de noemer': () => {
      const noemer = document.querySelector('[data-kpi="cash"] [data-kpi-noemer]').textContent;
      document.querySelector('[data-kpi="cash"] [data-kpi-value]').textContent = noemer.match(/vrij vandaag ([^=]+)=/)[1].trim();
    },
    'facturen — nieuwe factuur gekoppeld aan een bestaande post: geen tweede post': () => {
      // Het defect: de keuze voor een bestaande post gaat verloren en er komt een nieuwe.
      const select = document.querySelector('[id$="-prognose"]');
      select.addEventListener('change', () => { select.value = 'nieuw'; select.dispatchEvent(new Event('change', { bubbles: true })); }, { once: true });
    },
    'bureau — lege staat per route (leeg document)': () => { document.querySelector('[data-empty-state]').remove(); },
    'projecten — zonder mijlpalen geen € 0, in de tabel en op de detailpagina': () => { document.querySelector('[data-project-row="harnas-met"] td[data-onvoldoende]').textContent = '€ 0'; },
    'projecten — datums in Nederlandse notatie, geen yyyy-MM': () => { document.querySelector('[data-project-row]').insertAdjacentText('beforeend', ' 2026-09'); },
    'projecten — hoogstens één primaire knop per sectie op de detailpagina': () => { document.querySelectorAll('article section button').forEach((b) => b.classList.add('bg-primary')); },
    'cash — rijen even hoog, regelknop heet "N regels"': () => { document.querySelector('[data-cash-week] th').style.paddingBlock = '1.25rem'; },
    'cash — 390: einde vrij per week in beeld zonder te scrollen': () => { document.querySelectorAll('[data-closing-mobile]').forEach((el) => { el.style.display = 'none'; }); },
    'bureau — signalen op één regel op 1440': () => { document.querySelectorAll('[data-signal] span.min-w-0 > span:last-child').forEach((el) => { el.style.display = 'block'; }); },
    'bureau — 390: header en subnav': () => { const ul = document.querySelector('nav[aria-label="Bureau"] ul'); ul.style.flexWrap = 'nowrap'; ul.style.width = 'max-content'; },
  };
  // Gedrag dat niet in de DOM terug te zetten is, krijgt het defect als optie van zijn scenario.
  const optie = {
    // Niet navigeren: dan moet de eigen controle "is er wel gebladerd?" de scenario laten vallen.
    'antwoord — kaart blijft op vandaag als je door de ledger bladert': { zonderNavigatie: true },
    'projecten — mijlpaal bewerken vertrekt van de opgeslagen waarden': { oudeDatum: true },
    'conflict — Enter in een rij schrijft niets': { zonderConflict: true },
    'bureau — focus blijft in de rij bij bewerken en verwijderen': { verstoor: true },
  };
  return reviewScenarios().map((sc) => {
    if (!defect[sc.naam] && !optie[sc.naam]) throw new Error(`reviewscenario zonder tegenproef: ${sc.naam}`);
    return {
      ...sc,
      naam: `tegenproef — ${sc.naam}`,
      moetFalen: true,
      gedrag: sc.naam === 'conflict — Enter in een rij schrijft niets' ? { bureau: 'vol' } : sc.gedrag,
      actie: async (page, ctx) => {
        if (defect[sc.naam]) await page.evaluate(defect[sc.naam]);
        return sc.actie(page, { ...ctx, ...(optie[sc.naam] ?? {}) });
      },
    };
  });
}

function bureauTegenproeven() {
  return [
    {
      naam: 'tegenproef — een nul in een lege tegel',
      moetFalen: true,
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { leeg: true },
      actie: async (page) => {
        await page.locator('[data-kpi="omzet"] [data-onvoldoende]').evaluate((el) => { el.insertAdjacentHTML('beforeend', '<p>€ 0</p>'); });
        return leegNooitNul(page);
      },
    },
    {
      naam: 'tegenproef — signaal met alleen een kleur',
      moetFalen: true,
      pad: OVERZICHT,
      wachtOp: 'bureau',
      gedrag: { bureau: 'klanten' },
      actie: async (page) => {
        await page.locator('[data-signal] [class*="rounded-full"]').evaluateAll((els) => els.forEach((el) => { el.textContent = ''; }));
        return signaalMetWoord(page);
      },
    },
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
      // Een kleur die op zich AA haalt, gedoofd door opacity — precies het patroon
      // `text-muted-foreground opacity-70` dat tot 2026-09-17 als volle muted-kleur mat.
      naam: 'tegenproef — muted tekst met opacity',
      moetFalen: true,
      actie: async (page) => {
        await page.evaluate(() => {
          const p = document.createElement('p');
          p.style.cssText = 'background:#ffffff;padding:4px';
          const s = document.createElement('span');
          s.textContent = 'tegenproef: muted met opacity';
          s.className = 'text-2xs text-muted-foreground';
          s.style.opacity = '0.7';
          p.appendChild(s);
          document.body.appendChild(p);
        });
        const m = await sweep(page, 'prognose + opacity-injectie');
        const gevonden = m.fouten.filter((f) => f.voorbeeldTekst.includes('tegenproef: muted met opacity'));
        if (gevonden.length) return { ok: false, bewijs: `gezien: ${gevonden[0].ratio.toFixed(2)}:1, zoals het hoort` };
        return { ok: true, bewijs: 'muted tekst met opacity glipte door de sweep' };
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
  const teDraaien = SCREENSHOTS
    ? screenshotScenarios(resolve(process.cwd(), SCREENSHOTS))
    : [...scenarios(), ...bureauScenarios(), ...reviewScenarios(), ...(SELFTEST ? [...tegenproeven(), ...bureauTegenproeven(), ...reviewTegenproeven()] : [])];
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
