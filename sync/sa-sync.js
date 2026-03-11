/**
 * sa-sync.js
 * Pulls one date range from Service Autopilot and upserts into Supabase sa_jobs.
 *
 * Usage:
 *   node sa-sync.js --start 7/1/2025 --end 7/3/2025
 *   node sa-sync.js --start 7/8/2025 --end 7/9/2025
 *   node sa-sync.js --today          (pulls today only)
 *
 * Env vars required (put in sync/.env):
 *   SA_AUTH_COOKIE=92563A92DF3B...
 *   SUPABASE_URL=https://mzywmgesulyalevtzudw.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...   (service role key, not anon)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────────
const SA_BASE    = 'https://my.serviceautopilot.com';
const SA_ENDPOINT = `${SA_BASE}/WebServices/ScheduledWorkWs.asmx/Query`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SA_COOKIE    = process.env.SA_COOKIE;

if (!SUPABASE_URL || !SUPABASE_KEY || !SA_COOKIE) {
  console.error('Missing env vars. Check sync/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Date helpers ──────────────────────────────────────────────────
function parseDateArg(str) {
  // Accepts "7/1/2025" or "2025-07-01"
  const d = new Date(str);
  return { Month: d.getMonth() + 1, Day: d.getDate(), Year: d.getFullYear() };
}

function todayObj() {
  const d = new Date();
  return { Month: d.getMonth() + 1, Day: d.getDate(), Year: d.getFullYear() };
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes('--today')) {
    const t = todayObj();
    return { start: t, end: t, label: `${t.Month}/${t.Day}/${t.Year}` };
  }
  const si = args.indexOf('--start');
  const ei = args.indexOf('--end');
  if (si === -1 || ei === -1) {
    console.error('Usage: node sa-sync.js --start M/D/YYYY --end M/D/YYYY');
    console.error('   or: node sa-sync.js --today');
    process.exit(1);
  }
  const start = parseDateArg(args[si + 1]);
  const end   = parseDateArg(args[ei + 1]);
  return { start, end, label: `${args[si+1]} → ${args[ei+1]}` };
}

// ── SA API call ───────────────────────────────────────────────────
async function fetchSAJobs(start, end) {
  const payload = {
    QueryData: JSON.stringify({
      ResourceID: 1,
      StartDate: start,
      EndDate:   end,
      IncludeCompleted: true,
      IncludeSkipped:   true,
      IncludeOpen:      true,
    })
  };

  console.log(`Calling SA API for ${start.Month}/${start.Day}/${start.Year} → ${end.Month}/${end.Day}/${end.Year}...`);

  const res = await fetch(SA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': process.env.SA_COOKIE,
      'Referer': `${SA_BASE}/DispatchBoard.aspx?type=db`,
      'Origin': SA_BASE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('SA response headers:', Object.fromEntries(res.headers.entries()));
    console.error('SA error body (first 1000):', errBody.substring(0, 1000));
    throw new Error(`SA API returned ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  // SA wraps response in { d: [...] }
  if (!json.d) throw new Error('Unexpected SA response shape — missing .d');
  const jobs = Array.isArray(json.d) ? json.d : JSON.parse(json.d);
  console.log(`  ✓ SA returned ${jobs.length} jobs`);
  return jobs;
}

// ── Map SA fields → Supabase columns ─────────────────────────────
function saJobToRow(j, syncLogId) {
  const saDateToISO = (d) => {
    if (!d || typeof d !== 'object') return null;
    try { return new Date(d.Year, d.Month - 1, d.Day).toISOString().split('T')[0]; }
    catch { return null; }
  };

  const saTimeToStr = (t) => {
    if (!t || typeof t !== 'object') return null;
    try {
      const h = String(t.Hour ?? 0).padStart(2,'0');
      const m = String(t.Minute ?? 0).padStart(2,'0');
      return `${h}:${m}`;
    } catch { return null; }
  };

  const comments = (j.JobComments || []).map(c => ({
    comment_id:  c.CommentID,
    username:    c.UserName,
    comment:     c.Comment,
    timestamp:   saDateToISO(c.DateTimeSeconds),
  }));

  return {
    id:                        j.ID,
    customer_id:               j.CustomerID,
    client:                    j.Client,
    address:                   j.Address,
    city:                      j.City,
    state:                     j.State,
    zip:                       j.Zip,
    service:                   j.Service,
    service_category:          j.CategoryName || null,
    start_date:                saDateToISO(j.StartDate),
    end_date:                  saDateToISO(j.EndDate),
    start_time:                saTimeToStr(j.StartTime),
    end_time:                  saTimeToStr(j.EndTime),
    assigned:                  j.ResourceName || j.Assigned || null,
    assigned_resource_ids:     (j.AssignedResourceIDs || []).join(';'),
    status:                    j.Status,
    amount:                    j.Amount || 0,
    rate:                      j.Rate || 0,
    hours:                     j.Hours || 0,
    budgeted_hours:            j.BudgetedHours || 0,
    total_man_hours:           j.TotalManHours || 0,
    number_of_men:             j.NumberOfMen || 1,
    actual_number_of_men:      j.ActualNumberOfMen || null,
    is_rescheduled:            j.IsRescheduled || false,
    is_hourly:                 j.IsHourly || false,
    invoice_id:                j.InvoiceID || null,
    is_invoice_locked:         j.IsInvoiceLocked || false,
    date_completed:            saDateToISO(j.DateCompleted),
    completed_username:        j.CompletedUsername || null,
    internal_scheduling_notes: j.InternalSchedulingNotes || null,
    client_notes:              j.ClientNotes || null,
    job_comments:              comments,
    job_comments_count:        comments.length,
    actual_mileage:            j.ActualMileage || null,
    sales_rep:                 j.SalesRep || null,
    account_balance:           j.AccountBalance || null,
    project_id:                j.ProjectID || null,
    project_number:            j.ProjectNumber || null,
    variance:                  j.Variance || null,
    remaining_budgeted_hours:  j.RemainingBudgetedHours || null,
    mobile_photos_exist:       j.MobilePhotosExist || false,
    last_synced_at:            new Date().toISOString(),
    sync_log_id:               syncLogId,
  };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const { start, end, label } = parseArgs();

  // 1. Create sync log entry
  const { data: logEntry, error: logErr } = await supabase
    .from('sa_sync_log')
    .insert({ triggered_by: 'manual', range_start: `${start.Year}-${String(start.Month).padStart(2,'0')}-${String(start.Day).padStart(2,'0')}`, range_end: `${end.Year}-${String(end.Month).padStart(2,'0')}-${String(end.Day).padStart(2,'0')}`, status: 'success' })
    .select()
    .single();

  if (logErr) { console.error('Failed to create sync log:', logErr); process.exit(1); }
  const syncLogId = logEntry.id;
  console.log(`Sync log created: ${syncLogId}`);

  try {
    // 2. Fetch from SA
    const jobs = await fetchSAJobs(start, end);

    // 3. Map and upsert
    const rows = jobs.map(j => saJobToRow(j, syncLogId));
    console.log(`Upserting ${rows.length} rows into sa_jobs...`);

    const { error: upsertErr } = await supabase
      .from('sa_jobs')
      .upsert(rows, { onConflict: 'id' });

    if (upsertErr) throw upsertErr;
    console.log(`  ✓ Upserted ${rows.length} jobs`);

    // 4. Append snapshots
    const snapshots = rows.map(r => ({ ...r, id: undefined, job_id: r.id, snapped_at: new Date().toISOString() }));
    const { error: snapErr } = await supabase.from('sa_job_snapshots').insert(snapshots);
    if (snapErr) console.warn('Snapshot insert warning:', snapErr.message);
    else console.log(`  ✓ Appended ${snapshots.length} snapshots`);

    // 5. Update sync log — success
    await supabase.from('sa_sync_log').update({ status: 'success', jobs_upserted: rows.length, jobs_returned: rows.length }).eq('id', syncLogId);
    console.log(`\n✅ Sync complete — ${label} — ${rows.length} jobs`);

  } catch (err) {
    console.error('Sync failed:', err.message);
    await supabase.from('sa_sync_log').update({ status: 'error', error_message: err.message }).eq('id', syncLogId);
    process.exit(1);
  }
}

main();
