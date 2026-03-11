-- ============================================================
-- FieldOps — Supabase Schema
-- Service Autopilot job data + sync infrastructure
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Sync log ─────────────────────────────────────────────────
-- Every time we pull from SA, we record it here.
-- This lets us answer "what did the backlog look like on July 3rd?"
create table if not exists sa_sync_log (
  id              uuid primary key default uuid_generate_v4(),
  synced_at       timestamptz not null default now(),
  range_start     date not null,
  range_end       date not null,
  jobs_returned   int,
  jobs_upserted   int,
  status          text not null default 'success',  -- success | error
  error_message   text,
  triggered_by    text  -- 'schedule' | 'manual' | 'user:<id>'
);

-- ── Core jobs table ───────────────────────────────────────────
-- One row per SA job ID. Upserted on every sync.
-- Append-only history is handled by sa_job_snapshots below.
create table if not exists sa_jobs (
  -- SA identifiers
  id                      uuid primary key,   -- SA job ID (ScheduledItem.ID)
  customer_id             uuid,               -- SA CustomerID
  invoice_id              uuid,

  -- Who & what
  client                  text not null,
  address                 text,
  city                    text,
  state                   text,
  zip                     text,
  service                 text,               -- MOW, App3, BEDM, etc.
  assigned                text,               -- Crew display name
  assigned_resource_id    uuid,
  sales_rep               text,
  category_name           text,

  -- When
  start_date              date,
  end_date                date,
  start_time              text,               -- SA returns "9:00 AM" strings
  end_time                text,
  date_completed          date,
  completed_username      text,

  -- Status
  status                  smallint,           -- 1=Open, 3=Complete, 5=Skipped
  sub_status              text,
  priority                smallint,
  is_rescheduled          boolean default false,
  is_invoice_locked       boolean default false,
  schedule_type           text,               -- Recurring | OneTime

  -- Financials
  amount                  numeric(10,2),
  rate                    numeric(10,2),
  minimum_amount          numeric(10,2),
  is_hourly               boolean default false,
  account_balance         numeric(10,2),

  -- Labor / time
  budgeted_hours          numeric(8,2),
  hours                   numeric(8,2),       -- Actual hours (single tech)
  total_man_hours         numeric(8,2),       -- hours × number_of_men
  number_of_men           smallint,
  actual_number_of_men    smallint,
  quantity                numeric(8,2),
  variance                numeric(8,2),       -- actual - budgeted
  remaining_budgeted_hours numeric(8,2),

  -- Location
  latitude                double precision,
  longitude               double precision,
  actual_mileage          numeric(8,2),

  -- Notes & flags
  internal_scheduling_notes text,
  client_notes              text,
  appointment_notes         text,
  has_route_sheet_notes     boolean default false,
  has_comments              boolean default false,
  mobile_photos_exist       boolean default false,

  -- Job comments (flattened from nested array)
  -- Stored as JSONB so we keep full structure without extra table for now
  job_comments            jsonb default '[]',

  -- Grouping / project
  group_id                uuid,
  group_name              text,
  project_id              uuid,
  project_number          text,

  -- Sync metadata
  first_seen_at           timestamptz not null default now(),
  last_synced_at          timestamptz not null default now(),
  sync_log_id             uuid references sa_sync_log(id)
);

-- Indexes for common query patterns
create index if not exists sa_jobs_start_date      on sa_jobs (start_date);
create index if not exists sa_jobs_assigned        on sa_jobs (assigned);
create index if not exists sa_jobs_status          on sa_jobs (status);
create index if not exists sa_jobs_service         on sa_jobs (service);
create index if not exists sa_jobs_customer_id     on sa_jobs (customer_id);
create index if not exists sa_jobs_last_synced     on sa_jobs (last_synced_at);

-- ── Historical snapshots ──────────────────────────────────────
-- Every sync appends a lightweight snapshot of each job's key
-- metrics at that point in time. Powers historical KPI queries.
create table if not exists sa_job_snapshots (
  id              bigserial primary key,
  job_id          uuid not null references sa_jobs(id) on delete cascade,
  sync_log_id     uuid not null references sa_sync_log(id),
  snapped_at      timestamptz not null default now(),

  -- The fields that change over time and matter for KPIs
  status          smallint,
  amount          numeric(10,2),
  total_man_hours numeric(8,2),
  budgeted_hours  numeric(8,2),
  variance        numeric(8,2),
  assigned        text,
  date_completed  date,
  is_rescheduled  boolean,
  has_comments    boolean,
  job_comments    jsonb
);

create index if not exists sa_snapshots_job_id    on sa_job_snapshots (job_id);
create index if not exists sa_snapshots_snapped   on sa_job_snapshots (snapped_at);
create index if not exists sa_snapshots_sync_log  on sa_job_snapshots (sync_log_id);

-- ── KPI views ─────────────────────────────────────────────────

-- Daily crew performance (based on latest job data)
create or replace view v_crew_daily_kpis as
select
  start_date,
  assigned                                                as crew,
  count(*)                                                as total_jobs,
  count(*) filter (where status = 3)                     as completed,
  count(*) filter (where status = 5)                     as skipped,
  count(*) filter (where status = 1)                     as open,
  round(sum(amount)::numeric, 2)                         as revenue,
  round(sum(total_man_hours)::numeric, 2)                as man_hours,
  round(
    case when sum(total_man_hours) > 0
    then sum(amount) / sum(total_man_hours)
    else 0 end
  ::numeric, 2)                                          as revenue_per_hour,
  round(
    100.0 * count(*) filter (where status = 3) / count(*)
  ::numeric, 1)                                          as completion_pct
from sa_jobs
where start_date is not null
  and assigned is not null
group by start_date, assigned;

-- Weekly crew summary
create or replace view v_crew_weekly_kpis as
select
  date_trunc('week', start_date)::date                   as week_start,
  assigned                                               as crew,
  count(*)                                               as total_jobs,
  count(*) filter (where status = 3)                     as completed,
  count(*) filter (where status = 5)                     as skipped,
  round(sum(amount)::numeric, 2)                         as revenue,
  round(sum(total_man_hours)::numeric, 2)                as man_hours,
  round(
    case when sum(total_man_hours) > 0
    then sum(amount) / sum(total_man_hours)
    else 0 end
  ::numeric, 2)                                          as revenue_per_hour,
  round(
    100.0 * count(*) filter (where status = 3) / count(*)
  ::numeric, 1)                                          as completion_pct
from sa_jobs
where start_date is not null
  and assigned is not null
group by date_trunc('week', start_date), assigned;

-- Skipped jobs needing follow-up
create or replace view v_skipped_jobs as
select
  id,
  client,
  address,
  city,
  service,
  assigned,
  start_date,
  amount,
  job_comments,
  internal_scheduling_notes,
  last_synced_at
from sa_jobs
where status = 5
order by start_date desc;

-- ── Row-level security ────────────────────────────────────────
alter table sa_jobs          enable row level security;
alter table sa_job_snapshots enable row level security;
alter table sa_sync_log      enable row level security;

-- Service role (backend sync function) has full access
-- Authenticated users (dashboard) can read only
create policy "authenticated read sa_jobs"
  on sa_jobs for select
  to authenticated
  using (true);

create policy "authenticated read sa_job_snapshots"
  on sa_job_snapshots for select
  to authenticated
  using (true);

create policy "authenticated read sa_sync_log"
  on sa_sync_log for select
  to authenticated
  using (true);

-- ============================================================
-- Upsert function — called by the sync edge function
-- Inserts or updates sa_jobs, then appends a snapshot row
-- ============================================================
create or replace function upsert_sa_job(job jsonb, p_sync_log_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_job_id uuid := (job->>'ID')::uuid;
begin
  insert into sa_jobs (
    id, customer_id, invoice_id,
    client, address, city, state, zip,
    service, assigned, assigned_resource_id, sales_rep, category_name,
    start_date, end_date, start_time, end_time,
    date_completed, completed_username,
    status, sub_status, priority, is_rescheduled, is_invoice_locked, schedule_type,
    amount, rate, minimum_amount, is_hourly, account_balance,
    budgeted_hours, hours, total_man_hours, number_of_men, actual_number_of_men,
    quantity, variance, remaining_budgeted_hours,
    latitude, longitude, actual_mileage,
    internal_scheduling_notes, client_notes, appointment_notes,
    has_route_sheet_notes, has_comments, mobile_photos_exist,
    job_comments,
    group_id, group_name, project_id, project_number,
    first_seen_at, last_synced_at, sync_log_id
  ) values (
    v_job_id,
    nullif(job->>'CustomerID','')::uuid,
    nullif(job->>'InvoiceID','00000000-0000-0000-0000-000000000000')::uuid,
    job->>'Client', job->>'Address', job->>'City', job->>'State', job->>'Zip',
    job->>'Service', job->>'Assigned',
    nullif(job->>'AssignedResourceID','00000000-0000-0000-0000-000000000000')::uuid,
    job->>'SalesRep', job->>'CategoryName',
    nullif(job->>'StartDate','')::date, nullif(job->>'EndDate','')::date,
    job->>'StartTime', job->>'EndTime',
    nullif(job->>'DateCompleted','')::date, job->>'CompletedUsername',
    (job->>'Status')::smallint, job->>'SubStatus', (job->>'Priority')::smallint,
    (job->>'IsRescheduled')::boolean, (job->>'IsInvoiceLocked')::boolean,
    job->>'ScheduleType',
    (job->>'Amount')::numeric, (job->>'Rate')::numeric,
    (job->>'MinimumAmount')::numeric, (job->>'IsHourly')::boolean,
    (job->>'AccountBalance')::numeric,
    (job->>'BudgetedHours')::numeric, (job->>'Hours')::numeric,
    (job->>'TotalManHours')::numeric, (job->>'NumberOfMen')::smallint,
    (job->>'ActualNumberOfMen')::smallint,
    (job->>'Quantity')::numeric, (job->>'Variance')::numeric,
    (job->>'RemainingBudgetedHours')::numeric,
    (job->>'Latitude')::double precision, (job->>'Longitude')::double precision,
    (job->>'ActualMileage')::numeric,
    job->>'InternalSchedulingNotes', job->>'ClientNotes', job->>'AppointmentNotes',
    (job->>'HasRouteSheetNotes')::boolean, (job->>'HasComments')::boolean,
    (job->>'MobilePhotosExist')::boolean,
    coalesce((job->'JobComments')::jsonb, '[]'),
    nullif(job->>'GroupID','00000000-0000-0000-0000-000000000000')::uuid,
    job->>'GroupName',
    nullif(job->>'ProjectID','00000000-0000-0000-0000-000000000000')::uuid,
    job->>'ProjectNumber',
    now(), now(), p_sync_log_id
  )
  on conflict (id) do update set
    status                    = excluded.status,
    sub_status                = excluded.sub_status,
    assigned                  = excluded.assigned,
    assigned_resource_id      = excluded.assigned_resource_id,
    start_date                = excluded.start_date,
    end_date                  = excluded.end_date,
    start_time                = excluded.start_time,
    end_time                  = excluded.end_time,
    date_completed            = excluded.date_completed,
    completed_username        = excluded.completed_username,
    amount                    = excluded.amount,
    budgeted_hours            = excluded.budgeted_hours,
    hours                     = excluded.hours,
    total_man_hours           = excluded.total_man_hours,
    number_of_men             = excluded.number_of_men,
    actual_number_of_men      = excluded.actual_number_of_men,
    variance                  = excluded.variance,
    remaining_budgeted_hours  = excluded.remaining_budgeted_hours,
    actual_mileage            = excluded.actual_mileage,
    is_rescheduled            = excluded.is_rescheduled,
    is_invoice_locked         = excluded.is_invoice_locked,
    has_comments              = excluded.has_comments,
    mobile_photos_exist       = excluded.mobile_photos_exist,
    job_comments              = excluded.job_comments,
    internal_scheduling_notes = excluded.internal_scheduling_notes,
    client_notes              = excluded.client_notes,
    appointment_notes         = excluded.appointment_notes,
    last_synced_at            = now(),
    sync_log_id               = p_sync_log_id;

  -- Always append a snapshot for historical KPI tracking
  insert into sa_job_snapshots (
    job_id, sync_log_id, snapped_at,
    status, amount, total_man_hours, budgeted_hours,
    variance, assigned, date_completed, is_rescheduled,
    has_comments, job_comments
  ) values (
    v_job_id, p_sync_log_id, now(),
    (job->>'Status')::smallint,
    (job->>'Amount')::numeric,
    (job->>'TotalManHours')::numeric,
    (job->>'BudgetedHours')::numeric,
    (job->>'Variance')::numeric,
    job->>'Assigned',
    nullif(job->>'DateCompleted','')::date,
    (job->>'IsRescheduled')::boolean,
    (job->>'HasComments')::boolean,
    coalesce((job->'JobComments')::jsonb, '[]')
  );
end;
$$;
