-- ============================================================
-- Audit Matching Engine — QBO ↔ SA reconciliation tables
-- Applied: 2026-05-20
-- ============================================================

-- ── Audit run log ─────────────────────────────────────────────
-- One row per weekly audit run. Tracks issue counts.
create table if not exists audit_runs (
  id              uuid primary key default uuid_generate_v4(),
  run_at          timestamptz not null default now(),
  status          text not null default 'running',  -- running | complete | error
  issues_found    int,
  issues_new      int,
  issues_resolved int,
  error_message   text
);

-- ── Persistent issue tally ────────────────────────────────────
-- One row per logical issue. Fingerprint prevents duplicates.
-- Issues auto-resolve when the underlying condition clears.
create table if not exists audit_issues (
  id              uuid primary key default uuid_generate_v4(),

  -- Stable dedup key — same logical issue = same fingerprint every run
  fingerprint     text unique not null,

  -- Classification
  issue_type      text not null,
  -- amount_mismatch   — SA 90-day completed total vs QBO invoiced total per customer
  -- unbilled_complete — SA job complete but no invoice reference
  -- overdue_invoice   — QBO invoice past due > 30 days
  -- nonzero_balance   — SA client with non-zero account balance
  severity        text not null default 'medium',  -- high | medium | low

  -- SA context (nullable — not all checks have SA data)
  sa_job_id       uuid,
  sa_client       text,
  sa_amount       numeric(10,2),
  sa_invoice_id   uuid,
  sa_date_completed date,

  -- QBO context (nullable — not all checks have QBO data)
  qbo_invoice_id  text,
  qbo_customer_name text,
  qbo_amount      numeric(10,2),
  qbo_balance     numeric(10,2),
  qbo_due_date    date,

  -- Human-readable description
  description     text not null,

  -- Lifecycle
  status          text not null default 'open',  -- open | resolved
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  resolved_at     timestamptz,

  -- Which audit run last touched this issue
  last_audit_run_id uuid references audit_runs(id)
);

create index if not exists audit_issues_status     on audit_issues (status);
create index if not exists audit_issues_type       on audit_issues (issue_type);
create index if not exists audit_issues_run        on audit_issues (last_audit_run_id);
create index if not exists audit_issues_first_seen on audit_issues (first_seen_at);

-- ── Row-level security ─────────────────────────────────────────
alter table audit_runs   enable row level security;
alter table audit_issues enable row level security;

create policy "service role full access audit_runs"
  on audit_runs for all to service_role using (true) with check (true);

create policy "authenticated read audit_runs"
  on audit_runs for select to authenticated using (true);

create policy "service role full access audit_issues"
  on audit_issues for all to service_role using (true) with check (true);

create policy "authenticated read audit_issues"
  on audit_issues for select to authenticated using (true);
