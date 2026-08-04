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

export interface MonthData {
  monthKey: MonthKey;
  startBalance: number;
  endBalance: number;
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
