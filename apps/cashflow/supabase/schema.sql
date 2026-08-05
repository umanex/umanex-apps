-- Cashflow — initial schema
--
-- Two tables. `cashflow_state` holds the live store as a single jsonb document,
-- one row per user. `cashflow_snapshots` holds closed months as one row each:
-- they are immutable once written and grow every month, so keeping them out of
-- the hot document keeps every ordinary write small.
--
-- The calculator runs entirely client-side (lib/cashflow/calculator.ts), so the
-- database stores and authorises — it never computes.

-- ---------------------------------------------------------------------------
-- Live store
-- ---------------------------------------------------------------------------

create table public.cashflow_state (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  -- The Zustand state object itself, not the persist envelope. Unknown keys are
  -- preserved as-is: `btwPayments` and `startBalance` ride along from older
  -- versions without being declared in CashflowStore.
  data          jsonb   not null,
  -- Mirrors STORE_VERSION in store/cashflow.ts. A column rather than a key
  -- inside `data` so a stale client is visible without parsing the document.
  store_version integer not null,
  -- Optimistic concurrency. A write must name the revision it read; the update
  -- matches zero rows when another browser got there first.
  revision      integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Reject a write that does not advance the revision by exactly one, so a client
-- that forgets the guard cannot silently overwrite a newer document.
create function public.cashflow_state_guard()
returns trigger
language plpgsql
as $$
begin
  if new.revision <> old.revision + 1 then
    raise exception
      'revision must advance by exactly 1 (was %, got %)', old.revision, new.revision
      using errcode = '40001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger cashflow_state_guard
  before update on public.cashflow_state
  for each row execute function public.cashflow_state_guard();

-- ---------------------------------------------------------------------------
-- Closed months
-- ---------------------------------------------------------------------------

create table public.cashflow_snapshots (
  user_id   uuid not null references auth.users (id) on delete cascade,
  -- yyyy-MM, matching MonthKey.
  month_key text not null check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  closed_at timestamptz not null,
  -- The frozen MonthData for this month, exactly as calculated at closing time.
  payload   jsonb   not null,
  -- Kept as columns rather than inside the payload: the analysis page reads
  -- these two directly, and they are the numbers worth querying over time.
  reserved  numeric not null,
  buffer    numeric not null,
  primary key (user_id, month_key)
);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Every policy is scoped to auth.uid(). Without a session the anon key reaches
-- nothing — which is what makes the app safe to expose to the public internet
-- while holding real financial data.
-- ---------------------------------------------------------------------------

alter table public.cashflow_state     enable row level security;
alter table public.cashflow_snapshots enable row level security;

create policy "own state: select" on public.cashflow_state
  for select using (auth.uid() = user_id);
create policy "own state: insert" on public.cashflow_state
  for insert with check (auth.uid() = user_id);
create policy "own state: update" on public.cashflow_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own state: delete" on public.cashflow_state
  for delete using (auth.uid() = user_id);

create policy "own snapshots: select" on public.cashflow_snapshots
  for select using (auth.uid() = user_id);
create policy "own snapshots: insert" on public.cashflow_snapshots
  for insert with check (auth.uid() = user_id);
create policy "own snapshots: update" on public.cashflow_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Reopening a month deletes its snapshot (store/cashflow.ts:57).
create policy "own snapshots: delete" on public.cashflow_snapshots
  for delete using (auth.uid() = user_id);
