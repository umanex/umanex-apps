import { supabase } from '../supabase/client';
import { STORE_VERSION, normalizeData, normalizeSnapshots } from './normalize';
import type { CashflowData, MonthData, MonthKey, MonthSnapshot } from './types';

/**
 * Een andere browser heeft geschreven sinds wij lazen. Bewust een eigen type: dit mag
 * nooit als "opslaan mislukt" behandeld worden, want de data ís opgeslagen — door iemand
 * anders. Overschrijven zou hun wijziging weggooien.
 */
export class RevisionConflictError extends Error {
  constructor() {
    super('De gegevens zijn elders gewijzigd.');
    this.name = 'RevisionConflictError';
  }
}

export type LoadedState = {
  data: CashflowData;
  snapshots: MonthSnapshot[];
  revision: number;
};

type SnapshotRow = {
  month_key: string;
  closed_at: string;
  payload: MonthData;
  reserved: number | string;
  buffer: number | string;
};

function toSnapshot(row: SnapshotRow): MonthSnapshot {
  return {
    monthKey: row.month_key,
    closedAt: row.closed_at,
    data: row.payload,
    // PostgREST kan numeric als string teruggeven; de calculator rekent ermee.
    reserved: Number(row.reserved),
    buffer: Number(row.buffer),
  };
}

function toSnapshotRow(userId: string, snapshot: MonthSnapshot) {
  return {
    user_id: userId,
    month_key: snapshot.monthKey,
    closed_at: snapshot.closedAt,
    payload: snapshot.data,
    reserved: snapshot.reserved,
    buffer: snapshot.buffer,
  };
}

/** Haalt document én snapshots op. `null` betekent: deze gebruiker heeft nog geen document. */
export async function loadState(userId: string): Promise<LoadedState | null> {
  const [stateResult, snapshotResult] = await Promise.all([
    supabase
      .from('cashflow_state')
      .select('data, revision')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('cashflow_snapshots')
      .select('month_key, closed_at, payload, reserved, buffer')
      .eq('user_id', userId)
      .order('month_key', { ascending: true }),
  ]);

  if (stateResult.error) throw stateResult.error;
  if (snapshotResult.error) throw snapshotResult.error;
  if (!stateResult.data) return null;

  const data = normalizeData(stateResult.data.data);
  const rows = (snapshotResult.data ?? []) as SnapshotRow[];
  return {
    data,
    snapshots: normalizeSnapshots(rows.map(toSnapshot), data.historyStartMonth),
    revision: stateResult.data.revision,
  };
}

/** Legt het eerste document aan. Revisie begint op 1. */
export async function createInitialState(
  userId: string,
  data: CashflowData,
): Promise<LoadedState> {
  const { data: row, error } = await supabase
    .from('cashflow_state')
    .insert({ user_id: userId, data, store_version: STORE_VERSION, revision: 1 })
    .select('data, revision')
    .single();

  if (error) throw error;
  return { data: normalizeData(row.data), snapshots: [], revision: row.revision };
}

/**
 * Schrijft het document weg onder de revisie die we gelezen hebben. Matcht de filter geen
 * rij, dan heeft een andere browser ertussen geschreven — dan gooien we in plaats van te
 * overschrijven.
 */
export async function saveState(
  userId: string,
  data: CashflowData,
  expectedRevision: number,
): Promise<number> {
  const nextRevision = expectedRevision + 1;
  const { data: rows, error } = await supabase
    .from('cashflow_state')
    .update({ data, store_version: STORE_VERSION, revision: nextRevision })
    .eq('user_id', userId)
    .eq('revision', expectedRevision)
    .select('revision');

  if (error) throw error;
  if (!rows || rows.length === 0) throw new RevisionConflictError();
  return nextRevision;
}

export async function upsertSnapshot(userId: string, snapshot: MonthSnapshot): Promise<void> {
  const { error } = await supabase
    .from('cashflow_snapshots')
    .upsert(toSnapshotRow(userId, snapshot), { onConflict: 'user_id,month_key' });
  if (error) throw error;
}

export async function deleteSnapshot(userId: string, monthKey: MonthKey): Promise<void> {
  const { error } = await supabase
    .from('cashflow_snapshots')
    .delete()
    .eq('user_id', userId)
    .eq('month_key', monthKey);
  if (error) throw error;
}
