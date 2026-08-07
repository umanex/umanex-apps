export type MonthKey = string;

export interface IncomeItem {
  id: string;
  monthKey: MonthKey;
  label: string;
  amount: number;
  received: boolean;
}

export interface ExpenseItem {
  id: string;
  monthKey: MonthKey;
  label: string;
  amount: number;
  paid: boolean;
}

export interface RecurringItem {
  id: string;
  label: string;
  amount: number;
  type: 'expense';
  frequency: 'monthly' | 'yearly';
  startMonth: MonthKey;
}

export interface RecurringDefer {
  id: string;
  recurringId: string;
  fromMonth: MonthKey;
  toMonth: MonthKey;
  paid?: boolean;
  paidAmount?: number;
}

export interface ReservationDefer {
  id: string;
  reservationId: string;
  fromMonth: MonthKey;
  toMonth: MonthKey;
}

export interface ReservationSettlement {
  id: string;
  reservationId: string;
  monthKey: MonthKey;
  effectiveAmount: number;
  finalized: boolean;
}

export interface RecurringSettlement {
  id: string;
  recurringId: string;
  monthKey: MonthKey;
  paid: boolean;
  actualAmount: number;
}

export type ReservationPotType = 'spaardoel' | 'maandelijks_budget';

export interface ReservationItem {
  id: string;
  label: string;
  monthlyAmount: number;
  startMonth: MonthKey;
  type: ReservationPotType;
  /**
   * Bufferpot: neemt elke maand automatisch het vrije saldo op en keert om naar een
   * opname zodra de maand een tekort geeft. `monthlyAmount` speelt voor deze pot geen
   * rol meer — de storting is volledig afgeleid. Maximaal één pot tegelijk.
   */
  coversDeficit?: boolean;
}

export interface ReservationPayment {
  id: string;
  reservationId: string;
  monthKey: MonthKey;
  label: string;
  invoiceAmount: number;
  fromReservation: number;
  fromCash: number;
}


export interface ReservationPotBalance {
  reservationId: string;
  label: string;
  monthlyAmount: number;
  effectiveAmount: number;
  hasSettlement: boolean;
  finalized: boolean;
  potBalance: number;
  paymentsThisMonth: ReservationPayment[];
  provisionThisMonth: number;
  deferredFromPrevious: number;
  potType: ReservationPotType;
  releasedThisMonth: number;
  /** Deze pot is de bufferpot (coversDeficit). */
  isDeficitBuffer: boolean;
  /**
   * De automatisch bepaalde beweging van de bufferpot deze maand: positief wanneer het
   * vrije saldo naar de pot gaat, negatief bij een opname die een tekort dekt. Altijd
   * afgeleid — het maandbedrag van de pot speelt geen rol meer. `null` voor elke pot die
   * geen buffer is, en voor een bufferpot die deze maand niet aangerekend wordt.
   */
  autoContribution: number | null;
  /** Deel van het tekort dat de buffer níét kon dekken omdat de pot leeg raakte. */
  deficitUncovered: number;
}

/**
 * De koppen van de kernformule voor één maand. Berekend in `lib/cashflow/subtotals.ts`
 * en van daaruit zowel doorgerold als getoond.
 */
export interface MonthSubtotals {
  /** Beginsaldo + inkomsten van deze maand. */
  incoming: number;
  /** Vaste uitgaven, inclusief uitgestelde die deze maand toekomen. */
  recurring: number;
  /** Eenmalige uitgaven, inclusief cash-bijbetalingen bovenop een pot. */
  oneOff: number;
  /** Maandelijkse budgetten: storting − wat er deze maand uit betaald is. */
  budgets: number;
  /**
   * Spaardoelen: storting, plus uitgestelde stortingen die deze maand toekomen.
   * Zónder de bufferpot — die staat apart in `buffer`, omdat hij niet als ledgerregel
   * getoond wordt maar in de footer.
   */
  provisions: number;
  /**
   * De bufferpot als kostenkop: wat er deze maand van het vrije saldo naar de pot gaat
   * (positief) of eruit komt (negatief). Nul zonder bufferpot. Zit wél in `costs`, zodat
   * de doorrol ongewijzigd blijft, maar niet in `provisions`, zodat de zichtbare
   * secties het maandresultaat vóór buffer tonen.
   */
  buffer: number;
  /** Som van alle kostenposten, buffer inbegrepen. */
  costs: number;
  /**
   * `incoming − costs` — hetzelfde getal als `MonthData.endBalance`, en het vrije saldo
   * dat doorrolt. Met een actieve buffer is dat €0, of negatief zodra de pot leeg is.
   */
  endBalance: number;
}

export interface MonthData {
  monthKey: MonthKey;
  startBalance: number;
  endBalance: number;
  /** Sectie-subtotalen van deze maand. Enige bron voor kaart én doorrol. */
  subtotals: MonthSubtotals;
  /**
   * Cash-bijbetalingen bovenop een pot, als losse regels voor de uitgavensectie.
   *
   * `paid` zegt of het bedrag al van het banksaldo af is en dus níet in `subtotals.oneOff`
   * meetelt. Zonder die vlag toont de sectie regels die niet optellen tot haar eigen kop.
   */
  cashOverflowItems: Array<{ label: string; amount: number; paid: boolean }>;
  totalIncome: number;
  totalRecurring: number;
  totalReservationDeductions: number;
  totalReservationCashPayments: number;
  availableBudget: number;
  totalOutstandingCosts: number;
  incomeItems: IncomeItem[];
  recurringItems: RecurringItem[];
  recurringSettlements: RecurringSettlement[];
  reservationSettlements: ReservationSettlement[];
  reservationPots: ReservationPotBalance[];
  reservationPayments: ReservationPayment[];
  deferredRecurringAmount: number;
  deferredItems: Array<{
    deferId: string;
    recurringId: string;
    label: string;
    amount: number;
    fromMonth: MonthKey;
    paid: boolean;
    paidAmount: number;
  }>;
  expenseItems: ExpenseItem[];
  totalExpenses: number;
  deferredReservationAmount: number;
  deferredReservationItems: Array<{
    deferId: string;
    reservationId: string;
    label: string;
    amount: number;
    fromMonth: MonthKey;
  }>;
}

/**
 * Een afgesloten maand, bevroren. `data` is de volledige doorrekening zoals ze op het
 * moment van afsluiten was — nooit opnieuw afgeleid uit actuele stamdata.
 */
export interface MonthSnapshot {
  monthKey: MonthKey;
  /** ISO-tijdstip van afsluiten. */
  closedAt: string;
  data: MonthData;
  /** Provisies die op dat moment gereserveerd stonden, buffer niet meegeteld. */
  reserved: number;
  /** Stand van de bufferpot op dat moment. */
  buffer: number;
}

export interface BalanceOverride {
  id: string;
  monthKey: MonthKey;
  balance: number;
}

/**
 * Precies wat er in `cashflow_state.data` belandt — niets meer, niets minder.
 *
 * Bewust een eigen type in plaats van "de store minus de acties": twee velden horen er
 * níét in. `anchorMonth` is sessie-gebonden en `monthSnapshots` heeft een eigen tabel,
 * omdat afgesloten maanden onveranderlijk zijn en elke maand aangroeien — die horen niet
 * bij elke gewone schrijfactie mee herschreven te worden.
 */
export interface CashflowData {
  referenceBalance: number;
  referenceMonth: MonthKey;
  balanceOverrides: BalanceOverride[];
  expenseItems: ExpenseItem[];
  incomeItems: IncomeItem[];
  recurringItems: RecurringItem[];
  recurringSettlements: RecurringSettlement[];
  reservationSettlements: ReservationSettlement[];
  reservations: ReservationItem[];
  reservationPayments: ReservationPayment[];
  recurringDefers: RecurringDefer[];
  reservationDefers: ReservationDefer[];
  /**
   * Eerste maand waarvoor historie opgebouwd mag worden. Alles daarvóór is nooit door de
   * app waargenomen en zou dus een herberekening zijn, geen historie — daar wordt niet
   * naar terug genavigeerd en niets van afgesloten.
   */
  historyStartMonth: MonthKey;
  /**
   * Maanden waarvan de afsluiting bewust opgeheven is. Zonder deze vlag zou de
   * automatische afsluiting ze meteen weer bevriezen.
   */
  reopenedMonths: MonthKey[];
  /**
   * Laatste maand waarin de app open stond. De automatische afsluiting bevriest alleen
   * een maand die je ook echt gezien hebt — anders legt ze een reconstructie vast als
   * historie, precies wat een snapshot moet voorkomen.
   */
  lastSeenMonth: MonthKey;
}

export interface CashflowStore extends CashflowData {
  /** Waar het venster van drie maanden begint. Nooit opgeslagen — altijd de huidige maand. */
  anchorMonth: MonthKey;
  /**
   * Afgesloten maanden. Leidend boven elke herberekening van die maand. Staat in de store
   * omdat de calculator ze nodig heeft, maar wordt naar `cashflow_snapshots` gesynct.
   */
  monthSnapshots: MonthSnapshot[];

  /**
   * Zet de volledige stand zoals ze uit de database komt. Enige weg naar binnen bij het
   * laden — losse setters zouden elk een schrijfactie terug naar de database uitlokken.
   */
  hydrate: (data: CashflowData, snapshots: MonthSnapshot[]) => void;

  closeMonth: (snapshot: MonthSnapshot) => void;
  reopenMonth: (monthKey: MonthKey) => void;
  /** Legt vast dat de app in deze maand open stond. Schuift alleen vooruit. */
  markMonthSeen: (monthKey: MonthKey) => void;

  setReferenceBalance: (balance: number, month: MonthKey) => void;
  upsertBalanceOverride: (monthKey: MonthKey, balance: number) => void;
  removeBalanceOverride: (monthKey: MonthKey) => void;
  setAnchorMonth: (month: MonthKey) => void;

  addIncomeItem: (item: IncomeItem) => void;
  updateIncomeItem: (id: string, patch: Partial<IncomeItem>) => void;
  removeIncomeItem: (id: string) => void;

  addRecurringItem: (item: RecurringItem) => void;
  updateRecurringItem: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurringItem: (id: string) => void;

  addReservation: (item: ReservationItem) => void;
  updateReservation: (id: string, patch: Partial<ReservationItem>) => void;
  removeReservation: (id: string) => void;
  setDeficitBuffer: (id: string, enabled: boolean) => void;

  addReservationPayment: (payment: ReservationPayment) => void;
  updateReservationPayment: (id: string, patch: Partial<ReservationPayment>) => void;
  removeReservationPayment: (id: string) => void;

  addExpenseItem: (item: ExpenseItem) => void;
  updateExpenseItem: (id: string, patch: Partial<ExpenseItem>) => void;
  removeExpenseItem: (id: string) => void;

  addRecurringDefer: (defer: RecurringDefer) => void;
  removeRecurringDefer: (id: string) => void;
  settleRecurringDefer: (id: string, paid: boolean, paidAmount: number) => void;

  addReservationDefer: (defer: ReservationDefer) => void;
  removeReservationDefer: (id: string) => void;

  upsertReservationSettlement: (
    reservationId: string,
    monthKey: MonthKey,
    effectiveAmount: number,
  ) => void;
  removeReservationSettlement: (reservationId: string, monthKey: MonthKey) => void;

  finalizeReservation: (
    reservationId: string,
    monthKey: MonthKey,
    effectiveAmount: number,
  ) => void;

  upsertRecurringSettlement: (
    recurringId: string,
    monthKey: MonthKey,
    paid: boolean,
    actualAmount: number,
  ) => void;
  removeRecurringSettlement: (recurringId: string, monthKey: MonthKey) => void;
}
