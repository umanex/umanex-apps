#!/usr/bin/env node
/**
 * One-off migration: push a localStorage backup into Supabase.
 *
 *   node scripts/seed-supabase.mjs ~/Documents/cashflow-backups/cashflow-store-v3_2026-08-05_arc.json
 *
 * Reads the project URL and key from apps/cashflow/.env.local and asks for the
 * login interactively, so the password never lands in a file or in shell
 * history. CASHFLOW_EMAIL and CASHFLOW_PASSWORD still override the prompts for
 * non-interactive use. Refuses to overwrite an existing document unless --force
 * is given: two browser profiles hold different stores under the same version
 * number, so an accidental second run must not be able to flatten the real one.
 *
 * Deliberately dependency-free — it has to run before pnpm install and without
 * a TypeScript runner.
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// The exact field list of CashflowData (lib/cashflow/types.ts). Anything outside
// it is dropped on purpose: `btwPayments` and `startBalance` still sit in old
// backups but are not part of the store, and the app would drop them on its
// first write anyway. Keeping the two in step avoids a phantom diff.
const DATA_FIELDS = [
  'referenceBalance',
  'referenceMonth',
  'balanceOverrides',
  'expenseItems',
  'incomeItems',
  'recurringItems',
  'recurringSettlements',
  'reservationSettlements',
  'reservations',
  'reservationPayments',
  'recurringDefers',
  'reservationDefers',
  'historyStartMonth',
  'reopenedMonths',
];

const STORE_VERSION = 14;

function loadEnvLocal() {
  const path = resolve(here, '..', '.env.local');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    fail(`Geen .env.local gevonden op ${path}`);
  }
  const env = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

/** Vraagt om invoer. Met `hidden` blijft het getypte onzichtbaar (wachtwoord). */
function ask(query, { hidden = false } = {}) {
  return new Promise((resolvePrompt) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // readline schrijft bij elke toetsaanslag de volledige regel opnieuw; door alleen
      // de vraag door te laten blijft het wachtwoord van het scherm.
      rl._writeToOutput = (str) => {
        if (str.includes(query)) rl.output.write(query);
      };
    }
    rl.question(query, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolvePrompt(answer.trim());
    });
  });
}

async function api(url, options, what) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) fail(`${what} mislukte (HTTP ${response.status}): ${body}`);
  return body ? JSON.parse(body) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const backupPath = args.find((a) => !a.startsWith('--'));
  if (!backupPath) fail('Geef het pad naar het backup-JSON-bestand mee.');

  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) fail('NEXT_PUBLIC_SUPABASE_URL of _ANON_KEY ontbreekt in .env.local');


  // ---- backup inlezen -----------------------------------------------------
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), backupPath), 'utf8'));
  const state = raw.state ?? raw;
  if (raw.version !== undefined && raw.version !== STORE_VERSION) {
    fail(`Backup heeft version ${raw.version}, verwacht ${STORE_VERSION}.`);
  }

  const data = {};
  const missing = [];
  for (const field of DATA_FIELDS) {
    if (state[field] === undefined) missing.push(field);
    else data[field] = state[field];
  }
  if (missing.length) fail(`Backup mist velden: ${missing.join(', ')}`);

  const snapshots = Array.isArray(state.monthSnapshots) ? state.monthSnapshots : [];
  const dropped = Object.keys(state).filter(
    (k) => !DATA_FIELDS.includes(k) && k !== 'monthSnapshots' && k !== 'anchorMonth',
  );

  console.log(`\n  Backup   : ${backupPath}`);
  console.log(`  Saldo    : ${data.referenceBalance} (${data.referenceMonth})`);
  console.log(`  Potten   : ${data.reservations.length}`);
  console.log(`  Betalingen: ${data.reservationPayments.length}`);
  console.log(`  Snapshots: ${snapshots.length}`);
  if (dropped.length) console.log(`  Genegeerd: ${dropped.join(', ')}`);

  // ---- inloggen -----------------------------------------------------------
  // Pas hier vragen: zo zie je eerst wát er geschreven gaat worden, en typ je je
  // wachtwoord niet in voor een backup die de verkeerde blijkt te zijn.
  console.log('');
  const email = process.env.CASHFLOW_EMAIL || (await ask('  E-mail    : '));
  const password = process.env.CASHFLOW_PASSWORD || (await ask('  Wachtwoord: ', { hidden: true }));
  if (!email || !password) fail('E-mail en wachtwoord zijn allebei verplicht.');

  const auth = await api(
    `${url}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    'Inloggen',
  );
  const token = auth.access_token;
  const userId = auth.user.id;
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  console.log(`  Gebruiker: ${auth.user.email} (${userId})`);

  // ---- bestaande stand controleren ---------------------------------------
  const existing = await api(
    `${url}/rest/v1/cashflow_state?user_id=eq.${userId}&select=revision,data`,
    { headers },
    'Bestaande stand ophalen',
  );

  if (existing.length > 0 && !force) {
    const current = existing[0].data ?? {};
    const potten = Array.isArray(current.reservations) ? current.reservations.length : 0;
    fail(
      `Er staat al een document (revisie ${existing[0].revision}, ${potten} potten). ` +
        'Draai opnieuw met --force als je dat bewust wil overschrijven.',
    );
  }

  // ---- wegschrijven -------------------------------------------------------
  if (existing.length > 0) {
    // Bijwerken en de revisie ophogen — niet verwijderen en opnieuw op 1 beginnen.
    // Een openstaand tabblad houdt de oude revisie vast; met een reset naar 1 zou zijn
    // volgende schrijfactie geldig lijken en deze seed meteen overschrijven. Door op te
    // hogen loopt die tab tegen een conflict aan, wat hij ook hoort te doen.
    const nextRevision = existing[0].revision + 1;
    await api(
      `${url}/rest/v1/cashflow_state?user_id=eq.${userId}&revision=eq.${existing[0].revision}`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ data, store_version: STORE_VERSION, revision: nextRevision }),
      },
      'Document bijwerken',
    );
    console.log(`  ✓ cashflow_state bijgewerkt (revisie ${existing[0].revision} → ${nextRevision})`);
  } else {
    await api(
      `${url}/rest/v1/cashflow_state`,
      {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: userId, data, store_version: STORE_VERSION, revision: 1 }),
      },
      'Document wegschrijven',
    );
    console.log('  ✓ cashflow_state aangemaakt (revisie 1)');
  }

  if (snapshots.length > 0) {
    const rows = snapshots
      .filter((s) => s.monthKey >= data.historyStartMonth)
      .map((s) => ({
        user_id: userId,
        month_key: s.monthKey,
        closed_at: s.closedAt,
        payload: s.data,
        reserved: s.reserved,
        buffer: s.buffer,
      }));
    await api(
      `${url}/rest/v1/cashflow_snapshots`,
      {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      },
      'Snapshots wegschrijven',
    );
    console.log(`  ✓ ${rows.length} snapshot(s) geschreven`);
  }

  console.log('\n  Klaar.\n');
}

main().catch((error) => fail(error.stack ?? String(error)));
