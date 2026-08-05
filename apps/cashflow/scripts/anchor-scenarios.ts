/**
 * Ankerstaat-scenario's: het venster mag niet afhangen van waar je anker staat.
 *
 * Dezelfde gegevens, één keer doorgerekend vanaf de referentiemaand en één keer
 * rechtstreeks vanaf een latere ankermaand via `computeAnchorState`, moeten voor die
 * ankermaand hetzelfde eindsaldo en dezelfde potstanden geven. Loopt dat uiteen, dan
 * verandert er geld door te bladeren — en dat is precies de klasse fouten die dit
 * bestand vastlegt.
 *
 * Draaien: apps/cashflow/node_modules/.bin/tsx apps/cashflow/scripts/anchor-scenarios.ts
 */
import { calculateMonths, computeAnchorState } from '../lib/cashflow/calculator';
import { buildSnapshot, snapshotMap } from '../lib/cashflow/snapshot';
import { addMonth } from '../lib/cashflow/recurring';
import type {
  BalanceOverride,
  ExpenseItem,
  IncomeItem,
  MonthData,
  MonthKey,
  MonthSnapshot,
  RecurringDefer,
  RecurringItem,
  RecurringSettlement,
  ReservationDefer,
  ReservationItem,
  ReservationPayment,
  ReservationSettlement,
} from '../lib/cashflow/types';

let failures = 0;
let checks = 0;

function check(name: string, actual: number, expected: number, tol = 0.005) {
  checks++;
  if (Math.abs(actual - expected) >= tol) {
    failures++;
    console.log(`  FAIL  ${name}: verwacht ${expected.toFixed(2)}, kreeg ${actual.toFixed(2)}`);
  } else {
    console.log(`  ok    ${name} = ${actual.toFixed(2)}`);
  }
}

type Dataset = {
  referenceMonth: MonthKey;
  referenceBalance: number;
  /** Hoeveel maanden het doorlopende venster beslaat. */
  horizon: number;
  /** Hoeveel maanden ná de referentiemaand het anker gelegd wordt. */
  anchorAfter: number;
  expenseItems?: ExpenseItem[];
  incomeItems?: IncomeItem[];
  recurringItems?: RecurringItem[];
  reservations?: ReservationItem[];
  reservationPayments?: ReservationPayment[];
  recurringDefers?: RecurringDefer[];
  recurringSettlements?: RecurringSettlement[];
  reservationDefers?: ReservationDefer[];
  reservationSettlements?: ReservationSettlement[];
  balanceOverrides?: BalanceOverride[];
  /** Maanden (offset vanaf de referentiemaand) die als afgesloten bevroren worden. */
  closeAt?: number[];
};

function monthKeyAt(d: Dataset, offset: number): MonthKey {
  return addMonth(d.referenceMonth, offset);
}

function args(d: Dataset) {
  return {
    expenseItems: d.expenseItems ?? [],
    incomeItems: d.incomeItems ?? [],
    recurringItems: d.recurringItems ?? [],
    reservations: d.reservations ?? [],
    reservationPayments: d.reservationPayments ?? [],
    recurringDefers: d.recurringDefers ?? [],
    recurringSettlements: d.recurringSettlements ?? [],
    reservationDefers: d.reservationDefers ?? [],
    reservationSettlements: d.reservationSettlements ?? [],
    balanceOverrides: d.balanceOverrides ?? [],
  };
}

function runContinuous(d: Dataset, snapshots: MonthSnapshot[]): MonthData[] {
  const a = args(d);
  return calculateMonths(
    d.referenceMonth, d.referenceBalance, a.expenseItems, a.incomeItems, a.recurringItems,
    a.reservations, a.reservationPayments, a.recurringDefers, a.recurringSettlements,
    a.reservationDefers, a.reservationSettlements, d.horizon, undefined, snapshotMap(snapshots),
  );
}

function runAnchored(d: Dataset, snapshots: MonthSnapshot[]) {
  const a = args(d);
  const anchorMonth = monthKeyAt(d, d.anchorAfter);
  const state = computeAnchorState(
    d.referenceBalance, d.referenceMonth, anchorMonth, a.expenseItems, a.incomeItems,
    a.recurringItems, a.reservations, a.reservationPayments, a.recurringDefers,
    a.recurringSettlements, a.reservationDefers, a.reservationSettlements,
    a.balanceOverrides, snapshots,
  );
  const months = calculateMonths(
    anchorMonth, state.startBalance, a.expenseItems, a.incomeItems, a.recurringItems,
    a.reservations, a.reservationPayments, a.recurringDefers, a.recurringSettlements,
    a.reservationDefers, a.reservationSettlements, d.horizon - d.anchorAfter,
    state.potBalances, snapshotMap(snapshots),
  );
  return { state, months };
}

/** Bevriest de gevraagde maanden uit het doorlopende venster tot snapshots. */
function freeze(d: Dataset): MonthSnapshot[] {
  if (!d.closeAt?.length) return [];
  const base = runContinuous(d, []);
  return d.closeAt.map((i) => buildSnapshot(base[i]!, '2026-01-01T00:00:00.000Z'));
}

function potSum(m: MonthData): number {
  return m.reservationPots
    .filter((p) => p.potType === 'spaardoel')
    .reduce((s, p) => s + p.potBalance, 0);
}

/**
 * De kern: bladeren mag niets veranderen. Vergelijkt de ankermaand uit het doorlopende
 * venster met diezelfde maand als vertrekpunt van een eigen venster.
 */
function compare(label: string, d: Dataset) {
  console.log(`\n${label}`);
  const snapshots = freeze(d);
  const continuous = runContinuous(d, snapshots);
  const { state, months } = runAnchored(d, snapshots);

  const anchorInWindow = continuous[d.anchorAfter]!;
  const anchored = months[0]!;

  // Het banksaldo dat de ankerstaat oplevert, hoort het vrije saldo plus de spaardoelen
  // te zijn — dat staat samen op de rekening.
  //
  // Met één grens: een pot die de ankermaand via een uitstel overslaat, wordt die maand
  // nergens aangerekend. Zou zijn saldo wél in het banksaldo zitten, dan zou maand 0 het
  // als vrij besteedbaar lezen en het eindsaldo te hoog uitvallen. Zijn opbouw blijft
  // bewaard in de teruggegeven potstanden — dat toetsen de checks hieronder.
  const departing = new Set(
    (d.reservationDefers ?? [])
      .filter((x) => x.fromMonth === monthKeyAt(d, d.anchorAfter))
      .map((x) => x.reservationId),
  );
  const potsInBank = (continuous[d.anchorAfter - 1]!.reservationPots ?? [])
    .filter((p) => p.potType === 'spaardoel' && !departing.has(p.reservationId))
    .reduce((s, p) => s + p.potBalance, 0);
  const expectedBank = anchorInWindow.startBalance + potsInBank;
  check(`${label} · banksaldo bij het anker`, state.startBalance, expectedBank);
  check(`${label} · eindsaldo ankermaand`, anchored.endBalance, anchorInWindow.endBalance);
  check(`${label} · potten na de ankermaand`, potSum(anchored), potSum(anchorInWindow));

  // En de maand daarna moet ook nog kloppen, anders is de doorrol enkel toevallig goed.
  if (months.length > 1 && continuous.length > d.anchorAfter + 1) {
    check(`${label} · eindsaldo maand erna`, months[1]!.endBalance, continuous[d.anchorAfter + 1]!.endBalance);
    check(`${label} · potten maand erna`, potSum(months[1]!), potSum(continuous[d.anchorAfter + 1]!));
  }
}

const HUUR: RecurringItem = {
  id: 'huur', label: 'Huur', amount: 1000, type: 'expense', frequency: 'monthly', startMonth: '2026-01',
};

function inkomen(months: MonthKey[], amount: number): IncomeItem[] {
  return months.map((monthKey, i) => ({
    id: `inc-${i}`, monthKey, label: 'inkomen', amount, received: false,
  }));
}

const ALLE_MAANDEN = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];

// ── A1: controle — gewone provisiepot, geen bijzonderheden ─────────────────────
compare('A1 — gewone provisiepot', {
  referenceMonth: '2026-01', referenceBalance: 10000, horizon: 4, anchorAfter: 2,
  incomeItems: inkomen(ALLE_MAANDEN, 2000),
  recurringItems: [HUUR],
  reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 1400, startMonth: '2026-01', type: 'spaardoel' }],
});

// ── A2: pot die in de ankermaand gefinaliseerd wordt ───────────────────────────
compare('A2 — pot gefinaliseerd in de ankermaand', {
  referenceMonth: '2026-01', referenceBalance: 10000, horizon: 4, anchorAfter: 2,
  incomeItems: inkomen(ALLE_MAANDEN, 2000),
  recurringItems: [HUUR],
  reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 1400, startMonth: '2026-01', type: 'spaardoel' }],
  reservationSettlements: [
    { id: 's1', reservationId: 'btw', monthKey: '2026-03', effectiveAmount: 1400, finalized: true },
  ],
});

// ── A3: bufferpot die in de ankermaand gefinaliseerd wordt ─────────────────────
compare('A3 — bufferpot gefinaliseerd in de ankermaand', {
  referenceMonth: '2026-01', referenceBalance: 10000, horizon: 4, anchorAfter: 2,
  incomeItems: inkomen(ALLE_MAANDEN, 2000),
  recurringItems: [HUUR],
  reservations: [
    { id: 'buf', label: 'Buffer', monthlyAmount: 500, startMonth: '2026-01', type: 'spaardoel', coversDeficit: true },
  ],
  reservationSettlements: [
    { id: 's1', reservationId: 'buf', monthKey: '2026-03', effectiveAmount: 500, finalized: true },
  ],
});

// ── A4: correctie op het banksaldo tussen de afsluiting en het anker ───────────
//
// Hier kan het doorlopende venster niet de maatstaf zijn: `calculateMonths` kent geen
// overrides. De invariant is een andere — een maand afsluiten legt hístorie vast en mag
// een correctie die je dáárna hebt ingevuld niet opeten. Dus: dezelfde gegevens, één keer
// met en één keer zonder afgesloten maand, moeten dezelfde ankerstaat geven.
{
  const label = 'A4 — afsluiten mag een latere correctie niet opeten';
  console.log(`\n${label}`);
  const d: Dataset = {
    referenceMonth: '2026-01', referenceBalance: 10000, horizon: 5, anchorAfter: 3,
    incomeItems: inkomen(ALLE_MAANDEN, 2000),
    recurringItems: [HUUR],
    reservations: [
      { id: 'buf', label: 'Buffer', monthlyAmount: 500, startMonth: '2026-01', type: 'spaardoel', coversDeficit: true },
    ],
    balanceOverrides: [{ id: 'o1', monthKey: '2026-02', balance: 9000 }],
  };
  const zonder = runAnchored(d, []);
  const met = runAnchored(d, freeze({ ...d, closeAt: [0] }));

  check(`${label} · banksaldo`, met.state.startBalance, zonder.state.startBalance);
  check(`${label} · bufferstand`, met.state.potBalances.get('buf') ?? -1, zonder.state.potBalances.get('buf') ?? -1);
  check(`${label} · eindsaldo ankermaand`, met.months[0]!.endBalance, zonder.months[0]!.endBalance);
  // En de correctie moet er ook echt in zitten. Zonder correctie staat de rekening bij de
  // start van februari op 11000 (10000 + 2000 inkomen − 1000 huur, alles in de buffer);
  // 9000 invullen haalt er dus 2000 af, en dat moet tot in de ankermaand doorwerken.
  const zonderCorrectie = runAnchored({ ...d, balanceOverrides: [] }, []);
  check(`${label} · correctie werkt door`,
    zonderCorrectie.state.startBalance - met.state.startBalance, 2000);
}

// ── A5: overbrugging vanaf een afgesloten maand, pot vertrekt uit de ankermaand ─
compare('A5 — overbrugging met een uitgestelde pot', {
  referenceMonth: '2026-01', referenceBalance: 10000, horizon: 5, anchorAfter: 3,
  incomeItems: inkomen(ALLE_MAANDEN, 2000),
  recurringItems: [HUUR],
  reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 900, startMonth: '2026-01', type: 'spaardoel' }],
  reservationDefers: [{ id: 'd1', reservationId: 'btw', fromMonth: '2026-04', toMonth: '2026-05' }],
  closeAt: [0],
});

// ── A6: overbrugging zonder bijzonderheden (controle op A5) ────────────────────
compare('A6 — overbrugging, controle', {
  referenceMonth: '2026-01', referenceBalance: 10000, horizon: 5, anchorAfter: 3,
  incomeItems: inkomen(ALLE_MAANDEN, 2000),
  recurringItems: [HUUR],
  reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 900, startMonth: '2026-01', type: 'spaardoel' }],
  closeAt: [0],
});

// ── A7: pot die zowel de afgesloten maand als de ankermaand overslaat ──────────
//
// De pot staat dan in géén van beide `reservationPots`-lijsten. Zonder een volledige
// basis-map valt hij uit de ankerstaat, en dan rekent de maandberekening met een stand
// die nooit in het banksaldo verwerkt is.
compare('A7 — pot vertrokken uit afsluiting én anker', {
  referenceMonth: '2026-01', referenceBalance: 10000, horizon: 5, anchorAfter: 1,
  incomeItems: inkomen(ALLE_MAANDEN, 2000),
  recurringItems: [HUUR],
  reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 900, startMonth: '2026-01', type: 'spaardoel' }],
  reservationDefers: [
    { id: 'd1', reservationId: 'btw', fromMonth: '2026-01', toMonth: '2026-04' },
    { id: 'd2', reservationId: 'btw', fromMonth: '2026-02', toMonth: '2026-04' },
  ],
  closeAt: [0],
});

// ── A8: een correctie vervangt het saldo, niet de bevroren potstanden ──────────
{
  const label = 'A8 — correctie raakt de bevroren potstanden niet';
  console.log(`\n${label}`);
  const gesloten: Dataset = {
    referenceMonth: '2026-01', referenceBalance: 30000, horizon: 5, anchorAfter: 3,
    incomeItems: inkomen(ALLE_MAANDEN, 2000),
    recurringItems: [HUUR],
    reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 900, startMonth: '2026-01', type: 'spaardoel' }],
    closeAt: [0],
  };
  const snapshots = freeze(gesloten);

  // Januari is afgesloten met 900/maand. Daarna wordt het maandbedrag verhoogd: de
  // bevroren stand mag daar niet meer door bewegen, want dat is historie.
  const naVerhoging: Dataset = {
    ...gesloten,
    reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 5000, startMonth: '2026-01', type: 'spaardoel' }],
  };
  const zonderCorrectie = runAnchored(naVerhoging, snapshots);
  const metCorrectie = runAnchored(
    { ...naVerhoging, balanceOverrides: [{ id: 'o1', monthKey: '2026-02', balance: 30000 }] },
    snapshots,
  );

  check(`${label} · potstand blijft gelijk`,
    metCorrectie.state.potBalances.get('btw') ?? -1,
    zonderCorrectie.state.potBalances.get('btw') ?? -1);
  // De correctie zelf werkt wél door. De app berekent bij de start van februari een
  // banksaldo van 31000 (30000 + 2000 inkomen − 1000 huur, waarvan 900 in de pot); 30000
  // invullen haalt er dus 1000 af, en dat moet tot in de ankermaand doorwerken.
  check(`${label} · correctie werkt door`,
    zonderCorrectie.state.startBalance - metCorrectie.state.startBalance, 1000);
  check(`${label} · bevroren opbouw uit januari`,
    zonderCorrectie.state.potBalances.get('btw') ?? -1,
    (snapshots[0]!.data.reservationPots.find((p) => p.reservationId === 'btw')?.potBalance ?? 0) + 2 * 5000);
}

// ── A9: de ankerstaat houdt de berekende waarde apart van de correctie ─────────
//
// Zonder dat tweede getal vergelijkt het scherm een correctie met zichzelf, leest elke
// bevestiging als "gelijk aan berekend", en verdwijnt de correctie bij het wegklikken.
{
  const label = 'A9 — berekend beginsaldo blijft naast de correctie staan';
  console.log(`\n${label}`);
  const d: Dataset = {
    referenceMonth: '2026-01', referenceBalance: 10000, horizon: 4, anchorAfter: 2,
    incomeItems: inkomen(ALLE_MAANDEN, 2000),
    recurringItems: [HUUR],
    reservations: [{ id: 'btw', label: 'Btw', monthlyAmount: 1400, startMonth: '2026-01', type: 'spaardoel' }],
  };
  const zonder = runAnchored(d, []);
  const met = runAnchored({ ...d, balanceOverrides: [{ id: 'o1', monthKey: '2026-03', balance: 15000 }] }, []);

  check(`${label} · zonder correctie zijn beide gelijk`,
    zonder.state.computedStartBalance, zonder.state.startBalance);
  check(`${label} · correctie stuurt het beginsaldo`, met.state.startBalance, 15000);
  check(`${label} · berekende waarde blijft bewaard`,
    met.state.computedStartBalance, zonder.state.computedStartBalance);
}

console.log(`\n${checks - failures}/${checks} checks geslaagd${failures ? ` — ${failures} FOUT` : ''}`);
process.exit(failures ? 1 : 0);
