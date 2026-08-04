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
   * Bufferpot: vangt een negatief eindsaldo automatisch op door de storting van die
   * maand te verlagen of om te keren naar een opname. Maximaal één pot tegelijk.
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
  displayContribution: number;
  /** Deze pot is de bufferpot (coversDeficit). */
  isDeficitBuffer: boolean;
  /**
   * De automatisch bepaalde storting van deze maand wanneer de buffer een tekort
   * opvangt — negatief bij een opname, verlaagd-positief wanneer enkel de storting
   * gekort wordt. `null` zodra er niets op te vangen valt (normale storting geldt).
   */
  deficitCoverage: number | null;
  /** Deel van het tekort dat de buffer níét kon dekken omdat de pot leeg raakte. */
  deficitUncovered: number;
}

/**
 * De vijf koppen van de kernformule voor één maand. Berekend in
 * `lib/cashflow/subtotals.ts` en van daaruit zowel doorgerold als getoond.
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
  /** Spaardoelen: storting, plus uitgestelde stortingen die deze maand toekomen. */
  provisions: number;
  /** Som van de vier kostenposten. */
  costs: number;
  /** `incoming − costs` — hetzelfde getal als `MonthData.endBalance`. */
  endBalance: number;
}

export interface MonthData {
  monthKey: MonthKey;
  startBalance: number;
  endBalance: number;
  /** Sectie-subtotalen van deze maand. Enige bron voor kaart én doorrol. */
  subtotals: MonthSubtotals;
  /** Cash-bijbetalingen bovenop een pot, als losse regels voor de uitgavensectie. */
  cashOverflowItems: Array<{ label: string; amount: number }>;
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

export interface CashflowStore {
  referenceBalance: number;
  referenceMonth: MonthKey;
  balanceOverrides: BalanceOverride[];
  anchorMonth: MonthKey;
  expenseItems: ExpenseItem[];
  incomeItems: IncomeItem[];
  recurringItems: RecurringItem[];
  recurringSettlements: RecurringSettlement[];
  reservationSettlements: ReservationSettlement[];
  reservations: ReservationItem[];
  reservationPayments: ReservationPayment[];
  recurringDefers: RecurringDefer[];
  reservationDefers: ReservationDefer[];
  /** Afgesloten maanden. Leidend boven elke herberekening van die maand. */
  monthSnapshots: MonthSnapshot[];
  /**
   * Maanden waarvan de afsluiting bewust opgeheven is. Zonder deze vlag zou de
   * automatische afsluiting ze meteen weer bevriezen.
   */
  reopenedMonths: MonthKey[];

  closeMonth: (snapshot: MonthSnapshot) => void;
  reopenMonth: (monthKey: MonthKey) => void;

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
