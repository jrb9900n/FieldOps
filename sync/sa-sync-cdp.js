/**
 * FieldOps SA → Supabase Sync via Chrome DevTools Protocol
 * 
 * Connects to an already-running Chrome with --remote-debugging-port=9222,
 * finds (or opens) the SA Dispatch Board tab, sets the date range by
 * intercepting SA's native $.ajax Query call, and upserts results to Supabase.
 *
 * Usage:
 *   node sa-sync-cdp.js --start 7/1/2025 --end 7/31/2025
 *   node sa-sync-cdp.js --today
 *   node sa-sync-cdp.js --yesterday
 *   node sa-sync-cdp.js --month 2025-07    (full month)
 *
 * Schedule with Task Scheduler:
 *   Program: node
 *   Args:    "C:\path\to\sync\sa-sync-cdp.js" --yesterday
 *   Start in: C:\path\to\sync
 */

import 'dotenv/config';
import CDP from 'chrome-remote-interface';

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SA_BOARD_URL = 'https://my.serviceautopilot.com/DispatchBoard.aspx';
const CDP_HOST     = process.env.CDP_HOST || 'localhost';
const CDP_PORT     = parseInt(process.env.CDP_PORT || '9222');
const QUERY_TIMEOUT = 20000; // ms to wait for SA query

// ── CLI args ─────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; };

  if (args.includes('--today')) {
    const d = new Date();
    return { start: fmtDate(d), end: fmtDate(d) };
  }
  if (args.includes('--yesterday')) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return { start: fmtDate(d), end: fmtDate(d) };
  }
  const month = get('--month');
  if (month) {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return { start: `${m}/1/${y}`, end: `${m}/${last}/${y}` };
  }
  const start = get('--start');
  const end   = get('--end');
  if (start && end) return { start, end };

  console.error('Usage: node sa-sync-cdp.js --start M/D/YYYY --end M/D/YYYY');
  console.error('       node sa-sync-cdp.js --today');
  console.error('       node sa-sync-cdp.js --yesterday');
  console.error('       node sa-sync-cdp.js --month YYYY-MM');
  process.exit(1);
}

function fmtDate(d) {
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

function parseMDY(s) {
  const [m, d, y] = s.split('/').map(Number);
  return { Month: m, Day: d, Year: y };
}

// ── Supabase ──────────────────────────────────────────────────────────────────
function saDateToISO(d) {
  if (!d?.Year) return null;
  return `${d.Year}-${String(d.Month).padStart(2,'0')}-${String(d.Day).padStart(2,'0')}`;
}
function saTimeToHHMM(t) {
  if (t?.Hour == null) return null;
  return `${String(t.Hour).padStart(2,'0')}:${String(t.Minute||0).padStart(2,'0')}`;
}
function mapJob(j) {
  return {
    sa_id:            String(j.ScheduledWorkID || j.ID || ''),
    job_date:         saDateToISO(j.ScheduledDate || j.StartDate),
    service_type:     j.ServiceName || j.Service || null,
    client_name:      j.ClientName  || j.Client  || null,
    address:          j.Address  || null,
    city:             j.City     || null,
    assigned:         j.ResourceName || j.Assigned || null,
    crew:             j.CrewName || j.Crew || null,
    status:           j.Status   || null,
    start_time:       saTimeToHHMM(j.StartTime),
    end_time:         saTimeToHHMM(j.EndTime),
    duration_minutes: j.Duration || j.TotalMinutes || null,
    revenue:          parseFloat(j.Total || j.Revenue || 0) || null,
    raw_json:         j,
    synced_at:        new Date().toISOString(),
  };
}

async function upsertJobs(jobs) {
  if (!jobs.length) return 0;
  const rows = jobs.map(mapJob);
  // Batch in groups of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sa_jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase error: ${err.substring(0, 300)}`);
    }
  }
  return rows.length;
}

// ── CDP sync ──────────────────────────────────────────────────────────────────
async function syncViaCDP(startStr, endStr) {
  const start = parseMDY(startStr);
  const end   = parseMDY(endStr);

  console.log(`Connecting to Chrome on ${CDP_HOST}:${CDP_PORT}...`);
  
  // List targets, find SA tab or open one
  let targets;
  try {
    targets = await CDP.List({ host: CDP_HOST, port: CDP_PORT });
  } catch (e) {
    console.error(`\n❌ Cannot connect to Chrome DevTools on port ${CDP_PORT}.`);
    console.error('   Make sure Chrome is running with: --remote-debugging-port=9222');
    console.error('   See setup instructions below.\n');
    throw e;
  }

  let saTarget = targets.find(t => t.url?.includes('serviceautopilot.com/DispatchBoard'));
  
  let client;
  if (saTarget) {
    console.log(`  Found SA tab: ${saTarget.url}`);
    client = await CDP({ host: CDP_HOST, port: CDP_PORT, target: saTarget.id });
  } else {
    console.log('  SA tab not found — opening it...');
    // Open a new tab navigated to SA
    const newTarget = await CDP.New({ host: CDP_HOST, port: CDP_PORT, url: SA_BOARD_URL });
    await new Promise(r => setTimeout(r, 8000)); // wait for login redirect / page load
    client = await CDP({ host: CDP_HOST, port: CDP_PORT, target: newTarget.id });
  }

  const { Runtime, Page, Network } = client;
  await Runtime.enable();
  await Page.enable();

  try {
    // Wait for page to be ready (SA board loaded with jQuery)
    console.log('  Waiting for SA board to be ready...');
    await waitForCondition(Runtime, `
      typeof $ !== 'undefined' && 
      typeof DispatchBoard !== 'undefined' && 
      document.getElementById('dispatchBoardDateRange') !== null
    `, 15000);

    console.log(`  Injecting date intercept for ${startStr} → ${endStr}...`);

    // Inject the intercept script into the page
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          return new Promise(function(resolve, reject) {
            var start = { Month: ${start.Month}, Day: ${start.Day}, Year: ${start.Year} };
            var end   = { Month: ${end.Month},   Day: ${end.Day},   Year: ${end.Year} };
            var isMulti = !(${start.Month} === ${end.Month} && ${start.Day} === ${end.Day} && ${start.Year} === ${end.Year});
            var origAjax = $.ajax;
            var fired = false;

            $.ajax = function(cfg) {
              if (!fired && cfg && cfg.url && cfg.url.includes('ScheduledWork')) {
                fired = true;
                $.ajax = origAjax;
                var data = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
                data.QueryData.StartDate = start;
                data.QueryData.EndDate   = end;
                data.QueryData.MultiDay  = isMulti;
                cfg.data = JSON.stringify(data);
                var origOk  = cfg.success;
                var origErr = cfg.error;
                cfg.success = function(r) {
                  resolve(JSON.stringify(r));
                  if (origOk) origOk.apply(this, arguments);
                };
                cfg.error = function(x, s) {
                  reject(s);
                  if (origErr) origErr.apply(this, arguments);
                };
              }
              return origAjax.apply(this, arguments);
            };

            // Trigger SA's query via Load Date Range button
            var btn = Array.from(document.querySelectorAll('a.dialogButton'))
                           .find(function(b) { return b.textContent.trim() === 'Load Date Range'; });
            if (!btn) { reject('Load Date Range button not found'); return; }
            $(btn).trigger('click');

            setTimeout(function() {
              if (!fired) { $.ajax = origAjax; reject('Timeout waiting for SA query'); }
            }, ${QUERY_TIMEOUT});
          });
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(`Page error: ${result.exceptionDetails.text || JSON.stringify(result.exceptionDetails)}`);
    }

    const response = JSON.parse(result.result.value);
    const items = response?.d?.ScheduledItems;
    if (!items) throw new Error('Unexpected SA response — missing ScheduledItems');

    const boardDate = response?.d?.StartDate;
    console.log(`  ✓ SA returned ${items.length} jobs (board: ${boardDate?.Month}/${boardDate?.Day}/${boardDate?.Year})`);

    if (items.length === 0) {
      console.log('✅ Done — 0 jobs to sync');
      return;
    }

    console.log(`  Upserting ${items.length} jobs to Supabase...`);
    const n = await upsertJobs(items);
    console.log(`✅ Synced ${n} jobs — ${startStr} → ${endStr}`);

  } finally {
    await client.close();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function waitForCondition(Runtime, expression, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const r = await Runtime.evaluate({ expression, returnByValue: true });
    if (r.result.value === true) return;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for: ${expression.trim().substring(0, 60)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const { start, end } = parseArgs();
console.log(`\nFieldOps SA Sync (CDP mode)`);
console.log(`Range: ${start} → ${end}\n`);

syncViaCDP(start, end).catch(err => {
  console.error('\n❌ Sync failed:', err.message || err);
  process.exit(1);
});
