import { useState, useEffect, useRef } from "react";

// ─── SE Wisconsin ER lookup ──────────────────────────────
const ER_BY_COUNTY = {
  "Ozaukee":    "Froedtert Menomonee Falls — Level II, 13111 N Port Washington Rd, Mequon",
  "Washington": "Froedtert West Bend — Level III, 3200 Pleasant Valley Rd, West Bend",
  "Waukesha":   "Froedtert Waukesha Memorial — Level II, 725 American Ave, Waukesha",
  "Milwaukee":  "Froedtert Hospital — Level I, 9200 W Wisconsin Ave, Milwaukee",
  "Racine":     "Ascension All Saints — Level II, 3801 Spring St, Racine",
  "Kenosha":    "Froedtert Pleasant Prairie — Level II, 9555 76th St, Pleasant Prairie",
  "Walworth":   "Aurora Lakeland Medical Center — Level III, W3985 County Rd NN, Elkhorn",
  "Sheboygan":  "Aurora Medical Center Sheboygan — Level III, 2629 N 7th St, Sheboygan",
  "Fond du Lac":"SSM Health St. Agnes — Level III, 430 E Division St, Fond du Lac",
  "Dodge":      "SSM Health St. Joseph — Level III, 611 St Joseph Ave, Beaver Dam",
};

const WI_COUNTIES = [
  "Dodge","Fond du Lac","Jefferson","Kenosha","Milwaukee",
  "Ozaukee","Racine","Sheboygan","Walworth","Washington","Waukesha",
];

const OPPORTUNITY_TYPES = [
  ["commercial","Commercial"],["residential","Residential"],["hoa","HOA"],
  ["government","Government"],["private","Private"],["other","Other"],
];

const WORK_TYPES = [
  { value: "sealcoat_residential", label: "Sealcoating — Residential" },
  { value: "sealcoat",             label: "Sealcoating — Commercial" },
  { value: "concrete",             label: "Concrete" },
  { value: "snow",                 label: "Snow Removal" },
  { value: "landscape_maintenance",label: "Landscape Maintenance" },
  { value: "other",                label: "Other / Landscape Construction" },
];

// ─── Helpers ─────────────────────────────────────────────
const rnd2 = n => Math.round(n * 100) / 100;
const pct = n => (n * 100).toFixed(1) + "%";
const f$ = n => n == null ? "—" : "$" + rnd2(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const INP = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, outline: "none", width: "100%", boxSizing: "border-box" };
const LBL = { fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 };
const SEC = { fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", margin: "14px 0 8px", borderBottom: "1px solid #f1f5f9", paddingBottom: 4 };
const GRID2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const GRID3    = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 };
const GRID4    = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 };
const RATE_INP = { ...INP, background: "#dcfce7", border: "1px solid #86efac" };
const num      = (v, fb = 0) => parseFloat(v) || fb;

function Field({ label, children, span }) {
  return (
    <div style={span ? { gridColumn: span } : {}}>
      {label && <label style={LBL}>{label}</label>}
      {children}
    </div>
  );
}

function RatesPanel({ title = "Rates & Constants", children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 10, marginTop: 6 }}>
      <button type="button" onClick={() => setOpen(p => !p)}
        style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "7px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</span>
        <span style={{ fontSize: 11, color: "#16a34a" }}>{open ? "▲ hide" : "▼ edit rates"}</span>
      </button>
      {open && <div style={{ padding: "0 12px 12px" }}>{children}</div>}
    </div>
  );
}

function StatBox({ children }) {
  return (
    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Production Rates</div>
      {children}
    </div>
  );
}

function StatRow({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
      <span style={{ color: "#3b82f6" }}>{label}</span>
      <span style={{ fontFamily: "monospace", fontWeight: bold ? 700 : 500, color: "#1e40af" }}>{value}</span>
    </div>
  );
}

function PlusBtn({ onClick, label = "Add area" }) {
  return (
    <button type="button" onClick={onClick}
      style={{ border: "1px dashed #94a3b8", background: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#64748b", cursor: "pointer", marginTop: 4, marginBottom: 8 }}>
      + {label}
    </button>
  );
}

function RemBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: "0 4px", lineHeight: 1 }}>
      ✕
    </button>
  );
}

function CalcResult({ direct_costs, bid_price, margin, items }) {
  if (!bid_price) return null;
  const gp = bid_price - direct_costs;
  return (
    <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", border: "1px solid #fbbf24", borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Estimate Summary</div>
      <div style={GRID3}>
        {[["Direct Costs", f$(direct_costs), "#0f172a"], ["Gross Profit", f$(gp), "#15803d"], ["Bid Price", f$(bid_price), "#ea580c"]].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontSize: 9.5, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: c, fontFamily: "monospace" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#78350f", marginTop: 6 }}>Margin: {pct(margin)}</div>
      {items?.length > 1 && (
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(251,191,36,0.4)", paddingTop: 8 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#78350f", marginBottom: 2 }}>
              <span>{it.title}</span>
              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{f$(it.total_cost)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Client Typeahead ────────────────────────────────────
function ClientTypeahead({ supabase, onSelect }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  function search(val) {
    setQ(val);
    clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("sa_jobs")
          .select("client,customer_id,address,city,state,zip")
          .ilike("client", `%${val.trim()}%`)
          .limit(12);
        const seen = new Set();
        const unique = (data || []).filter(r => {
          const k = r.customer_id || r.client;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setResults(unique);
        setOpen(unique.length > 0);
      } finally {
        setLoading(false);
      }
    }, 280);
  }

  function pick(r) {
    setQ(r.client);
    setOpen(false);
    onSelect({
      client_name: r.client,
      client_address: r.address || "",
      client_city: r.city || "",
      client_state: r.state || "WI",
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={q}
        onChange={e => search(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type client name…"
        style={INP}
      />
      {loading && <div style={{ position: "absolute", right: 10, top: 10, fontSize: 10, color: "#94a3b8" }}>…</div>}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 240, overflowY: "auto" }}>
          {results.map((r, i) => (
            <div key={r.customer_id ?? `${r.client}-${i}`} onMouseDown={() => pick(r)}
              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f8fafc", fontSize: 12 }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.client}</div>
              {r.address && <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{r.address}{r.city ? `, ${r.city}` : ""}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Residential Sealcoating Calculator ──────────────────
function ResidentialSealcoatingCalc({ onResult }) {
  const [s, setS] = useState({ sqft: "", grade: "B", coats: "1", zone: "0-15" });
  const [r, setR] = useState({
    labor_rate: 40, team_size: 3, workday_sf: 15000, site_hrs_ref: 9,
    sealer_px_gal: 2.82, crackfill_px_lb: 0.90,
    sfpg_1coat: 80, sfpg_2coat: 55,
    cfill_A: 0.025, cfill_B: 0.075, cfill_C: 0.125,
    drive_0_15: 0.5, drive_15_30: 0.75,
    min_px_1coat: 550, min_px_2coat: 600, margin: 47.5,
  });
  const upd  = (k, v) => setS(p => ({ ...p, [k]: v }));
  const updR = (k, v) => setR(p => ({ ...p, [k]: parseFloat(v) ?? p[k] }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const sf = num(s.sqft);
  const sfpg    = s.coats === "2" ? r.sfpg_2coat : r.sfpg_1coat;
  const cfill   = { A: r.cfill_A, B: r.cfill_B, C: r.cfill_C }[s.grade];
  const drive_h = s.zone === "15-30" ? r.drive_15_30 : r.drive_0_15;
  const site_h  = sf ? sf / r.workday_sf * r.site_hrs_ref : 0;
  const emp_hrs = (drive_h + site_h) * r.team_size;
  const labor   = rnd2(emp_hrs * r.labor_rate);
  const sealer_gals = sf ? rnd2(sf / sfpg) : 0;
  const sealer  = rnd2(sealer_gals * r.sealer_px_gal);
  const crack_lbs = sf ? rnd2(sf * cfill) : 0;
  const crack   = rnd2(crack_lbs * r.crackfill_px_lb);
  const direct  = rnd2(labor + sealer + crack);
  const calc_px = direct ? rnd2(direct / (1 - r.margin / 100)) : 0;
  const min_px  = s.coats === "2" ? r.min_px_2coat : r.min_px_1coat;
  const bid_price = sf > 0 ? rnd2(Math.max(calc_px, min_px)) : 0;
  const margin  = bid_price ? (bid_price - direct) / bid_price : 0;

  const sf_per_hr         = sf && site_h > 0 ? rnd2(sf / site_h) : 0;
  const total_hrs         = drive_h + site_h;
  const rev_per_hr        = bid_price && total_hrs > 0 ? rnd2(bid_price / total_hrs) : 0;
  const rev_per_hr_ex_mat = bid_price && total_hrs > 0 ? rnd2((bid_price - sealer - crack) / total_hrs) : 0;
  const gp_per_day        = site_h > 0 ? rnd2((bid_price - direct) * r.site_hrs_ref / site_h) : 0;

  useEffect(() => {
    if (!sf) { cbRef.current(null); return; }
    cbRef.current({
      bid_price, direct_costs: direct,
      gross_profit: rnd2(bid_price - direct), gross_margin: margin,
      notes: `Residential sealcoating: ${sf.toLocaleString()} SF, Grade ${s.grade}, ${s.coats} coat${s.coats === "2" ? "s" : ""}, ${s.zone} min zone`,
      items: [{
        title: `Sealcoating — ${sf.toLocaleString()} SF Grade ${s.grade} ${s.coats}C`,
        work_type: "sealcoat_residential",
        materials_cost: rnd2(sealer + crack), labor_cost: rnd2(labor),
        equipment_cost: 0, vehicle_cost: 0, sub_cost: 0,
        total_cost: bid_price, sort_order: 1,
        data: { sqft: sf, grade: s.grade, coats: s.coats, sealer_gals, crack_lbs },
      }],
    });
  }, [s, r]);

  const sel = { ...INP, cursor: "pointer" };
  return (
    <div>
      <div style={GRID2}>
        <Field label="Pavement sqft *">
          <input type="number" min="0" value={s.sqft} onChange={e => upd("sqft", e.target.value)} placeholder="1,642" style={INP} />
        </Field>
        <Field label="Pavement grade">
          <select value={s.grade} onChange={e => upd("grade", e.target.value)} style={sel}>
            <option value="A">A — New / No cracks</option>
            <option value="B">B — Mid-life (default)</option>
            <option value="C">C — Heavy cracking</option>
          </select>
        </Field>
        <Field label="Coats">
          <select value={s.coats} onChange={e => upd("coats", e.target.value)} style={sel}>
            <option value="1">1 coat</option>
            <option value="2">2 coats</option>
          </select>
        </Field>
        <Field label="Drive zone">
          <select value={s.zone} onChange={e => upd("zone", e.target.value)} style={sel}>
            <option value="0-15">0–15 min</option>
            <option value="15-30">15–30 min</option>
          </select>
        </Field>
      </div>

      <RatesPanel>
        <div style={GRID4}>
          <Field label="Labor $/hr"><input type="number" value={r.labor_rate} onChange={e => updR("labor_rate", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Team size"><input type="number" value={r.team_size} onChange={e => updR("team_size", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Workday SF"><input type="number" value={r.workday_sf} onChange={e => updR("workday_sf", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Site hrs ref"><input type="number" value={r.site_hrs_ref} onChange={e => updR("site_hrs_ref", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Sealer $/gal"><input type="number" step="0.01" value={r.sealer_px_gal} onChange={e => updR("sealer_px_gal", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Crackfill $/lb"><input type="number" step="0.01" value={r.crackfill_px_lb} onChange={e => updR("crackfill_px_lb", e.target.value)} style={RATE_INP} /></Field>
          <Field label="SF/gal 1-coat"><input type="number" value={r.sfpg_1coat} onChange={e => updR("sfpg_1coat", e.target.value)} style={RATE_INP} /></Field>
          <Field label="SF/gal 2-coat"><input type="number" value={r.sfpg_2coat} onChange={e => updR("sfpg_2coat", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF lb/SF — A"><input type="number" step="0.001" value={r.cfill_A} onChange={e => updR("cfill_A", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF lb/SF — B"><input type="number" step="0.001" value={r.cfill_B} onChange={e => updR("cfill_B", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF lb/SF — C"><input type="number" step="0.001" value={r.cfill_C} onChange={e => updR("cfill_C", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Drive 0-15 hr"><input type="number" step="0.25" value={r.drive_0_15} onChange={e => updR("drive_0_15", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Drive 15-30 hr"><input type="number" step="0.25" value={r.drive_15_30} onChange={e => updR("drive_15_30", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Min $ 1-coat"><input type="number" value={r.min_px_1coat} onChange={e => updR("min_px_1coat", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Min $ 2-coat"><input type="number" value={r.min_px_2coat} onChange={e => updR("min_px_2coat", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Margin (%)"><input type="number" value={r.margin} onChange={e => updR("margin", e.target.value)} style={RATE_INP} /></Field>
        </div>
      </RatesPanel>

      {sf > 0 && (
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#475569" }}>
          <div style={GRID3}>
            <div><div style={{ color: "#94a3b8" }}>Sealer</div><b>{sealer_gals} gal</b></div>
            <div><div style={{ color: "#94a3b8" }}>Crackfill</div><b>{crack_lbs} lb</b></div>
            <div><div style={{ color: "#94a3b8" }}>Labor</div><b>{rnd2(emp_hrs)} hrs ({r.team_size}-man)</b></div>
          </div>
          <div style={{ marginTop: 8 }}>
            Sealer {f$(sealer)} · Crackfill {f$(crack)} · Labor {f$(labor)} = <b>{f$(direct)}</b> direct
          </div>
          {sf > 7500 && <div style={{ color: "#dc2626", marginTop: 4, fontSize: 10.5 }}>⚠ &gt;7,500 SF — confirm with MR before submitting</div>}
        </div>
      )}

      {sf > 0 && bid_price > 0 && (
        <StatBox>
          <div style={GRID2}>
            <StatRow label="SF / hr (site)" value={sf_per_hr.toLocaleString()} />
            <StatRow label="Revenue / hr" value={f$(rev_per_hr)} />
            <StatRow label="Revenue / hr (ex-mat)" value={f$(rev_per_hr_ex_mat)} />
            <StatRow label="GP / day (scaled)" value={f$(gp_per_day)} bold />
          </div>
        </StatBox>
      )}

      <CalcResult direct_costs={direct} bid_price={bid_price} margin={margin} />
    </div>
  );
}

// ─── Commercial Sealcoating Calculator ───────────────────
const COM_GRADE_LABELS = { A: "New", B: "Light", C: "Moderate", D: "Heavy" };

function CommercialSealcoatingCalc({ onResult }) {
  const blankArea = { sqft: "", coats: "2", grade: "A" };
  const [areas, setAreas] = useState([
    { sqft: "", coats: "2", grade: "A" },
    { sqft: "", coats: "1", grade: "B" },
  ]);
  const [s, setS] = useState({ days: "2", crew: "4", mob_hrs: "2", vehicles: "3", miles_per_day: "75", striping: false, striping_price: "", desired_margin: "50" });
  const [r, setR] = useState({
    sealer_px_gal: 2.82, crackfill_px_lb: 0.90,
    sfpg_1coat: 60, sfpg_2coat: 50,
    cfill_lbs_per_lf: 0.15,
    cfill_A: 0.025, cfill_B: 0.05, cfill_C: 0.10, cfill_D: 0.15,
    labor_rate: 40, mob_rate: 40, site_hrs: 14,
    vehicle_rate: 1.25, mat_tax: 5.5, sub_margin: 10,
  });
  const upd     = (k, v) => setS(p => ({ ...p, [k]: v }));
  const updR    = (k, v) => setR(p => ({ ...p, [k]: parseFloat(v) ?? p[k] }));
  const updArea = (i, k, v) => setAreas(a => a.map((row, j) => j === i ? { ...row, [k]: v } : row));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function compute() {
    const total_sf = areas.reduce((s, a) => s + num(a.sqft), 0);
    if (!total_sf) return null;

    const days = num(s.days, 1);
    const crew = num(s.crew, 4);
    const mob_hrs = num(s.mob_hrs, 2);
    const vehicles = num(s.vehicles, 3);
    const mpd = num(s.miles_per_day, 75);
    const mg = num(s.desired_margin, 50) / 100;
    const mat_tax = 1 + r.mat_tax / 100;
    const SFPG = { "1": r.sfpg_1coat, "2": r.sfpg_2coat };
    const CFILL = { A: r.cfill_A, B: r.cfill_B, C: r.cfill_C, D: r.cfill_D };

    let total_gals = 0, total_cf_lbs = 0;
    areas.forEach(a => {
      const sf = num(a.sqft);
      if (!sf) return;
      total_gals += sf / SFPG[a.coats];
      total_cf_lbs += sf * CFILL[a.grade] * r.cfill_lbs_per_lf;
    });
    total_gals   = rnd2(total_gals);
    total_cf_lbs = rnd2(total_cf_lbs);

    const sealer_cost = rnd2(total_gals * r.sealer_px_gal);
    const cf_cost     = rnd2(total_cf_lbs * r.crackfill_px_lb);
    const mat_cost    = rnd2((sealer_cost + cf_cost) * mat_tax);

    const site_labor  = rnd2(days * crew * r.site_hrs * r.labor_rate);
    const mob_labor   = rnd2(days * crew * mob_hrs * r.mob_rate);
    const labor_cost  = site_labor + mob_labor;
    const vehicle_cost = rnd2(days * vehicles * mpd * r.vehicle_rate);

    const striping_cost = s.striping ? num(s.striping_price) : 0;
    const striping_bid  = striping_cost ? rnd2(striping_cost * (1 + r.sub_margin / 100)) : 0;

    const direct    = rnd2(mat_cost + labor_cost + vehicle_cost);
    const self_bid  = rnd2(direct / (1 - mg));
    const bid_price = rnd2(self_bid + striping_bid);
    const gross_profit = rnd2(bid_price - direct - striping_cost);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    const emp_hrs_total = days * crew * (r.site_hrs + mob_hrs);
    const sf_per_hr          = days * r.site_hrs > 0 ? rnd2(total_sf / (days * r.site_hrs)) : 0;
    const rev_per_hr         = emp_hrs_total > 0 ? rnd2(bid_price / emp_hrs_total) : 0;
    const rev_per_hr_ex_mat  = emp_hrs_total > 0 ? rnd2((bid_price - sealer_cost - cf_cost) / emp_hrs_total) : 0;
    const crew_charge_per_day = days > 0 ? rnd2(self_bid / days) : 0;
    const gp_per_day         = days > 0 ? rnd2(gross_profit / days) : 0;
    const gp_per_emp_hr      = emp_hrs_total > 0 ? rnd2(gross_profit / emp_hrs_total) : 0;

    const items = [{
      title: `Sealcoating — ${total_sf.toLocaleString()} SF (${days} day${days > 1 ? "s" : ""})`,
      work_type: "sealcoat",
      materials_cost: mat_cost, labor_cost, equipment_cost: 0, vehicle_cost, sub_cost: 0,
      total_cost: self_bid, sort_order: 1,
      data: { total_sf, total_gals, total_cf_lbs, crew, days },
    }];
    if (striping_bid > 0) items.push({ title: "Striping (sub)", work_type: "sealcoat", materials_cost: 0, labor_cost: 0, equipment_cost: 0, vehicle_cost: 0, sub_cost: striping_cost, total_cost: striping_bid, sort_order: 2, data: {} });

    return {
      bid_price, direct_costs: rnd2(direct + striping_cost), gross_profit, gross_margin, items,
      notes: `Commercial sealcoating: ${total_sf.toLocaleString()} SF, ${days} days, ${crew}-person crew`,
      stats: { sf_per_hr, rev_per_hr, rev_per_hr_ex_mat, crew_charge_per_day, gp_per_day, gp_per_emp_hr, total_gals, total_cf_lbs, sealer_cost, cf_cost, mat_cost, labor_cost, vehicle_cost },
    };
  }

  useEffect(() => { cbRef.current(compute()); }, [areas, s, r]);

  const res = compute();
  const sel = { ...INP, cursor: "pointer" };

  return (
    <div>
      {areas.map((a, i) => (
        <div key={i}>
          <div style={{ ...SEC, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Area {i + 1}{i >= 2 ? " (optional)" : ""}</span>
            {i >= 2 && <RemBtn onClick={() => setAreas(prev => prev.filter((_, j) => j !== i))} />}
          </div>
          <div style={GRID3}>
            <Field label="Sqft">
              <input type="number" min="0" value={a.sqft} onChange={e => updArea(i, "sqft", e.target.value)} placeholder="0" style={INP} />
            </Field>
            <Field label="Grade">
              <select value={a.grade} onChange={e => updArea(i, "grade", e.target.value)} style={sel}>
                {["A","B","C","D"].map(g => <option key={g} value={g}>{g} — {COM_GRADE_LABELS[g]} cracks</option>)}
              </select>
            </Field>
            <Field label="Coats">
              <select value={a.coats} onChange={e => updArea(i, "coats", e.target.value)} style={sel}>
                <option value="1">1 coat</option><option value="2">2 coats</option>
              </select>
            </Field>
          </div>
        </div>
      ))}
      <PlusBtn onClick={() => setAreas(prev => [...prev, { ...blankArea }])} label="Add area" />

      <div style={SEC}>Crew &amp; Schedule</div>
      <div style={GRID3}>
        <Field label="Days"><input type="number" min="1" value={s.days} onChange={e => upd("days", e.target.value)} style={INP} /></Field>
        <Field label="Crew size"><input type="number" min="1" value={s.crew} onChange={e => upd("crew", e.target.value)} style={INP} /></Field>
        <Field label="Mob hrs/day"><input type="number" min="0" step="0.5" value={s.mob_hrs} onChange={e => upd("mob_hrs", e.target.value)} style={INP} /></Field>
        <Field label="Vehicles"><input type="number" min="0" value={s.vehicles} onChange={e => upd("vehicles", e.target.value)} style={INP} /></Field>
        <Field label="Miles/day"><input type="number" min="0" value={s.miles_per_day} onChange={e => upd("miles_per_day", e.target.value)} style={INP} /></Field>
        <Field label="Target margin (%)"><input type="number" min="0" max="100" value={s.desired_margin} onChange={e => upd("desired_margin", e.target.value)} style={INP} /></Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
        <input type="checkbox" id="com-striping" checked={s.striping} onChange={e => upd("striping", e.target.checked)} />
        <label htmlFor="com-striping" style={{ fontSize: 12, color: "#374151" }}>Include striping (sub)</label>
        {s.striping && <input type="number" min="0" placeholder="Sub quote $" value={s.striping_price} onChange={e => upd("striping_price", e.target.value)} style={{ ...INP, width: 140, marginLeft: 8 }} />}
      </div>

      <RatesPanel>
        <div style={GRID4}>
          <Field label="Sealer $/gal"><input type="number" step="0.01" value={r.sealer_px_gal} onChange={e => updR("sealer_px_gal", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Crackfill $/lb"><input type="number" step="0.01" value={r.crackfill_px_lb} onChange={e => updR("crackfill_px_lb", e.target.value)} style={RATE_INP} /></Field>
          <Field label="SF/gal 1-coat"><input type="number" value={r.sfpg_1coat} onChange={e => updR("sfpg_1coat", e.target.value)} style={RATE_INP} /></Field>
          <Field label="SF/gal 2-coat"><input type="number" value={r.sfpg_2coat} onChange={e => updR("sfpg_2coat", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF lbs/LF"><input type="number" step="0.01" value={r.cfill_lbs_per_lf} onChange={e => updR("cfill_lbs_per_lf", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF LF/SF — A"><input type="number" step="0.001" value={r.cfill_A} onChange={e => updR("cfill_A", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF LF/SF — B"><input type="number" step="0.001" value={r.cfill_B} onChange={e => updR("cfill_B", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF LF/SF — C"><input type="number" step="0.001" value={r.cfill_C} onChange={e => updR("cfill_C", e.target.value)} style={RATE_INP} /></Field>
          <Field label="CF LF/SF — D"><input type="number" step="0.001" value={r.cfill_D} onChange={e => updR("cfill_D", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Labor $/hr"><input type="number" value={r.labor_rate} onChange={e => updR("labor_rate", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Mob $/hr"><input type="number" value={r.mob_rate} onChange={e => updR("mob_rate", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Site hrs/day"><input type="number" value={r.site_hrs} onChange={e => updR("site_hrs", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Vehicle $/mi"><input type="number" step="0.01" value={r.vehicle_rate} onChange={e => updR("vehicle_rate", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Mat tax (%)"><input type="number" step="0.1" value={r.mat_tax} onChange={e => updR("mat_tax", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Sub margin (%)"><input type="number" value={r.sub_margin} onChange={e => updR("sub_margin", e.target.value)} style={RATE_INP} /></Field>
        </div>
      </RatesPanel>

      {res?.stats && (
        <StatBox>
          <div style={GRID2}>
            <StatRow label="SF / hr (site)" value={res.stats.sf_per_hr.toLocaleString()} />
            <StatRow label="Revenue / hr" value={f$(res.stats.rev_per_hr)} />
            <StatRow label="Revenue / hr (ex-mat)" value={f$(res.stats.rev_per_hr_ex_mat)} />
            <StatRow label="Crew charge / day" value={f$(res.stats.crew_charge_per_day)} />
            <StatRow label="GP / day" value={f$(res.stats.gp_per_day)} bold />
            <StatRow label="GP / employee-hr" value={f$(res.stats.gp_per_emp_hr)} />
          </div>
          <div style={{ marginTop: 6, borderTop: "1px solid #bfdbfe", paddingTop: 6, fontSize: 10.5, color: "#3b82f6" }}>
            Sealer: {res.stats.total_gals} gal ({f$(res.stats.sealer_cost)}) · CF: {res.stats.total_cf_lbs} lb ({f$(res.stats.cf_cost)}) · Labor: {f$(res.stats.labor_cost)} · Vehicles: {f$(res.stats.vehicle_cost)}
          </div>
        </StatBox>
      )}

      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Concrete Calculator ──────────────────────────────────
function ConcreteCalc({ onResult }) {
  const blankFW = { l: "", w: "", depth: "4" };
  const blankCG = { lf: "", h: "6", tw: "6", bw: "8", gw: "16", gt: "4" };
  const blankST = { n: "", w: "4", rise: "7", run: "12" };
  const [fw, setFw] = useState([{ ...blankFW }]);
  const [cg, setCg] = useState([{ ...blankCG }]);
  const [st, setSt] = useState([{ ...blankST }]);
  const [s, setS] = useState({ days: "2", crew: "5", skid: "0", mini: "0", vehicles: "3", mpd: "20", subs: "", margin: "30" });
  const [r, setR] = useState({ concrete_px_cy: 220, stone_px_ton: 35, labor_rate: 45, hrs_per_day: 8, skid_day: 100, mini_day: 100, vehicle_rate: 1.25, mat_tax: 5.5, sub_margin: 10 });
  const upd  = (k, v) => setS(p => ({ ...p, [k]: v }));
  const updR = (k, v) => setR(p => ({ ...p, [k]: parseFloat(v) ?? p[k] }));
  const updFW = (i, k, v) => setFw(a => a.map((row, j) => j === i ? { ...row, [k]: v } : row));
  const updCG = (i, k, v) => setCg(a => a.map((row, j) => j === i ? { ...row, [k]: v } : row));
  const updST = (i, k, v) => setSt(a => a.map((row, j) => j === i ? { ...row, [k]: v } : row));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function calcFW() {
    return fw.map(a => {
      const sf = num(a.l) * num(a.w);
      const dep = num(a.depth, 4);
      const cy = rnd2(sf * (dep / 12) / 27);
      const stone_tons = rnd2(sf * (dep / 12) / 27 * 1.5);
      return { sf, dep, cy, stone_tons };
    });
  }

  function calcCY() {
    let cy = 0;
    fw.forEach(a => { cy += num(a.l) * num(a.w) * (num(a.depth, 4) / 12) / 27; });
    cg.forEach(a => {
      const lf = num(a.lf); if (!lf) return;
      const h = num(a.h, 6) / 12, tw = num(a.tw, 6) / 12, bw = num(a.bw, 8) / 12;
      const gw = num(a.gw) / 12, gt = num(a.gt) / 12;
      cy += (h * (tw + bw) / 2 + gw * gt) * lf / 27;
    });
    st.forEach(a => {
      const n = num(a.n); if (!n) return;
      cy += n * num(a.w, 4) * (num(a.rise, 7) / 12) * (num(a.run, 12) / 12) / 27;
    });
    return rnd2(cy);
  }

  function compute() {
    const total_cy = calcCY();
    if (!total_cy) return null;
    const fwData = calcFW();
    const total_stone_tons = rnd2(fwData.reduce((s, a) => s + a.stone_tons, 0));
    const days = num(s.days, 1);
    const crew = num(s.crew, 5);
    const tax  = 1 + r.mat_tax / 100;
    const mg   = num(s.margin, 30) / 100;

    const concrete_cost = rnd2(total_cy * r.concrete_px_cy);
    const stone_cost    = rnd2(total_stone_tons * r.stone_px_ton);
    const mat_cost      = rnd2((concrete_cost + stone_cost) * tax);

    const labor_cost  = rnd2(days * crew * r.hrs_per_day * r.labor_rate);
    const skid_cost   = rnd2(num(s.skid) * r.skid_day * tax);
    const mini_cost   = rnd2(num(s.mini) * r.mini_day * tax);
    const equip_cost  = rnd2(skid_cost + mini_cost);
    const veh_cost    = rnd2(days * num(s.vehicles, 3) * num(s.mpd, 20) * r.vehicle_rate);
    const sub_cost    = rnd2(num(s.subs));
    const sub_bid     = sub_cost ? rnd2(sub_cost * (1 + r.sub_margin / 100)) : 0;

    const direct    = rnd2(mat_cost + labor_cost + equip_cost + veh_cost);
    const self_bid  = rnd2(direct / (1 - mg));
    const bid_price = rnd2(self_bid + sub_bid);
    const gross_profit = rnd2(bid_price - direct - sub_cost);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    const emp_hrs = days * crew * r.hrs_per_day;
    const rev_per_hr        = emp_hrs > 0 ? rnd2(bid_price / emp_hrs) : 0;
    const rev_per_hr_ex_mat = emp_hrs > 0 ? rnd2((bid_price - mat_cost) / emp_hrs) : 0;
    const gp_per_day        = days > 0 ? rnd2(gross_profit / days) : 0;

    return {
      bid_price, direct_costs: rnd2(direct + sub_cost), gross_profit, gross_margin,
      notes: `Concrete: ${total_cy} CY${total_stone_tons > 0 ? `, ${total_stone_tons} tons stone` : ""}, ${days} days, ${crew}-person crew`,
      items: [{
        title: `Concrete — ${total_cy} CY (${days} day${days > 1 ? "s" : ""})`,
        work_type: "concrete",
        materials_cost: mat_cost, labor_cost, equipment_cost: equip_cost, vehicle_cost: veh_cost, sub_cost,
        total_cost: bid_price, sort_order: 1,
        data: { total_cy, total_stone_tons },
      }],
      stats: { total_stone_tons, concrete_cost, stone_cost, mat_cost, labor_cost, equip_cost, veh_cost, rev_per_hr, rev_per_hr_ex_mat, gp_per_day },
    };
  }

  useEffect(() => { cbRef.current(compute()); }, [fw, cg, st, s, r]);

  const res = compute();
  const fwData = calcFW();
  const total_cy = calcCY();
  const at = { fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" };

  return (
    <div>
      <div style={SEC}>Flatwork</div>
      {fw.map((a, i) => {
        const d = fwData[i];
        return (
          <div key={i} style={{ marginBottom: 8, borderLeft: "2px solid #e2e8f0", paddingLeft: 10 }}>
            <div style={at}>
              <span>Area {i + 1}</span>
              {i > 0 && <RemBtn onClick={() => setFw(prev => prev.filter((_, j) => j !== i))} />}
            </div>
            <div style={GRID3}>
              <Field label="Length (ft)"><input type="number" min="0" value={a.l} onChange={e => updFW(i, "l", e.target.value)} style={INP} /></Field>
              <Field label="Width (ft)"><input type="number" min="0" value={a.w} onChange={e => updFW(i, "w", e.target.value)} style={INP} /></Field>
              <Field label="Depth (in)"><input type="number" min="1" value={a.depth} onChange={e => updFW(i, "depth", e.target.value)} style={INP} /></Field>
            </div>
            {d.sf > 0 && (
              <div style={{ fontSize: 10.5, color: "#475569", marginTop: 3, display: "flex", gap: 16 }}>
                <span>{d.sf.toLocaleString()} SF → <b>{d.cy} CY</b></span>
                <span style={{ color: "#92400e" }}>Stone: <b>{d.stone_tons} tons</b> ({a.depth || 4}" depth × 1.5 ton/CY)</span>
              </div>
            )}
          </div>
        );
      })}
      <PlusBtn onClick={() => setFw(prev => [...prev, { ...blankFW }])} label="Add flatwork area" />

      <div style={SEC}>Curb &amp; Gutter</div>
      {cg.map((a, i) => (
        <div key={i} style={{ marginBottom: 8, borderLeft: "2px solid #e2e8f0", paddingLeft: 10 }}>
          <div style={at}>
            <span>Curb {i + 1}</span>
            {i > 0 && <RemBtn onClick={() => setCg(prev => prev.filter((_, j) => j !== i))} />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
            {[["LF","lf"],["H (in)","h"],["Top W (in)","tw"],["Base W (in)","bw"],["Gutter W (in)","gw"],["Gutter T (in)","gt"]].map(([l, k]) => (
              <Field key={k} label={l}><input type="number" min="0" value={a[k]} onChange={e => updCG(i, k, e.target.value)} style={{ ...INP, padding: "6px 8px" }} /></Field>
            ))}
          </div>
        </div>
      ))}
      <PlusBtn onClick={() => setCg(prev => [...prev, { ...blankCG }])} label="Add curb section" />

      <div style={SEC}>Steps</div>
      {st.map((a, i) => (
        <div key={i} style={{ marginBottom: 8, borderLeft: "2px solid #e2e8f0", paddingLeft: 10 }}>
          <div style={at}>
            <span>Steps {i + 1}</span>
            {i > 0 && <RemBtn onClick={() => setSt(prev => prev.filter((_, j) => j !== i))} />}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {[["# Steps","n"],["Width (ft)","w"],["Rise (in)","rise"],["Run (in)","run"]].map(([l, k]) => (
              <Field key={k} label={l}><input type="number" min="0" value={a[k]} onChange={e => updST(i, k, e.target.value)} style={{ ...INP, padding: "6px 8px" }} /></Field>
            ))}
          </div>
        </div>
      ))}
      <PlusBtn onClick={() => setSt(prev => [...prev, { ...blankST }])} label="Add steps" />

      <div style={SEC}>Crew &amp; Schedule</div>
      <div style={GRID3}>
        <Field label="Days"><input type="number" min="1" value={s.days} onChange={e => upd("days", e.target.value)} style={INP} /></Field>
        <Field label="Crew size"><input type="number" min="1" value={s.crew} onChange={e => upd("crew", e.target.value)} style={INP} /></Field>
        <Field label="Skid steer days"><input type="number" min="0" value={s.skid} onChange={e => upd("skid", e.target.value)} style={INP} /></Field>
        <Field label="Mini ex days"><input type="number" min="0" value={s.mini} onChange={e => upd("mini", e.target.value)} style={INP} /></Field>
        <Field label="Vehicles"><input type="number" min="0" value={s.vehicles} onChange={e => upd("vehicles", e.target.value)} style={INP} /></Field>
        <Field label="Miles/day"><input type="number" min="0" value={s.mpd} onChange={e => upd("mpd", e.target.value)} style={INP} /></Field>
        <Field label="Subs ($)"><input type="number" min="0" value={s.subs} onChange={e => upd("subs", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Margin (%)"><input type="number" min="0" max="100" value={s.margin} onChange={e => upd("margin", e.target.value)} style={INP} /></Field>
      </div>

      <RatesPanel>
        <div style={GRID4}>
          <Field label="Concrete $/CY"><input type="number" value={r.concrete_px_cy} onChange={e => updR("concrete_px_cy", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Stone $/ton"><input type="number" value={r.stone_px_ton} onChange={e => updR("stone_px_ton", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Labor $/hr"><input type="number" value={r.labor_rate} onChange={e => updR("labor_rate", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Hrs/day"><input type="number" value={r.hrs_per_day} onChange={e => updR("hrs_per_day", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Skid steer $/day"><input type="number" value={r.skid_day} onChange={e => updR("skid_day", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Mini ex $/day"><input type="number" value={r.mini_day} onChange={e => updR("mini_day", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Vehicle $/mi"><input type="number" step="0.01" value={r.vehicle_rate} onChange={e => updR("vehicle_rate", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Mat tax (%)"><input type="number" step="0.1" value={r.mat_tax} onChange={e => updR("mat_tax", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Sub margin (%)"><input type="number" value={r.sub_margin} onChange={e => updR("sub_margin", e.target.value)} style={RATE_INP} /></Field>
        </div>
      </RatesPanel>

      {total_cy > 0 && res?.stats && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#15803d", marginBottom: 4 }}>
          Concrete: <b>{total_cy} CY</b> {f$(res.stats.concrete_cost)}
          {res.stats.total_stone_tons > 0 && <> · Stone: <b>{res.stats.total_stone_tons} tons</b> {f$(res.stats.stone_cost)}</>}
          {" "}· Labor: {f$(res.stats.labor_cost)} · Equipment: {f$(res.stats.equip_cost)}
        </div>
      )}

      {res?.stats && (
        <StatBox>
          <div style={GRID2}>
            <StatRow label="Revenue / hr" value={f$(res.stats.rev_per_hr)} />
            <StatRow label="Revenue / hr (ex-mat)" value={f$(res.stats.rev_per_hr_ex_mat)} />
            <StatRow label="GP / day" value={f$(res.stats.gp_per_day)} bold />
          </div>
        </StatBox>
      )}

      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Snow Removal Calculator ──────────────────────────────
function SnowCalc({ onResult }) {
  const [s, setS] = useState({
    lot_sqft: "22000", sidewalk_sqft: "1800",
    plow_type: "w/salter", shovel_crew: "2-man", skidsteer: false,
    total_events_mo: "5", plow_events_mo: "2.5", months: "6",
    drive_time: "0.25", site_time_salt: "0.25", site_time_plow: "0.50",
    shovel_drive: "0.25", shovel_site_salt: "0.75", shovel_site_plow: "0.50",
  });
  const [r, setR] = useState({
    plow_ws_cost: 100, plow_ws_price: 150,
    plow_ns_cost: 75,  plow_ns_price: 125,
    shovel2_cost: 35,  shovel2_price: 80,
    shovel4_cost: 35,  shovel4_price: 80,
    skid_cost: 1800,   skid_price: 3200,
    salt_lbs_acre: 750, salt_px_ton: 75, salt_mat_markup: 1.5,
    ice_melt_px_bag: 10, ice_melt_sf_bag: 1000,
  });
  const upd  = (k, v) => setS(p => ({ ...p, [k]: v }));
  const updR = (k, v) => setR(p => ({ ...p, [k]: parseFloat(v) ?? p[k] }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function compute() {
    const lot = num(s.lot_sqft), swk = num(s.sidewalk_sqft);
    if (!lot && !swk) return null;

    const total_ev = num(s.total_events_mo) * num(s.months, 6);
    const plow_ev  = num(s.plow_events_mo)  * num(s.months, 6);
    const drive    = num(s.drive_time, 0.25);
    const site_s   = num(s.site_time_salt, 0.25);
    const site_p   = num(s.site_time_plow, 0.50);
    const sh_drive = num(s.shovel_drive, 0.25);
    const sh_ss    = num(s.shovel_site_salt, 0.75);
    const sh_sp    = num(s.shovel_site_plow, 0.50);

    const plow  = s.plow_type === "w/salter" ? { cost: r.plow_ws_cost, price: r.plow_ws_price } : { cost: r.plow_ns_cost, price: r.plow_ns_price };
    const shovel = s.shovel_crew === "4-man" ? { cost: r.shovel4_cost, price: r.shovel4_price } : { cost: r.shovel2_cost, price: r.shovel2_price };

    const salt_tons_ev   = lot / 43560 * (r.salt_lbs_acre / 2000);
    const salt_mat_cost  = salt_tons_ev * r.salt_px_ton;
    const salt_ev_cost   = rnd2(salt_mat_cost + (drive + site_s) * plow.cost);
    const salt_ev_price  = rnd2(salt_mat_cost * r.salt_mat_markup + (drive + site_s) * plow.price);
    const salt_s_cost    = rnd2(salt_ev_cost  * total_ev);
    const salt_s_price   = rnd2(salt_ev_price * total_ev);

    const plow_ev_cost  = rnd2(site_p * plow.cost);
    const plow_ev_price = rnd2(site_p * plow.price);
    const plow_s_cost   = rnd2(plow_ev_cost  * plow_ev);
    const plow_s_price  = rnd2(plow_ev_price * plow_ev);

    const ice_bags     = swk / r.ice_melt_sf_bag;
    const ice_ev_cost  = rnd2(ice_bags * r.ice_melt_px_bag);
    const ice_ev_price = rnd2(ice_bags * r.ice_melt_px_bag * r.salt_mat_markup);
    const ice_s_cost   = rnd2(ice_ev_cost  * total_ev);
    const ice_s_price  = rnd2(ice_ev_price * total_ev);

    const sh_time    = sh_drive + sh_ss + sh_sp;
    const sh_ev_cost  = rnd2(sh_time * shovel.cost);
    const sh_ev_price = rnd2(sh_time * shovel.price);
    const sh_s_cost   = rnd2(sh_ev_cost  * plow_ev);
    const sh_s_price  = rnd2(sh_ev_price * plow_ev);

    const skid_cost  = s.skidsteer ? r.skid_cost  : 0;
    const skid_price = s.skidsteer ? r.skid_price : 0;

    const direct    = rnd2(salt_s_cost + plow_s_cost + ice_s_cost + sh_s_cost + skid_cost);
    const bid_price = rnd2(salt_s_price + plow_s_price + ice_s_price + sh_s_price + skid_price);
    const gross_profit = rnd2(bid_price - direct);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    const items = [];
    if (plow_s_price   > 0) items.push({ title: "Snow plowing",      work_type: "snow", materials_cost: 0,            labor_cost: plow_s_cost, equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: plow_s_price,  sort_order: 1, data: {} });
    if (salt_s_price   > 0) items.push({ title: "Salt application",   work_type: "snow", materials_cost: rnd2(salt_mat_cost * total_ev), labor_cost: rnd2((drive + site_s) * plow.cost * total_ev), equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: salt_s_price,  sort_order: 2, data: {} });
    if (sh_s_price     > 0) items.push({ title: "Sidewalk shoveling", work_type: "snow", materials_cost: 0,            labor_cost: sh_s_cost,   equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: sh_s_price,   sort_order: 3, data: {} });
    if (ice_s_price    > 0) items.push({ title: "Ice melt",           work_type: "snow", materials_cost: ice_s_cost,   labor_cost: 0,           equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: ice_s_price,  sort_order: 4, data: {} });
    if (skid_price     > 0) items.push({ title: "Skidsteer (seasonal)",work_type: "snow", materials_cost: 0,            labor_cost: 0,           equipment_cost: skid_cost, vehicle_cost: 0, sub_cost: 0, total_cost: skid_price,   sort_order: 5, data: {} });

    return {
      bid_price, direct_costs: direct, gross_profit, gross_margin, items,
      notes: `Snow: ${lot.toLocaleString()} SF lot, ${swk.toLocaleString()} SF sidewalk, ${s.plow_type}, ${s.shovel_crew}, ${s.total_events_mo}/mo × ${s.months} mo`,
      info: { salt_tons_ev: rnd2(salt_tons_ev), ice_bags: rnd2(ice_bags), salt_s_price, plow_s_price, sh_s_price, ice_s_price },
    };
  }

  useEffect(() => { cbRef.current(compute()); }, [s, r]);

  const res = compute();
  const sel = { ...INP, cursor: "pointer" };

  return (
    <div>
      <div style={SEC}>Property</div>
      <div style={GRID2}>
        <Field label="Paved lot sqft"><input type="number" min="0" value={s.lot_sqft} onChange={e => upd("lot_sqft", e.target.value)} style={INP} /></Field>
        <Field label="Sidewalk sqft"><input type="number" min="0" value={s.sidewalk_sqft} onChange={e => upd("sidewalk_sqft", e.target.value)} style={INP} /></Field>
      </div>

      <div style={SEC}>Services</div>
      <div style={GRID3}>
        <Field label="Plow service">
          <select value={s.plow_type} onChange={e => upd("plow_type", e.target.value)} style={sel}>
            <option value="w/salter">Plow w/ salter</option>
            <option value="w/o salter">Plow w/o salter</option>
          </select>
        </Field>
        <Field label="Shovel crew">
          <select value={s.shovel_crew} onChange={e => upd("shovel_crew", e.target.value)} style={sel}>
            <option value="2-man">2-man crew</option>
            <option value="4-man">4-man crew</option>
          </select>
        </Field>
        <Field label="Skidsteer">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input type="checkbox" id="snw-skid" checked={s.skidsteer} onChange={e => upd("skidsteer", e.target.checked)} />
            <label htmlFor="snw-skid" style={{ fontSize: 12, color: "#374151" }}>Include seasonal</label>
          </div>
        </Field>
      </div>

      <div style={SEC}>Schedule &amp; Frequency</div>
      <div style={GRID3}>
        <Field label="Total events/mo"><input type="number" min="0" step="0.5" value={s.total_events_mo} onChange={e => upd("total_events_mo", e.target.value)} style={INP} /></Field>
        <Field label="Plow events/mo"><input type="number" min="0" step="0.5" value={s.plow_events_mo} onChange={e => upd("plow_events_mo", e.target.value)} style={INP} /></Field>
        <Field label="Season (months)"><input type="number" min="1" max="12" value={s.months} onChange={e => upd("months", e.target.value)} style={INP} /></Field>
      </div>

      <div style={SEC}>Time Inputs (hrs per event)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
        {[["Plow drive","drive_time"],["Plow+salt site","site_time_salt"],["Plow site","site_time_plow"],
          ["Shovel drive","shovel_drive"],["Shovel+salt","shovel_site_salt"],["Shovel plow","shovel_site_plow"]].map(([lbl, key]) => (
          <Field key={key} label={lbl}>
            <input type="number" min="0" step="0.25" value={s[key]} onChange={e => upd(key, e.target.value)} style={{ ...INP, padding: "6px 8px" }} />
          </Field>
        ))}
      </div>

      <RatesPanel title="Service Rates">
        <div style={GRID4}>
          <Field label="Plow+salt cost/hr"><input type="number" value={r.plow_ws_cost} onChange={e => updR("plow_ws_cost", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Plow+salt price/hr"><input type="number" value={r.plow_ws_price} onChange={e => updR("plow_ws_price", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Plow only cost/hr"><input type="number" value={r.plow_ns_cost} onChange={e => updR("plow_ns_cost", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Plow only price/hr"><input type="number" value={r.plow_ns_price} onChange={e => updR("plow_ns_price", e.target.value)} style={RATE_INP} /></Field>
          <Field label="2-man shovel cost/hr"><input type="number" value={r.shovel2_cost} onChange={e => updR("shovel2_cost", e.target.value)} style={RATE_INP} /></Field>
          <Field label="2-man shovel price/hr"><input type="number" value={r.shovel2_price} onChange={e => updR("shovel2_price", e.target.value)} style={RATE_INP} /></Field>
          <Field label="4-man shovel cost/hr"><input type="number" value={r.shovel4_cost} onChange={e => updR("shovel4_cost", e.target.value)} style={RATE_INP} /></Field>
          <Field label="4-man shovel price/hr"><input type="number" value={r.shovel4_price} onChange={e => updR("shovel4_price", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Skidsteer cost/season"><input type="number" value={r.skid_cost} onChange={e => updR("skid_cost", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Skidsteer price/season"><input type="number" value={r.skid_price} onChange={e => updR("skid_price", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Salt lbs/acre"><input type="number" value={r.salt_lbs_acre} onChange={e => updR("salt_lbs_acre", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Salt $/ton"><input type="number" value={r.salt_px_ton} onChange={e => updR("salt_px_ton", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Salt mat markup"><input type="number" step="0.1" value={r.salt_mat_markup} onChange={e => updR("salt_mat_markup", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Ice melt $/bag"><input type="number" value={r.ice_melt_px_bag} onChange={e => updR("ice_melt_px_bag", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Ice melt SF/bag"><input type="number" value={r.ice_melt_sf_bag} onChange={e => updR("ice_melt_sf_bag", e.target.value)} style={RATE_INP} /></Field>
        </div>
      </RatesPanel>

      {res?.info && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#1e40af", margin: "6px 0" }}>
          Per event: <b>{res.info.salt_tons_ev} tons</b> salt · <b>{res.info.ice_bags} bags</b> ice melt
          {" · "}Season: Plowing {f$(res.info.plow_s_price)} · Salting {f$(res.info.salt_s_price)} · Shoveling {f$(res.info.sh_s_price)} · Ice melt {f$(res.info.ice_s_price)}
        </div>
      )}
      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Landscape Maintenance Calculator ────────────────────
function LandscapeMaintenanceCalc({ onResult }) {
  const [s, setS] = useState({
    mow_area: "", mow_freq: "28", mow_ppv: "85", mow_hrs_visit: "1.5",
    fert_apps: "4", fert_ppapp: "55", fert_hrs_app: "1",
    weed_ctrl: true, weed_annual: "161",
    bed_maint: true, bed_visits: "6", bed_ppv: "65", bed_hrs_visit: "1",
    mulch_yds: "", mulch_py: "75", mulch_install: "45",
    shrub_count: "", shrub_per: "15", shrub_hrs_each: "0.25",
    spring_cleanup: "", spring_hrs: "4", fall_cleanup: "", fall_hrs: "4",
    desired_margin: "40",
  });
  const [r, setR] = useState({
    mow_cost_hr: 46,   mow_price_hr: 60,
    fert_cost_hr: 48,  fert_price_hr: 60,
    mulch_cost_hr: 31, mulch_price_hr: 60,
    clean_cost_hr: 38, clean_price_hr: 60,
    shrub_cost_hr: 33.5, shrub_price_hr: 60,
    bed_cost_hr: 25,   bed_price_hr: 50,
    vehicle_rate: 1.25,
  });
  const upd  = (k, v) => setS(p => ({ ...p, [k]: v }));
  const updR = (k, v) => setR(p => ({ ...p, [k]: parseFloat(v) ?? p[k] }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function compute() {
    const margin = num(s.desired_margin, 40) / 100;
    let annual_price = 0, annual_cost = 0;
    let total_hrs = 0;

    const mow_visits = num(s.mow_freq) ? Math.ceil(26 * 7 / num(s.mow_freq)) : 0;
    const mow_hrs    = mow_visits * num(s.mow_hrs_visit, 1.5);
    const mow_rev    = mow_visits * num(s.mow_ppv);
    annual_price += mow_rev;
    annual_cost  += rnd2(mow_hrs * r.mow_cost_hr);
    total_hrs    += mow_hrs;

    const fert_hrs = num(s.fert_apps) * num(s.fert_hrs_app, 1);
    const fert_rev = num(s.fert_apps) * num(s.fert_ppapp);
    annual_price += fert_rev;
    annual_cost  += rnd2(fert_hrs * r.fert_cost_hr);
    total_hrs    += fert_hrs;

    if (s.weed_ctrl) {
      const wc_rev = num(s.weed_annual);
      annual_price += wc_rev;
      annual_cost  += rnd2(wc_rev * (1 - margin));
    }

    if (s.bed_maint) {
      const bed_visits = num(s.bed_visits);
      const bed_hrs    = bed_visits * num(s.bed_hrs_visit, 1);
      const bed_rev    = bed_visits * num(s.bed_ppv);
      annual_price += bed_rev;
      annual_cost  += rnd2(bed_hrs * r.bed_cost_hr);
      total_hrs    += bed_hrs;
    }

    const mulch_yds = num(s.mulch_yds);
    if (mulch_yds > 0) {
      const mulch_mat   = mulch_yds * num(s.mulch_py, 75);
      const mulch_labor = mulch_yds * num(s.mulch_install, 45);
      const mulch_rev   = rnd2((mulch_mat + mulch_labor) / (1 - margin));
      annual_price += mulch_rev;
      annual_cost  += mulch_mat + mulch_labor;
      total_hrs    += mulch_yds / 2;
    }

    const shrubs = num(s.shrub_count);
    if (shrubs > 0) {
      const shrub_hrs = shrubs * num(s.shrub_hrs_each, 0.25) * 2;
      const shrub_rev = rnd2(shrubs * num(s.shrub_per, 15) * 2);
      annual_price += shrub_rev;
      annual_cost  += rnd2(shrub_hrs * r.shrub_cost_hr);
      total_hrs    += shrub_hrs;
    }

    const spring_rev = num(s.spring_cleanup), spring_hrs = num(s.spring_hrs, 4);
    const fall_rev   = num(s.fall_cleanup),   fall_hrs   = num(s.fall_hrs,   4);
    annual_price += spring_rev + fall_rev;
    annual_cost  += rnd2((spring_hrs + fall_hrs) * r.clean_cost_hr);
    total_hrs    += spring_hrs + fall_hrs;

    if (!annual_price) return null;
    annual_price = rnd2(annual_price);
    annual_cost  = rnd2(annual_cost);
    const gp = rnd2(annual_price - annual_cost);
    total_hrs = rnd2(total_hrs);

    return {
      bid_price: annual_price, direct_costs: annual_cost, gross_profit: gp,
      gross_margin: annual_price ? gp / annual_price : 0,
      notes: "Landscape maintenance: annual contract",
      items: [{
        title: "Landscape Maintenance — Annual Contract",
        work_type: "landscape_maintenance",
        materials_cost: 0, labor_cost: annual_cost, equipment_cost: 0, vehicle_cost: 0, sub_cost: 0,
        total_cost: annual_price, sort_order: 1, data: { mow_visits, fert_apps: s.fert_apps },
      }],
      stats: { total_hrs, mow_visits, rev_per_hr: total_hrs > 0 ? rnd2(annual_price / total_hrs) : 0, cost_per_hr: total_hrs > 0 ? rnd2(annual_cost / total_hrs) : 0, gp_per_hr: total_hrs > 0 ? rnd2(gp / total_hrs) : 0 },
    };
  }

  useEffect(() => { cbRef.current(compute()); }, [s, r]);

  const res = compute();

  return (
    <div>
      <div style={SEC}>Mowing</div>
      <div style={GRID4}>
        <Field label="Area (sqft)"><input type="number" min="0" value={s.mow_area} onChange={e => upd("mow_area", e.target.value)} placeholder="10000" style={INP} /></Field>
        <Field label="Freq (days between)"><input type="number" min="7" value={s.mow_freq} onChange={e => upd("mow_freq", e.target.value)} style={INP} /></Field>
        <Field label="Price / visit ($)"><input type="number" min="0" value={s.mow_ppv} onChange={e => upd("mow_ppv", e.target.value)} style={INP} /></Field>
        <Field label="Hrs / visit"><input type="number" min="0" step="0.25" value={s.mow_hrs_visit} onChange={e => upd("mow_hrs_visit", e.target.value)} style={INP} /></Field>
      </div>
      {res?.stats?.mow_visits > 0 && <div style={{ fontSize: 10.5, color: "#94a3b8", marginBottom: 6 }}>{res.stats.mow_visits} visits/yr</div>}

      <div style={SEC}>Fertilization &amp; Weed Control</div>
      <div style={GRID3}>
        <Field label="Fert apps/yr"><input type="number" min="0" value={s.fert_apps} onChange={e => upd("fert_apps", e.target.value)} style={INP} /></Field>
        <Field label="Fert price / app ($)"><input type="number" min="0" value={s.fert_ppapp} onChange={e => upd("fert_ppapp", e.target.value)} style={INP} /></Field>
        <Field label="Hrs / app"><input type="number" min="0" step="0.25" value={s.fert_hrs_app} onChange={e => upd("fert_hrs_app", e.target.value)} style={INP} /></Field>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 10px" }}>
        <input type="checkbox" id="lm-wc" checked={s.weed_ctrl} onChange={e => upd("weed_ctrl", e.target.checked)} />
        <label htmlFor="lm-wc" style={{ fontSize: 12 }}>Weed control</label>
        {s.weed_ctrl && <input type="number" min="0" value={s.weed_annual} onChange={e => upd("weed_annual", e.target.value)} style={{ ...INP, width: 110 }} placeholder="Annual $" />}
      </div>

      <div style={SEC}>Bed Maintenance &amp; Mulch</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <input type="checkbox" id="lm-bed" checked={s.bed_maint} onChange={e => upd("bed_maint", e.target.checked)} />
        <label htmlFor="lm-bed" style={{ fontSize: 12 }}>Bed maintenance</label>
      </div>
      {s.bed_maint && (
        <div style={GRID3}>
          <Field label="Visits / yr"><input type="number" min="0" value={s.bed_visits} onChange={e => upd("bed_visits", e.target.value)} style={INP} /></Field>
          <Field label="Price / visit ($)"><input type="number" min="0" value={s.bed_ppv} onChange={e => upd("bed_ppv", e.target.value)} style={INP} /></Field>
          <Field label="Hrs / visit"><input type="number" min="0" step="0.25" value={s.bed_hrs_visit} onChange={e => upd("bed_hrs_visit", e.target.value)} style={INP} /></Field>
        </div>
      )}
      <div style={GRID3}>
        <Field label="Mulch (cu yds)"><input type="number" min="0" step="0.5" value={s.mulch_yds} onChange={e => upd("mulch_yds", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Mulch $/yd (mat)"><input type="number" min="0" value={s.mulch_py} onChange={e => upd("mulch_py", e.target.value)} style={INP} /></Field>
        <Field label="Install $/yd (labor)"><input type="number" min="0" value={s.mulch_install} onChange={e => upd("mulch_install", e.target.value)} style={INP} /></Field>
      </div>

      <div style={SEC}>Shrubs &amp; Cleanup</div>
      <div style={GRID4}>
        <Field label="Shrub count"><input type="number" min="0" value={s.shrub_count} onChange={e => upd("shrub_count", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="$/shrub trim"><input type="number" min="0" value={s.shrub_per} onChange={e => upd("shrub_per", e.target.value)} style={INP} /></Field>
        <Field label="Hrs/shrub (per trim)"><input type="number" min="0" step="0.05" value={s.shrub_hrs_each} onChange={e => upd("shrub_hrs_each", e.target.value)} style={INP} /></Field>
        <div />
        <Field label="Spring cleanup ($)"><input type="number" min="0" value={s.spring_cleanup} onChange={e => upd("spring_cleanup", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Spring hrs"><input type="number" min="0" step="0.5" value={s.spring_hrs} onChange={e => upd("spring_hrs", e.target.value)} style={INP} /></Field>
        <Field label="Fall cleanup ($)"><input type="number" min="0" value={s.fall_cleanup} onChange={e => upd("fall_cleanup", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Fall hrs"><input type="number" min="0" step="0.5" value={s.fall_hrs} onChange={e => upd("fall_hrs", e.target.value)} style={INP} /></Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
        <label style={LBL}>Target margin (%)</label>
        <input type="number" min="0" max="100" value={s.desired_margin} onChange={e => upd("desired_margin", e.target.value)} style={{ ...INP, width: 80 }} />
      </div>

      <RatesPanel title="Crew Rates (cost/hr · price/hr)">
        <div style={GRID4}>
          <Field label="Mow cost/hr"><input type="number" step="0.5" value={r.mow_cost_hr} onChange={e => updR("mow_cost_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Mow price/hr"><input type="number" step="0.5" value={r.mow_price_hr} onChange={e => updR("mow_price_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Fert cost/hr"><input type="number" step="0.5" value={r.fert_cost_hr} onChange={e => updR("fert_cost_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Fert price/hr"><input type="number" step="0.5" value={r.fert_price_hr} onChange={e => updR("fert_price_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Mulch cost/hr"><input type="number" step="0.5" value={r.mulch_cost_hr} onChange={e => updR("mulch_cost_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Mulch price/hr"><input type="number" step="0.5" value={r.mulch_price_hr} onChange={e => updR("mulch_price_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Cleanup cost/hr"><input type="number" step="0.5" value={r.clean_cost_hr} onChange={e => updR("clean_cost_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Cleanup price/hr"><input type="number" step="0.5" value={r.clean_price_hr} onChange={e => updR("clean_price_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Shrub cost/hr"><input type="number" step="0.5" value={r.shrub_cost_hr} onChange={e => updR("shrub_cost_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Shrub price/hr"><input type="number" step="0.5" value={r.shrub_price_hr} onChange={e => updR("shrub_price_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Bed maint cost/hr"><input type="number" step="0.5" value={r.bed_cost_hr} onChange={e => updR("bed_cost_hr", e.target.value)} style={RATE_INP} /></Field>
          <Field label="Bed maint price/hr"><input type="number" step="0.5" value={r.bed_price_hr} onChange={e => updR("bed_price_hr", e.target.value)} style={RATE_INP} /></Field>
        </div>
      </RatesPanel>

      {res?.stats && (
        <StatBox>
          <div style={GRID2}>
            <StatRow label="Total est. hours / yr" value={res.stats.total_hrs.toLocaleString()} />
            <StatRow label="Revenue / hr" value={f$(res.stats.rev_per_hr)} />
            <StatRow label="Cost / hr" value={f$(res.stats.cost_per_hr)} />
            <StatRow label="GP / hr" value={f$(res.stats.gp_per_hr)} bold />
          </div>
        </StatBox>
      )}

      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Other / Landscape Construction Calculator ───────────
function OtherCalc({ onResult }) {
  const blankMat  = { desc: "", unit: "EA",  qty: "",  unit_cost: "", taxed: true };
  const blankLab  = { desc: "", days: "1",  emp: "1", hrs_day: "8", rate: "40" };
  const blankEquip = { desc: "", units: "1", days: "1", cost_day: "100", taxed: true };
  const blankSub  = { desc: "", cost: "" };
  const [materials, setMaterials] = useState([{ ...blankMat }]);
  const [labor,     setLabor]     = useState([{ ...blankLab }]);
  const [equipment, setEquipment] = useState([
    { desc: "Skid Steer", units: "0", days: "1", cost_day: "100", taxed: true },
    { desc: "Mini Excavator", units: "0", days: "1", cost_day: "100", taxed: true },
  ]);
  const [vehicles, setVehicles] = useState({ days: "1", count: "1", mpd: "20", rate: "1.25" });
  const [subs,     setSubs]     = useState([{ ...blankSub }]);
  const [cfg, setCfg] = useState({ tax_rate: "5.5", sub_margin: "10", desired_margin: "35" });

  const updMat  = (i, k, v) => setMaterials(a => a.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const updLab  = (i, k, v) => setLabor(a =>     a.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const updEquip= (i, k, v) => setEquipment(a => a.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const updSub  = (i, k, v) => setSubs(a =>      a.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const updVeh  = (k, v) => setVehicles(p => ({ ...p, [k]: v }));
  const updCfg  = (k, v) => setCfg(p => ({ ...p, [k]: v }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function compute() {
    const tax = num(cfg.tax_rate, 5.5) / 100;
    const sub_mg = num(cfg.sub_margin, 10) / 100;
    const mg     = num(cfg.desired_margin, 35) / 100;

    const mat_rows = materials.map(m => {
      const ext = num(m.qty) * num(m.unit_cost);
      return { ext, tax_amt: m.taxed ? ext * tax : 0 };
    });
    const mat_pretax = rnd2(mat_rows.reduce((s, m) => s + m.ext, 0));
    const mat_tax_amt = rnd2(mat_rows.reduce((s, m) => s + m.tax_amt, 0));
    const mat_total   = rnd2(mat_pretax + mat_tax_amt);

    const lab_rows = labor.map(l => ({ cost: num(l.days) * num(l.emp) * num(l.hrs_day, 8) * num(l.rate, 40) }));
    const lab_total = rnd2(lab_rows.reduce((s, l) => s + l.cost, 0));

    const eq_rows = equipment.map(e => {
      const ext = num(e.units) * num(e.days) * num(e.cost_day);
      return { ext, tax_amt: e.taxed ? ext * tax : 0 };
    });
    const eq_pretax  = rnd2(eq_rows.reduce((s, e) => s + e.ext, 0));
    const eq_tax_amt = rnd2(eq_rows.reduce((s, e) => s + e.tax_amt, 0));
    const eq_total   = rnd2(eq_pretax + eq_tax_amt);

    const veh_total = rnd2(num(vehicles.days) * num(vehicles.count) * num(vehicles.mpd) * num(vehicles.rate, 1.25));

    const sub_pretax = rnd2(subs.reduce((s, sub) => s + num(sub.cost), 0));
    const sub_bid    = sub_pretax > 0 ? rnd2(sub_pretax / (1 - sub_mg)) : 0;

    const direct    = rnd2(mat_total + lab_total + eq_total + veh_total);
    if (!direct && !sub_pretax) return null;
    const self_bid  = rnd2(direct / (1 - mg));
    const bid_price = rnd2(self_bid + sub_bid);
    const gross_profit = rnd2(bid_price - direct - sub_pretax);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    const total_emp_hrs = rnd2(labor.reduce((s, l) => s + num(l.days) * num(l.emp) * num(l.hrs_day, 8), 0));
    const max_days = Math.max(...labor.map(l => num(l.days)), 1);
    const crew_charge_day  = max_days > 0 ? rnd2(self_bid / max_days) : 0;
    const gp_per_day       = max_days > 0 ? rnd2(gross_profit / max_days) : 0;
    const gp_per_emp_hr    = total_emp_hrs > 0 ? rnd2(gross_profit / total_emp_hrs) : 0;
    const rev_per_hr       = total_emp_hrs > 0 ? rnd2(bid_price / total_emp_hrs) : 0;
    const rev_per_hr_ex_mat = total_emp_hrs > 0 ? rnd2((bid_price - mat_total) / total_emp_hrs) : 0;
    const rev_per_hr_ex_mat_eq = total_emp_hrs > 0 ? rnd2((bid_price - mat_total - eq_total) / total_emp_hrs) : 0;

    return {
      bid_price, direct_costs: rnd2(direct + sub_pretax), gross_profit, gross_margin,
      notes: `Other/construction: ${f$(bid_price)} bid`,
      items: [{
        title: "Landscape / Construction",
        work_type: "other",
        materials_cost: mat_total, labor_cost: lab_total, equipment_cost: eq_total,
        vehicle_cost: veh_total, sub_cost: sub_pretax,
        total_cost: bid_price, sort_order: 1, data: {},
      }],
      stats: { mat_total, mat_pretax, mat_tax_amt, lab_total, eq_total, veh_total, sub_pretax, sub_bid, total_emp_hrs, crew_charge_day, gp_per_day, gp_per_emp_hr, rev_per_hr, rev_per_hr_ex_mat, rev_per_hr_ex_mat_eq },
    };
  }

  useEffect(() => { cbRef.current(compute()); }, [materials, labor, equipment, vehicles, subs, cfg]);

  const res = compute();
  const si  = { ...INP, padding: "6px 8px" };

  return (
    <div>
      {/* Materials */}
      <div style={SEC}>Materials</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 80px 80px 40px 24px", gap: 4, marginBottom: 4 }}>
        {["Description","Unit","Qty","Cost/unit","Tax?",""].map(h => <div key={h} style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{h}</div>)}
      </div>
      {materials.map((m, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 60px 80px 80px 40px 24px", gap: 4, marginBottom: 4, alignItems: "center" }}>
          <input value={m.desc} onChange={e => updMat(i, "desc", e.target.value)} placeholder="Description" style={si} />
          <input value={m.unit} onChange={e => updMat(i, "unit", e.target.value)} placeholder="EA" style={si} />
          <input type="number" min="0" value={m.qty} onChange={e => updMat(i, "qty", e.target.value)} placeholder="0" style={si} />
          <input type="number" min="0" step="0.01" value={m.unit_cost} onChange={e => updMat(i, "unit_cost", e.target.value)} placeholder="0" style={si} />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <input type="checkbox" checked={m.taxed} onChange={e => updMat(i, "taxed", e.target.checked)} title="Apply sales tax" />
          </div>
          <RemBtn onClick={() => setMaterials(prev => prev.filter((_, j) => j !== i))} />
        </div>
      ))}
      <PlusBtn onClick={() => setMaterials(prev => [...prev, { ...blankMat }])} label="Add material" />

      {/* Labor */}
      <div style={SEC}>Direct Labor</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 60px 60px 70px 24px", gap: 4, marginBottom: 4 }}>
        {["Description","Days","Employees","Hrs/day","$/hr",""].map(h => <div key={h} style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{h}</div>)}
      </div>
      {labor.map((l, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 60px 60px 60px 70px 24px", gap: 4, marginBottom: 4, alignItems: "center" }}>
          <input value={l.desc} onChange={e => updLab(i, "desc", e.target.value)} placeholder="Labor description" style={si} />
          <input type="number" min="0" value={l.days} onChange={e => updLab(i, "days", e.target.value)} style={si} />
          <input type="number" min="0" value={l.emp} onChange={e => updLab(i, "emp", e.target.value)} style={si} />
          <input type="number" min="0" value={l.hrs_day} onChange={e => updLab(i, "hrs_day", e.target.value)} style={si} />
          <input type="number" min="0" value={l.rate} onChange={e => updLab(i, "rate", e.target.value)} style={{ ...si, background: "#dcfce7" }} />
          <RemBtn onClick={() => setLabor(prev => prev.filter((_, j) => j !== i))} />
        </div>
      ))}
      <PlusBtn onClick={() => setLabor(prev => [...prev, { ...blankLab }])} label="Add labor row" />

      {/* Equipment */}
      <div style={SEC}>Equipment</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 60px 80px 40px 24px", gap: 4, marginBottom: 4 }}>
        {["Description","Units","Days","$/day","Tax?",""].map(h => <div key={h} style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{h}</div>)}
      </div>
      {equipment.map((e, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 60px 60px 80px 40px 24px", gap: 4, marginBottom: 4, alignItems: "center" }}>
          <input value={e.desc} onChange={ev => updEquip(i, "desc", ev.target.value)} placeholder="Equipment" style={si} />
          <input type="number" min="0" value={e.units} onChange={ev => updEquip(i, "units", ev.target.value)} style={si} />
          <input type="number" min="0" value={e.days} onChange={ev => updEquip(i, "days", ev.target.value)} style={si} />
          <input type="number" min="0" value={e.cost_day} onChange={ev => updEquip(i, "cost_day", ev.target.value)} style={{ ...si, background: "#dcfce7" }} />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <input type="checkbox" checked={e.taxed} onChange={ev => updEquip(i, "taxed", ev.target.checked)} title="Apply sales tax" />
          </div>
          <RemBtn onClick={() => setEquipment(prev => prev.filter((_, j) => j !== i))} />
        </div>
      ))}
      <PlusBtn onClick={() => setEquipment(prev => [...prev, { ...blankEquip }])} label="Add equipment" />

      {/* Vehicles */}
      <div style={SEC}>Vehicles</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        <Field label="Days"><input type="number" min="0" value={vehicles.days} onChange={e => updVeh("days", e.target.value)} style={INP} /></Field>
        <Field label="Vehicles"><input type="number" min="0" value={vehicles.count} onChange={e => updVeh("count", e.target.value)} style={INP} /></Field>
        <Field label="Miles/day"><input type="number" min="0" value={vehicles.mpd} onChange={e => updVeh("mpd", e.target.value)} style={INP} /></Field>
        <Field label="$/mile"><input type="number" min="0" step="0.01" value={vehicles.rate} onChange={e => updVeh("rate", e.target.value)} style={{ ...INP, background: "#dcfce7" }} /></Field>
      </div>

      {/* Subcontractors */}
      <div style={SEC}>Subcontractors</div>
      {subs.map((sub, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 24px", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input value={sub.desc} onChange={e => updSub(i, "desc", e.target.value)} placeholder="Description / scope" style={si} />
          <input type="number" min="0" value={sub.cost} onChange={e => updSub(i, "cost", e.target.value)} placeholder="Quote $" style={si} />
          <RemBtn onClick={() => setSubs(prev => prev.filter((_, j) => j !== i))} />
        </div>
      ))}
      <PlusBtn onClick={() => setSubs(prev => [...prev, { ...blankSub }])} label="Add sub" />

      {/* Config */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, margin: "10px 0" }}>
        <Field label="Sales tax (%)"><input type="number" step="0.1" value={cfg.tax_rate} onChange={e => updCfg("tax_rate", e.target.value)} style={INP} /></Field>
        <Field label="Sub margin (%)"><input type="number" value={cfg.sub_margin} onChange={e => updCfg("sub_margin", e.target.value)} style={INP} /></Field>
        <Field label="Desired margin (%)"><input type="number" value={cfg.desired_margin} onChange={e => updCfg("desired_margin", e.target.value)} style={INP} /></Field>
      </div>

      {/* Cost summary */}
      {res?.stats && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#475569", marginBottom: 4 }}>
          Mat: {f$(res.stats.mat_pretax)}{res.stats.mat_tax_amt > 0 ? ` +${f$(res.stats.mat_tax_amt)} tax` : ""}
          {" · "}Labor: {f$(res.stats.lab_total)}
          {res.stats.eq_total > 0 && ` · Equip: ${f$(res.stats.eq_total)}`}
          {res.stats.veh_total > 0 && ` · Vehicles: ${f$(res.stats.veh_total)}`}
          {res.stats.sub_pretax > 0 && ` · Subs: ${f$(res.stats.sub_pretax)} → bid ${f$(res.stats.sub_bid)}`}
        </div>
      )}

      {res?.stats && res.stats.total_emp_hrs > 0 && (
        <StatBox>
          <div style={GRID2}>
            <StatRow label="Crew charge / day" value={f$(res.stats.crew_charge_day)} />
            <StatRow label="GP / day" value={f$(res.stats.gp_per_day)} bold />
            <StatRow label="GP / employee-hr" value={f$(res.stats.gp_per_emp_hr)} />
            <StatRow label="Revenue / hr" value={f$(res.stats.rev_per_hr)} />
            <StatRow label="Revenue / hr (ex-mat)" value={f$(res.stats.rev_per_hr_ex_mat)} />
            <StatRow label="Revenue / hr (ex-mat, ex-equip)" value={f$(res.stats.rev_per_hr_ex_mat_eq)} />
          </div>
        </StatBox>
      )}

      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Calculator Panel ─────────────────────────────────────
function CalcPanel({ workType, onResult }) {
  const key = workType;
  switch (workType) {
    case "sealcoat_residential": return <ResidentialSealcoatingCalc key={key} onResult={onResult} />;
    case "sealcoat":             return <CommercialSealcoatingCalc key={key} onResult={onResult} />;
    case "concrete":             return <ConcreteCalc key={key} onResult={onResult} />;
    case "snow":                 return <SnowCalc key={key} onResult={onResult} />;
    case "landscape_maintenance":return <LandscapeMaintenanceCalc key={key} onResult={onResult} />;
    default:                     return <OtherCalc key={key} onResult={onResult} />;
  }
}

// ─── Main Export: New Estimate Drawer ────────────────────
export function NewEstimateDrawer({ supabase, onClose, onCreated }) {
  const [client, setClient] = useState({ client_name: "", client_address: "", client_city: "", client_state: "WI" });
  const [job, setJob] = useState({ opportunity_type: "commercial", estimator_name: "", county: "", nearest_er: "", expected_duration_days: "", expected_timing: "", notes: "" });
  const [workType, setWorkType] = useState("snow");
  const [calcResult, setCalcResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updClient = (k, v) => setClient(p => ({ ...p, [k]: v }));
  const updJob = (k, v) => {
    setJob(p => {
      const next = { ...p, [k]: v };
      if (k === "county") next.nearest_er = ER_BY_COUNTY[v] || p.nearest_er;
      return next;
    });
  };

  function handleClientSelect(data) {
    setClient(data);
    const county = detectCounty(data.client_city);
    setJob(p => ({ ...p, county: county || p.county, nearest_er: county ? (ER_BY_COUNTY[county] || p.nearest_er) : p.nearest_er }));
  }

  function detectCounty(city) {
    const map = {
      "Menomonee Falls": "Waukesha", "Mequon": "Ozaukee", "Thiensville": "Ozaukee",
      "Cedarburg": "Ozaukee", "Grafton": "Ozaukee", "Port Washington": "Ozaukee",
      "Germantown": "Washington", "West Bend": "Washington", "Hartford": "Washington",
      "Waukesha": "Waukesha", "Brookfield": "Waukesha", "Elm Grove": "Waukesha",
      "New Berlin": "Waukesha", "Pewaukee": "Waukesha", "Oconomowoc": "Waukesha",
      "Milwaukee": "Milwaukee", "Wauwatosa": "Milwaukee", "West Allis": "Milwaukee",
      "Shorewood": "Milwaukee", "Whitefish Bay": "Milwaukee", "Glendale": "Milwaukee",
      "Racine": "Racine", "Mount Pleasant": "Racine", "Sturtevant": "Racine",
      "Kenosha": "Kenosha", "Pleasant Prairie": "Kenosha",
    };
    return map[city] || "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!client.client_name.trim()) { setError("Client name is required."); return; }
    if (!client.client_address.trim()) { setError("Address is required."); return; }
    if (!job.estimator_name.trim()) { setError("Estimator name is required."); return; }
    if (!calcResult?.bid_price) { setError("Please complete the takeoff calculator before saving."); return; }

    const bid_price = calcResult.bid_price;
    const direct_costs = calcResult.direct_costs || 0;
    const gross_profit = rnd2(bid_price - direct_costs);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const notesText = [job.notes, calcResult?.notes].filter(Boolean).join("\n\n");

      const { data: est, error: err } = await supabase.from("estimates").insert({
        client_name: client.client_name.trim(),
        client_address: client.client_address.trim(),
        client_city: client.client_city.trim() || null,
        client_state: client.client_state.trim() || null,
        opportunity_type: job.opportunity_type,
        estimator_id: user?.id ?? null,
        estimator_name: job.estimator_name.trim(),
        county: job.county.trim() || null,
        bid_price,
        gross_profit,
        direct_costs,
        gross_margin_target: gross_margin,
        expected_duration_days: job.expected_duration_days ? parseInt(job.expected_duration_days, 10) : null,
        expected_timing: job.expected_timing.trim() || null,
        nearest_er: job.nearest_er.trim() || null,
        notes: notesText || null,
        status: "draft",
      }).select().single();

      if (err) { setError(err.message); return; }

      const items = calcResult?.items;
      if (items?.length) {
        const { error: itemErr } = await supabase.from("estimate_bid_items").insert(
          items.map(it => ({ ...it, estimate_id: est.id }))
        );
        if (itemErr) {
          setError(`Estimate created but takeoff items failed to save: ${itemErr.message}. Close and reopen to see the estimate.`);
          return;
        }
      }

      onCreated();
    } catch (ex) {
      setError(ex?.message ?? "Unexpected error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inp = INP;
  const lbl = LBL;
  const sel = { ...INP, cursor: "pointer" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "0", overflowY: "auto" }}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 960, minHeight: "100vh", display: "flex", flexDirection: "column", boxShadow: "0 0 48px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff", position: "sticky", top: 0, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>New Estimate</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>Creates a draft estimate with takeoff calculation</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {calcResult && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Bid Price</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ea580c", fontFamily: "monospace", letterSpacing: "-0.02em" }}>{calcResult ? `$${calcResult.bid_price.toLocaleString("en-US")}` : "—"}</div>
              </div>
            )}
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", padding: "4px 8px" }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", flex: 1 }}>
          {/* Left panel: Client + Job */}
          <div style={{ borderRight: "1px solid #e2e8f0", padding: "18px 16px", overflowY: "auto", maxHeight: "calc(100vh - 110px)" }}>
            <div style={SEC}>Client</div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Client Name *</label>
              <ClientTypeahead supabase={supabase} onSelect={handleClientSelect} />
              <input value={client.client_name} onChange={e => updClient("client_name", e.target.value)}
                style={{ ...inp, marginTop: 4, fontSize: 12, fontWeight: 600 }} placeholder="Client name (search above or type here)" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Address *</label>
              <input required value={client.client_address} onChange={e => updClient("client_address", e.target.value)} placeholder="123 Main St" style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={lbl}>City</label>
                <input value={client.client_city} onChange={e => { updClient("client_city", e.target.value); const c = detectCounty(e.target.value); if (c) updJob("county", c); }} placeholder="Mequon" style={inp} />
              </div>
              <div>
                <label style={lbl}>State</label>
                <input value={client.client_state} onChange={e => updClient("client_state", e.target.value)} maxLength={2} placeholder="WI" style={inp} />
              </div>
            </div>

            <div style={SEC}>Job</div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Opportunity Type *</label>
              <select required value={job.opportunity_type} onChange={e => updJob("opportunity_type", e.target.value)} style={sel}>
                {OPPORTUNITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Estimator *</label>
              <input required value={job.estimator_name} onChange={e => updJob("estimator_name", e.target.value)} placeholder="Michael" style={inp} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>County</label>
              <select value={job.county} onChange={e => updJob("county", e.target.value)} style={sel}>
                <option value="">Select county…</option>
                {WI_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Nearest ER</label>
              <input value={job.nearest_er} onChange={e => updJob("nearest_er", e.target.value)}
                placeholder="Auto-filled by county" style={{ ...inp, fontSize: 11 }} />
              {job.county && ER_BY_COUNTY[job.county] && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Auto-filled from county</div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Duration (days)</label>
                <input type="number" min="0" value={job.expected_duration_days} onChange={e => updJob("expected_duration_days", e.target.value)} placeholder="1" style={inp} />
              </div>
              <div>
                <label style={lbl}>Timing</label>
                <input value={job.expected_timing} onChange={e => updJob("expected_timing", e.target.value)} placeholder="Spring 2026" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Notes</label>
              <textarea value={job.notes} onChange={e => updJob("notes", e.target.value)} rows={4}
                placeholder="Site conditions, access, special requirements…"
                style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
            </div>
          </div>

          {/* Right panel: Work type + Calculator */}
          <div style={{ padding: "18px 18px", overflowY: "auto", maxHeight: "calc(100vh - 110px)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Service Type</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
              {WORK_TYPES.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => { setWorkType(value); setCalcResult(null); }}
                  style={{
                    padding: "6px 12px", borderRadius: 99, fontSize: 11.5, fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                    borderColor: workType === value ? "#ea580c" : "#e2e8f0",
                    background: workType === value ? "#fff7ed" : "#f8fafc",
                    color: workType === value ? "#c2410c" : "#475569",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <CalcPanel workType={workType} onResult={setCalcResult} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "12px 20px", background: "#fff", position: "sticky", bottom: 0, zIndex: 2 }}>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#b91c1c", marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
            {calcResult && (
              <div style={{ marginRight: "auto", fontSize: 11, color: "#64748b" }}>
                Bid: <b style={{ color: "#ea580c", fontFamily: "monospace" }}>${calcResult.bid_price.toLocaleString()}</b>
                {" · "}Margin: <b>{pct(calcResult.gross_margin)}</b>
              </div>
            )}
            <button type="button" onClick={onClose}
              style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: saving ? "#94a3b8" : "#ea580c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Creating…" : "Create Estimate"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
