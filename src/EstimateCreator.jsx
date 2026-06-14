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
const GRID3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 };

function Field({ label, children, span }) {
  return (
    <div style={span ? { gridColumn: span } : {}}>
      {label && <label style={LBL}>{label}</label>}
      {children}
    </div>
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
const RES_CRACKFILL = { A: 0.025, B: 0.075, C: 0.125 };
const RES_SEALER_RATE = { "1": 80, "2": 55 };
const RES_DRIVE_TIME = { "0-15": 0.5, "15-30": 0.75 };
const RES_MIN_PRICE = { "1": 450, "2": 600 };

function ResidentialSealcoatingCalc({ onResult }) {
  const [s, setS] = useState({ sqft: "", grade: "B", coats: "1", zone: "0-15" });
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  useEffect(() => {
    const sf = parseFloat(s.sqft) || 0;
    if (!sf) { cbRef.current(null); return; }
    const drive = RES_DRIVE_TIME[s.zone];
    const site = sf / 15000 * 9;
    const labor = (drive + site) * 3 * 40;
    const sealer_gals = sf / RES_SEALER_RATE[s.coats];
    const sealer = rnd2(sealer_gals * 2.82);
    const crack_lbs = sf * RES_CRACKFILL[s.grade];
    const crack = rnd2(crack_lbs * 0.90);
    const direct = rnd2(labor + sealer + crack);
    const calc_px = rnd2(direct / 0.52);
    const min_px = RES_MIN_PRICE[s.coats];
    const bid_price = rnd2(Math.max(calc_px, min_px));
    const margin = (bid_price - direct) / bid_price;
    cbRef.current({
      bid_price,
      direct_costs: direct,
      gross_profit: rnd2(bid_price - direct),
      gross_margin: margin,
      notes: `Residential sealcoating: ${sf.toLocaleString()} SF, Grade ${s.grade}, ${s.coats} coat${s.coats === "2" ? "s" : ""}, ${s.zone} min zone`,
      items: [{
        title: `Sealcoating — ${sf.toLocaleString()} SF Grade ${s.grade} ${s.coats}C`,
        work_type: "sealcoat_residential",
        materials_cost: rnd2(sealer + crack),
        labor_cost: rnd2(labor),
        equipment_cost: 0, vehicle_cost: 0, sub_cost: 0,
        total_cost: bid_price,
        sort_order: 1,
        data: { sqft: sf, grade: s.grade, coats: s.coats, sealer_gals: rnd2(sealer_gals), crack_lbs: rnd2(crack_lbs) },
      }],
    });
  }, [s]);

  const sf = parseFloat(s.sqft) || 0;
  const drive = RES_DRIVE_TIME[s.zone];
  const site = sf ? sf / 15000 * 9 : 0;
  const labor = rnd2((drive + site) * 3 * 40);
  const sealer_gals = sf ? rnd2(sf / RES_SEALER_RATE[s.coats]) : 0;
  const sealer = rnd2(sealer_gals * 2.82);
  const crack_lbs = sf ? rnd2(sf * RES_CRACKFILL[s.grade]) : 0;
  const crack = rnd2(crack_lbs * 0.90);
  const direct = rnd2(labor + sealer + crack);
  const calc_px = direct ? rnd2(direct / 0.52) : 0;
  const bid_price = sf > 0 ? rnd2(Math.max(calc_px, RES_MIN_PRICE[s.coats])) : 0;
  const margin = bid_price ? (bid_price - direct) / bid_price : 0;

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
      {sf > 0 && (
        <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#475569" }}>
          <div style={GRID3}>
            <div><div style={{ color: "#94a3b8" }}>Sealer</div><b>{sealer_gals} gal</b></div>
            <div><div style={{ color: "#94a3b8" }}>Crackfill</div><b>{crack_lbs} lb</b></div>
            <div><div style={{ color: "#94a3b8" }}>Labor</div><b>{rnd2((drive + site) * 3)} hrs</b></div>
          </div>
          <div style={{ marginTop: 8 }}>
            Cost breakdown: Sealer {f$(sealer)} · Crackfill {f$(crack)} · Labor {f$(labor)} = <b>{f$(direct)}</b> direct
          </div>
          {sf > 7500 && <div style={{ color: "#dc2626", marginTop: 4, fontSize: 10.5 }}>⚠ &gt;7,500 SF — confirm with MR before submitting</div>}
        </div>
      )}
      <CalcResult direct_costs={direct} bid_price={bid_price} margin={margin} />
    </div>
  );
}

// ─── Commercial Sealcoating Calculator ───────────────────
const COM_GRADE_CFILL = { A: 0.025, B: 0.05, C: 0.10, D: 0.15 };
const COM_SEALER_RATE = { "1": 60, "2": 50 };

function CommercialSealcoatingCalc({ onResult }) {
  const [s, setS] = useState({
    a1_sqft: "", a1_coats: "2", a1_grade: "A",
    a2_sqft: "", a2_coats: "1", a2_grade: "B",
    days: "2", crew: "4", mob_hrs: "2",
    vehicles: "3", miles_per_day: "75",
    striping: false, striping_price: "",
    desired_margin: "50",
  });
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function compute(s) {
    const a1 = parseFloat(s.a1_sqft) || 0;
    const a2 = parseFloat(s.a2_sqft) || 0;
    const total_sf = a1 + a2;
    if (!total_sf) return null;

    const days = parseFloat(s.days) || 1;
    const crew = parseFloat(s.crew) || 4;
    const mob_hrs = parseFloat(s.mob_hrs) || 2;
    const vehicles = parseFloat(s.vehicles) || 3;
    const mpd = parseFloat(s.miles_per_day) || 75;
    const margin = (parseFloat(s.desired_margin) || 50) / 100;

    // Materials
    const a1_gals = a1 ? rnd2(a1 / COM_SEALER_RATE[s.a1_coats]) : 0;
    const a2_gals = a2 ? rnd2(a2 / COM_SEALER_RATE[s.a2_coats]) : 0;
    const total_gals = a1_gals + a2_gals;
    const sealer_cost = rnd2(total_gals * 2.82);

    const a1_cf_lbs = a1 ? rnd2(a1 * COM_GRADE_CFILL[s.a1_grade] * 0.15) : 0;
    const a2_cf_lbs = a2 ? rnd2(a2 * COM_GRADE_CFILL[s.a2_grade] * 0.15) : 0;
    const cf_cost = rnd2((a1_cf_lbs + a2_cf_lbs) * 0.90);
    const mat_pretax = rnd2(sealer_cost + cf_cost);
    const mat_cost = rnd2(mat_pretax * 1.055);

    // Labor
    const site_hrs = days * crew * 14;
    const mob_cost = rnd2(days * crew * mob_hrs * 40);
    const labor_cost = rnd2(days * crew * 14 * 40) + mob_cost;

    // Vehicles
    const vehicle_cost = rnd2(days * vehicles * mpd * 1.25);

    // Subcontractors — striping
    const striping_cost = s.striping ? (parseFloat(s.striping_price) || 0) : 0;
    const striping_bid = s.striping ? rnd2(striping_cost / 0.90) : 0;

    const direct = rnd2(mat_cost + labor_cost + vehicle_cost);
    const self_perform_bid = rnd2(direct / (1 - margin));
    const bid_price = rnd2(self_perform_bid + striping_bid);
    const gross_profit = rnd2(bid_price - direct - striping_cost);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    const items = [
      {
        title: `Sealcoating — ${total_sf.toLocaleString()} SF (${days} day${days > 1 ? "s" : ""})`,
        work_type: "sealcoat",
        materials_cost: mat_cost,
        labor_cost,
        equipment_cost: 0,
        vehicle_cost,
        sub_cost: 0,
        total_cost: self_perform_bid,
        sort_order: 1,
        data: { total_sf, a1_gals, a2_gals, a1_cf_lbs, a2_cf_lbs, crew, days },
      },
    ];
    if (s.striping && striping_bid > 0) {
      items.push({ title: "Striping (sub)", work_type: "sealcoat", materials_cost: 0, labor_cost: 0, equipment_cost: 0, vehicle_cost: 0, sub_cost: striping_cost, total_cost: striping_bid, sort_order: 2, data: {} });
    }
    return { bid_price, direct_costs: direct + striping_cost, gross_profit, gross_margin, items,
      notes: `Commercial sealcoating: ${total_sf.toLocaleString()} SF, ${days} days, ${crew}-person crew` };
  }

  useEffect(() => {
    cbRef.current(compute(s));
  }, [s]);

  const res = compute(s);
  const sel = { ...INP, cursor: "pointer" };

  return (
    <div>
      <div style={SEC}>Area 1</div>
      <div style={GRID3}>
        <Field label="Sqft *">
          <input type="number" min="0" value={s.a1_sqft} onChange={e => upd("a1_sqft", e.target.value)} placeholder="149,100" style={INP} />
        </Field>
        <Field label="Grade">
          <select value={s.a1_grade} onChange={e => upd("a1_grade", e.target.value)} style={sel}>
            {["A","B","C","D"].map(g => <option key={g} value={g}>{g} — {["New","Light","Moderate","Heavy"][["A","B","C","D"].indexOf(g)]} cracks</option>)}
          </select>
        </Field>
        <Field label="Coats">
          <select value={s.a1_coats} onChange={e => upd("a1_coats", e.target.value)} style={sel}>
            <option value="1">1 coat</option><option value="2">2 coats</option>
          </select>
        </Field>
      </div>

      <div style={SEC}>Area 2 (optional)</div>
      <div style={GRID3}>
        <Field label="Sqft">
          <input type="number" min="0" value={s.a2_sqft} onChange={e => upd("a2_sqft", e.target.value)} placeholder="0" style={INP} />
        </Field>
        <Field label="Grade">
          <select value={s.a2_grade} onChange={e => upd("a2_grade", e.target.value)} style={sel}>
            {["A","B","C","D"].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Coats">
          <select value={s.a2_coats} onChange={e => upd("a2_coats", e.target.value)} style={sel}>
            <option value="1">1 coat</option><option value="2">2 coats</option>
          </select>
        </Field>
      </div>

      <div style={SEC}>Crew & Schedule</div>
      <div style={GRID3}>
        <Field label="Days">
          <input type="number" min="1" value={s.days} onChange={e => upd("days", e.target.value)} style={INP} />
        </Field>
        <Field label="Crew size">
          <input type="number" min="1" value={s.crew} onChange={e => upd("crew", e.target.value)} style={INP} />
        </Field>
        <Field label="Mob hrs/day">
          <input type="number" min="0" step="0.5" value={s.mob_hrs} onChange={e => upd("mob_hrs", e.target.value)} style={INP} />
        </Field>
        <Field label="Vehicles">
          <input type="number" min="0" value={s.vehicles} onChange={e => upd("vehicles", e.target.value)} style={INP} />
        </Field>
        <Field label="Miles/day">
          <input type="number" min="0" value={s.miles_per_day} onChange={e => upd("miles_per_day", e.target.value)} style={INP} />
        </Field>
        <Field label="Target margin (%)">
          <input type="number" min="0" max="100" value={s.desired_margin} onChange={e => upd("desired_margin", e.target.value)} style={INP} />
        </Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
        <input type="checkbox" id="striping" checked={s.striping} onChange={e => upd("striping", e.target.checked)} />
        <label htmlFor="striping" style={{ fontSize: 12, color: "#374151" }}>Include striping (subcontractor)</label>
        {s.striping && (
          <input type="number" min="0" placeholder="Sub quote $" value={s.striping_price}
            onChange={e => upd("striping_price", e.target.value)}
            style={{ ...INP, width: 140, marginLeft: 8 }} />
        )}
      </div>

      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Concrete Calculator ──────────────────────────────────
function ConcreteCalc({ onResult }) {
  const blankFW = { l: "", w: "", depth: "4" };
  const blankCG = { lf: "", h: "6", tw: "6", bw: "8", gw: "16", gt: "4" };
  const blankST = { n: "", w: "4", rise: "7", run: "12" };
  const [fw, setFw] = useState([{ ...blankFW }, { ...blankFW }, { ...blankFW }]);
  const [cg, setCg] = useState([{ ...blankCG }, { ...blankCG }]);
  const [st, setSt] = useState([{ ...blankST }, { ...blankST }]);
  const [s, setS] = useState({ days: "2", crew: "5", skid: "0", mini: "0", vehicles: "3", mpd: "20", subs: "", tax: "5.5", margin: "30" });
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function calcCY() {
    let cy = 0;
    fw.forEach(a => {
      const sf = (parseFloat(a.l) || 0) * (parseFloat(a.w) || 0);
      const dep = (parseFloat(a.depth) || 4);
      cy += sf * (dep / 12) / 27;
    });
    cg.forEach(a => {
      const lf = parseFloat(a.lf) || 0;
      if (!lf) return;
      const h = (parseFloat(a.h) || 6) / 12;
      const tw = (parseFloat(a.tw) || 6) / 12;
      const bw = (parseFloat(a.bw) || 8) / 12;
      const gw = (parseFloat(a.gw) || 0) / 12;
      const gt = (parseFloat(a.gt) || 0) / 12;
      const curb_xs = h * (tw + bw) / 2;
      const gutter_xs = gw * gt;
      cy += (curb_xs + gutter_xs) * lf / 27;
    });
    st.forEach(a => {
      const n = parseFloat(a.n) || 0;
      if (!n) return;
      const w = parseFloat(a.w) || 4;
      const rise = (parseFloat(a.rise) || 7) / 12;
      const run = (parseFloat(a.run) || 12) / 12;
      cy += n * w * rise * run / 27;
    });
    return rnd2(cy);
  }

  function compute() {
    const total_cy = calcCY();
    if (!total_cy) return null;
    const days = parseFloat(s.days) || 1;
    const crew = parseFloat(s.crew) || 5;
    const tax_rate = (parseFloat(s.tax) || 5.5) / 100;
    const desired_margin = (parseFloat(s.margin) || 30) / 100;

    const concrete_cost = rnd2(total_cy * 220);
    const mat_pretax = concrete_cost;
    const mat_cost = rnd2(mat_pretax * (1 + tax_rate));

    const labor_cost = rnd2(days * crew * 8 * 45);

    const skid_days = parseFloat(s.skid) || 0;
    const mini_days = parseFloat(s.mini) || 0;
    const equip_pretax = rnd2((skid_days + mini_days) * 100);
    const equip_cost = rnd2(equip_pretax * (1 + tax_rate));

    const veh_cost = rnd2(days * (parseFloat(s.vehicles) || 3) * (parseFloat(s.mpd) || 20) * 1.25);
    const sub_cost = rnd2(parseFloat(s.subs) || 0);
    const sub_bid = sub_cost ? rnd2(sub_cost / 0.90) : 0;

    const direct = rnd2(mat_cost + labor_cost + equip_cost + veh_cost);
    const self_bid = rnd2(direct / (1 - desired_margin));
    const bid_price = rnd2(self_bid + sub_bid);
    const gross_profit = rnd2(bid_price - direct - sub_cost);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    return {
      bid_price, direct_costs: rnd2(direct + sub_cost), gross_profit, gross_margin,
      notes: `Concrete: ${total_cy} CY, ${days} days, ${crew}-person crew`,
      items: [{
        title: `Concrete — ${total_cy} CY (${days} day${days > 1 ? "s" : ""})`,
        work_type: "concrete",
        materials_cost: mat_cost,
        labor_cost,
        equipment_cost: equip_cost,
        vehicle_cost: veh_cost,
        sub_cost,
        total_cost: bid_price,
        sort_order: 1,
        data: { total_cy },
      }],
    };
  }

  useEffect(() => {
    cbRef.current(compute());
  }, [fw, cg, st, s]);

  const res = compute();
  const total_cy = calcCY();

  const updFW = (i, k, v) => setFw(a => a.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const updCG = (i, k, v) => setCg(a => a.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const updST = (i, k, v) => setSt(a => a.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const areaTitle = { fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 };

  return (
    <div>
      <div style={SEC}>Flatwork</div>
      {fw.map((a, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={areaTitle}>Area {i + 1}</div>
          <div style={GRID3}>
            <Field label="Length (ft)"><input type="number" min="0" value={a.l} onChange={e => updFW(i, "l", e.target.value)} style={INP} /></Field>
            <Field label="Width (ft)"><input type="number" min="0" value={a.w} onChange={e => updFW(i, "w", e.target.value)} style={INP} /></Field>
            <Field label="Depth (in)"><input type="number" min="1" value={a.depth} onChange={e => updFW(i, "depth", e.target.value)} style={INP} /></Field>
          </div>
          {a.l && a.w && (
            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
              {rnd2((parseFloat(a.l) || 0) * (parseFloat(a.w) || 0))} SF → {rnd2((parseFloat(a.l) || 0) * (parseFloat(a.w) || 0) * ((parseFloat(a.depth) || 4) / 12) / 27)} CY
            </div>
          )}
        </div>
      ))}

      <div style={SEC}>Curb &amp; Gutter</div>
      {cg.map((a, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={areaTitle}>Curb {i + 1}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
            {[["LF","lf"],["H (in)","h"],["Top W","tw"],["Base W","bw"],["Gutter W","gw"],["Gutter T","gt"]].map(([l, k]) => (
              <Field key={k} label={l}><input type="number" min="0" value={a[k]} onChange={e => updCG(i, k, e.target.value)} style={{ ...INP, padding: "6px 8px" }} /></Field>
            ))}
          </div>
        </div>
      ))}

      <div style={SEC}>Steps</div>
      {st.map((a, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={areaTitle}>Steps {i + 1}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {[["# Steps","n"],["Width (ft)","w"],["Rise (in)","rise"],["Run (in)","run"]].map(([l, k]) => (
              <Field key={k} label={l}><input type="number" min="0" value={a[k]} onChange={e => updST(i, k, e.target.value)} style={{ ...INP, padding: "6px 8px" }} /></Field>
            ))}
          </div>
        </div>
      ))}

      {total_cy > 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#15803d", marginBottom: 10 }}>
          Total concrete: <b>{total_cy} CY</b> · Approx material cost: <b>{f$(total_cy * 220)}</b>
        </div>
      )}

      <div style={SEC}>Crew, Equipment &amp; Costs</div>
      <div style={GRID3}>
        <Field label="Days"><input type="number" min="1" value={s.days} onChange={e => upd("days", e.target.value)} style={INP} /></Field>
        <Field label="Crew size"><input type="number" min="1" value={s.crew} onChange={e => upd("crew", e.target.value)} style={INP} /></Field>
        <Field label="Tax rate (%)"><input type="number" min="0" max="10" step="0.5" value={s.tax} onChange={e => upd("tax", e.target.value)} style={INP} /></Field>
        <Field label="Skid steer days"><input type="number" min="0" value={s.skid} onChange={e => upd("skid", e.target.value)} style={INP} /></Field>
        <Field label="Mini ex days"><input type="number" min="0" value={s.mini} onChange={e => upd("mini", e.target.value)} style={INP} /></Field>
        <Field label="Vehicles"><input type="number" min="0" value={s.vehicles} onChange={e => upd("vehicles", e.target.value)} style={INP} /></Field>
        <Field label="Miles/day"><input type="number" min="0" value={s.mpd} onChange={e => upd("mpd", e.target.value)} style={INP} /></Field>
        <Field label="Subs ($)"><input type="number" min="0" value={s.subs} onChange={e => upd("subs", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Margin (%)"><input type="number" min="0" max="100" value={s.margin} onChange={e => upd("margin", e.target.value)} style={INP} /></Field>
      </div>
      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Snow Removal Calculator ──────────────────────────────
const PLOW_RATES = { "w/salter": { cost: 100, price: 150 }, "w/o salter": { cost: 75, price: 125 } };
const SHOVEL_RATES = { "2-man": { cost: 35, price: 80 }, "4-man": { cost: 35, price: 80 } };
const SALT_TONS_PER_ACRE = 750 / 2000;
const SALT_COST_PER_TON = 75;
const SALT_MAT_MARKUP = 1.5;
const ICE_MELT_COVERAGE = 1000;
const ICE_MELT_COST_BAG = 10;
const ICE_MELT_LABOR_PER_BAG = 19.44;
const ICE_MELT_PRICE_BAG = 59;
const SKIDSTEER_SEASONAL = { cost: 1800, price: 3200 };

function SnowCalc({ onResult }) {
  const [s, setS] = useState({
    lot_sqft: "22000", sidewalk_sqft: "1800",
    plow_type: "w/salter", shovel_crew: "2-man", skidsteer: false,
    total_events_mo: "5", plow_events_mo: "2.5", months: "6",
    drive_time: "0.25", site_time_salt: "0.25", site_time_plow: "0.50",
  });
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function compute(s) {
    const lot = parseFloat(s.lot_sqft) || 0;
    const swk = parseFloat(s.sidewalk_sqft) || 0;
    if (!lot && !swk) return null;

    const total_ev = (parseFloat(s.total_events_mo) || 0) * (parseFloat(s.months) || 6);
    const plow_ev = (parseFloat(s.plow_events_mo) || 0) * (parseFloat(s.months) || 6);
    const drive = parseFloat(s.drive_time) || 0.25;
    const site_salt = parseFloat(s.site_time_salt) || 0.25;
    const site_plow = parseFloat(s.site_time_plow) || 0.50;
    const plow = PLOW_RATES[s.plow_type];
    const shovel = SHOVEL_RATES[s.shovel_crew];

    // Salt (all events)
    const salt_tons = lot / 43560 * SALT_TONS_PER_ACRE;
    const salt_mat_cost = salt_tons * SALT_COST_PER_TON;
    const salt_labor_cost = (drive + site_salt) * plow.cost;
    const salt_ev_cost = rnd2(salt_mat_cost + salt_labor_cost);
    const salt_ev_price = rnd2(salt_mat_cost * SALT_MAT_MARKUP + (drive + site_salt) * plow.price);
    const salt_season_cost = rnd2(salt_ev_cost * total_ev);
    const salt_season_price = rnd2(salt_ev_price * total_ev);

    // Plow (plow events only)
    const plow_ev_cost = rnd2(site_plow * plow.cost);
    const plow_ev_price = rnd2(site_plow * plow.price);
    const plow_season_cost = rnd2(plow_ev_cost * plow_ev);
    const plow_season_price = rnd2(plow_ev_price * plow_ev);

    // Ice melt (all events)
    const ice_bags = swk / ICE_MELT_COVERAGE;
    const ice_ev_cost = rnd2(ice_bags * (ICE_MELT_COST_BAG + ICE_MELT_LABOR_PER_BAG));
    const ice_ev_price = rnd2(ice_bags * ICE_MELT_PRICE_BAG);
    const ice_season_cost = rnd2(ice_ev_cost * total_ev);
    const ice_season_price = rnd2(ice_ev_price * total_ev);

    // Shovel (plow events only)
    const shovel_time = drive + site_salt + site_plow;
    const shovel_ev_cost = rnd2(shovel_time * shovel.cost);
    const shovel_ev_price = rnd2(shovel_time * shovel.price);
    const shovel_season_cost = rnd2(shovel_ev_cost * plow_ev);
    const shovel_season_price = rnd2(shovel_ev_price * plow_ev);

    // Skidsteer (seasonal flat)
    const skid_cost = s.skidsteer ? SKIDSTEER_SEASONAL.cost : 0;
    const skid_price = s.skidsteer ? SKIDSTEER_SEASONAL.price : 0;

    const direct = rnd2(salt_season_cost + plow_season_cost + ice_season_cost + shovel_season_cost + skid_cost);
    const bid_price = rnd2(salt_season_price + plow_season_price + ice_season_price + shovel_season_price + skid_price);
    const gross_profit = rnd2(bid_price - direct);
    const gross_margin = bid_price > 0 ? gross_profit / bid_price : 0;

    const items = [];
    if (plow_season_price > 0)
      items.push({ title: "Snow plowing", work_type: "snow", materials_cost: 0, labor_cost: plow_season_cost, equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: plow_season_price, sort_order: 1, data: {} });
    if (salt_season_price > 0)
      items.push({ title: "Salt application", work_type: "snow", materials_cost: salt_season_cost - rnd2((drive + site_salt) * plow.cost * total_ev), labor_cost: rnd2((drive + site_salt) * plow.cost * total_ev), equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: salt_season_price, sort_order: 2, data: {} });
    if (shovel_season_price > 0)
      items.push({ title: "Sidewalk shoveling", work_type: "snow", materials_cost: 0, labor_cost: shovel_season_cost, equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: shovel_season_price, sort_order: 3, data: {} });
    if (ice_season_price > 0)
      items.push({ title: "Ice melt", work_type: "snow", materials_cost: rnd2(ice_bags * ICE_MELT_COST_BAG * total_ev), labor_cost: rnd2(ice_bags * ICE_MELT_LABOR_PER_BAG * total_ev), equipment_cost: 0, vehicle_cost: 0, sub_cost: 0, total_cost: ice_season_price, sort_order: 4, data: {} });
    if (skid_price > 0)
      items.push({ title: "Skidsteer (seasonal)", work_type: "snow", materials_cost: 0, labor_cost: 0, equipment_cost: skid_cost, vehicle_cost: 0, sub_cost: 0, total_cost: skid_price, sort_order: 5, data: {} });

    return {
      bid_price, direct_costs: direct, gross_profit, gross_margin, items,
      notes: `Snow removal: ${lot.toLocaleString()} SF lot, ${swk.toLocaleString()} SF sidewalk, ${s.plow_type} plow, ${s.shovel_crew} shovel crew, ${s.total_events_mo}/mo, ${s.months}-month season`,
    };
  }

  useEffect(() => {
    cbRef.current(compute(s));
  }, [s]);

  const res = compute(s);
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
            <option value="w/salter">Plow w/ salter ($150/hr)</option>
            <option value="w/o salter">Plow w/o salter ($125/hr)</option>
          </select>
        </Field>
        <Field label="Shovel crew">
          <select value={s.shovel_crew} onChange={e => upd("shovel_crew", e.target.value)} style={sel}>
            <option value="2-man">2-man crew ($80/hr)</option>
            <option value="4-man">4-man crew ($80/hr)</option>
          </select>
        </Field>
        <Field label="Skidsteer">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input type="checkbox" id="skid" checked={s.skidsteer} onChange={e => upd("skidsteer", e.target.checked)} />
            <label htmlFor="skid" style={{ fontSize: 12, color: "#374151" }}>Include ($3,200/season)</label>
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
      <div style={GRID3}>
        <Field label="Drive time (round trip)"><input type="number" min="0" step="0.25" value={s.drive_time} onChange={e => upd("drive_time", e.target.value)} style={INP} /></Field>
        <Field label="Site time — salt"><input type="number" min="0" step="0.25" value={s.site_time_salt} onChange={e => upd("site_time_salt", e.target.value)} style={INP} /></Field>
        <Field label="Site time — plow"><input type="number" min="0" step="0.25" value={s.site_time_plow} onChange={e => upd("site_time_plow", e.target.value)} style={INP} /></Field>
      </div>

      {res && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#1e40af", margin: "10px 0" }}>
          {rnd2((parseFloat(s.lot_sqft) || 0) / 43560 * SALT_TONS_PER_ACRE).toFixed(3)} tons salt/event ·{" "}
          {rnd2((parseFloat(s.sidewalk_sqft) || 0) / ICE_MELT_COVERAGE).toFixed(1)} bags ice melt/event
        </div>
      )}
      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Landscape Maintenance Calculator ────────────────────
function LandscapeMaintenanceCalc({ onResult }) {
  const [s, setS] = useState({
    mow_area: "", mow_freq: "28", mow_ppv: "85",
    fert_apps: "4", fert_ppapp: "55",
    weed_ctrl: true, weed_annual: "161",
    bed_maint: true, bed_visits: "6", bed_ppv: "65",
    mulch_yds: "", mulch_py: "75", mulch_install: "45",
    shrub_count: "", shrub_per: "15",
    spring_cleanup: "", fall_cleanup: "",
    crew_hrs: "", crew_rate: "75",
    desired_margin: "40",
  });
  const upd = (k, v) => setS(p => ({ ...p, [k]: v }));
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  function compute(s) {
    const margin = (parseFloat(s.desired_margin) || 40) / 100;
    let annual_price = 0, annual_cost = 0;

    const mow_visits = parseFloat(s.mow_freq) ? Math.ceil(26 * 7 / parseFloat(s.mow_freq)) : 0;
    const mow_rev = mow_visits * (parseFloat(s.mow_ppv) || 0);
    annual_price += mow_rev;
    annual_cost += rnd2(mow_rev * (1 - margin));

    const fert_rev = (parseFloat(s.fert_apps) || 0) * (parseFloat(s.fert_ppapp) || 0);
    annual_price += fert_rev;
    annual_cost += rnd2(fert_rev * (1 - margin));

    if (s.weed_ctrl) {
      const wc_rev = parseFloat(s.weed_annual) || 0;
      annual_price += wc_rev;
      annual_cost += rnd2(wc_rev * (1 - margin));
    }

    if (s.bed_maint) {
      const bed_rev = (parseFloat(s.bed_visits) || 0) * (parseFloat(s.bed_ppv) || 0);
      annual_price += bed_rev;
      annual_cost += rnd2(bed_rev * (1 - margin));
    }

    const mulch_yds = parseFloat(s.mulch_yds) || 0;
    if (mulch_yds > 0) {
      const mulch_mat = mulch_yds * (parseFloat(s.mulch_py) || 75);
      const mulch_labor = mulch_yds * (parseFloat(s.mulch_install) || 45);
      const mulch_rev = rnd2((mulch_mat + mulch_labor) / (1 - margin));
      annual_price += mulch_rev;
      annual_cost += mulch_mat + mulch_labor;
    }

    const shrubs = parseFloat(s.shrub_count) || 0;
    if (shrubs > 0) {
      const shrub_rev = rnd2(shrubs * (parseFloat(s.shrub_per) || 15) * 2);
      annual_price += shrub_rev;
      annual_cost += rnd2(shrub_rev * (1 - margin));
    }

    const spring = parseFloat(s.spring_cleanup) || 0;
    const fall = parseFloat(s.fall_cleanup) || 0;
    annual_price += spring + fall;
    annual_cost += rnd2((spring + fall) * (1 - margin));

    const crew_rev = parseFloat(s.crew_hrs) ? rnd2(parseFloat(s.crew_hrs) * parseFloat(s.crew_rate || 75)) : 0;
    annual_price += crew_rev;
    annual_cost += rnd2(crew_rev * (1 - margin));

    if (!annual_price) return null;
    annual_price = rnd2(annual_price);
    annual_cost = rnd2(annual_cost);
    const gp = rnd2(annual_price - annual_cost);
    return {
      bid_price: annual_price, direct_costs: annual_cost, gross_profit: gp,
      gross_margin: annual_price ? gp / annual_price : 0,
      notes: `Landscape maintenance: annual contract`,
      items: [{
        title: "Landscape Maintenance — Annual Contract",
        work_type: "landscape_maintenance",
        materials_cost: 0, labor_cost: annual_cost, equipment_cost: 0, vehicle_cost: 0, sub_cost: 0,
        total_cost: annual_price, sort_order: 1, data: { mow_visits, fert_apps: s.fert_apps },
      }],
    };
  }

  useEffect(() => {
    cbRef.current(compute(s));
  }, [s]);

  const res = compute(s);

  return (
    <div>
      <div style={SEC}>Mowing</div>
      <div style={GRID3}>
        <Field label="Area (sqft)"><input type="number" min="0" value={s.mow_area} onChange={e => upd("mow_area", e.target.value)} placeholder="10000" style={INP} /></Field>
        <Field label="Frequency (days between)"><input type="number" min="7" value={s.mow_freq} onChange={e => upd("mow_freq", e.target.value)} style={INP} /></Field>
        <Field label="Price / visit ($)"><input type="number" min="0" value={s.mow_ppv} onChange={e => upd("mow_ppv", e.target.value)} style={INP} /></Field>
      </div>

      <div style={SEC}>Fertilization &amp; Weed Control</div>
      <div style={GRID3}>
        <Field label="Fert applications/yr"><input type="number" min="0" value={s.fert_apps} onChange={e => upd("fert_apps", e.target.value)} style={INP} /></Field>
        <Field label="Fert price / application"><input type="number" min="0" value={s.fert_ppapp} onChange={e => upd("fert_ppapp", e.target.value)} style={INP} /></Field>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
          <input type="checkbox" id="wc" checked={s.weed_ctrl} onChange={e => upd("weed_ctrl", e.target.checked)} />
          <label htmlFor="wc" style={{ fontSize: 12 }}>Weed control</label>
          {s.weed_ctrl && <input type="number" min="0" value={s.weed_annual} onChange={e => upd("weed_annual", e.target.value)} style={{ ...INP, width: 100 }} placeholder="$161/yr" />}
        </div>
      </div>

      <div style={SEC}>Bed Maintenance &amp; Mulch</div>
      <div style={GRID3}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
          <input type="checkbox" id="bed" checked={s.bed_maint} onChange={e => upd("bed_maint", e.target.checked)} />
          <label htmlFor="bed" style={{ fontSize: 12 }}>Bed maintenance</label>
        </div>
        {s.bed_maint && <>
          <Field label="Visits / year"><input type="number" min="0" value={s.bed_visits} onChange={e => upd("bed_visits", e.target.value)} style={INP} /></Field>
          <Field label="Price / visit ($)"><input type="number" min="0" value={s.bed_ppv} onChange={e => upd("bed_ppv", e.target.value)} style={INP} /></Field>
        </>}
        <Field label="Mulch (cubic yds)"><input type="number" min="0" step="0.5" value={s.mulch_yds} onChange={e => upd("mulch_yds", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Mulch $/yd (material)"><input type="number" min="0" value={s.mulch_py} onChange={e => upd("mulch_py", e.target.value)} style={INP} /></Field>
        <Field label="Install $/yd (labor)"><input type="number" min="0" value={s.mulch_install} onChange={e => upd("mulch_install", e.target.value)} style={INP} /></Field>
      </div>

      <div style={SEC}>Shrubs &amp; Cleanup</div>
      <div style={GRID3}>
        <Field label="Shrub count"><input type="number" min="0" value={s.shrub_count} onChange={e => upd("shrub_count", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="$/shrub trim"><input type="number" min="0" value={s.shrub_per} onChange={e => upd("shrub_per", e.target.value)} style={INP} /></Field>
        <div />
        <Field label="Spring cleanup ($)"><input type="number" min="0" value={s.spring_cleanup} onChange={e => upd("spring_cleanup", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Fall cleanup ($)"><input type="number" min="0" value={s.fall_cleanup} onChange={e => upd("fall_cleanup", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Desired margin (%)"><input type="number" min="0" max="100" value={s.desired_margin} onChange={e => upd("desired_margin", e.target.value)} style={INP} /></Field>
      </div>

      <div style={SEC}>Additional Crew Time</div>
      <div style={GRID2}>
        <Field label="Extra crew hours"><input type="number" min="0" step="0.5" value={s.crew_hrs} onChange={e => upd("crew_hrs", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Rate ($/hr)"><input type="number" min="0" value={s.crew_rate} onChange={e => upd("crew_rate", e.target.value)} style={INP} /></Field>
      </div>

      {res && <CalcResult direct_costs={res.direct_costs} bid_price={res.bid_price} margin={res.gross_margin} items={res.items} />}
    </div>
  );
}

// ─── Other / Generic Calculator ──────────────────────────
function OtherCalc({ onResult }) {
  const blank = { desc: "", mat: "", labor: "", equip: "", vehicle: "", sub: "" };
  const [lines, setLines] = useState([{ ...blank }]);
  const [margin, setMargin] = useState("35");
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const updLine = (i, k, v) => setLines(a => a.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const addLine = () => setLines(a => [...a, { ...blank }]);
  const remLine = i => setLines(a => a.filter((_, j) => j !== i));

  function compute() {
    const mg = (parseFloat(margin) || 35) / 100;
    let total_direct = 0;
    const items = lines.map((l, i) => {
      const mat = parseFloat(l.mat) || 0;
      const lab = parseFloat(l.labor) || 0;
      const eq = parseFloat(l.equip) || 0;
      const veh = parseFloat(l.vehicle) || 0;
      const sub = parseFloat(l.sub) || 0;
      const direct = rnd2(mat + lab + eq + veh);
      const sub_bid = rnd2(sub / (1 - 0.10));
      const self_bid = rnd2(direct / (1 - mg));
      const total = rnd2(self_bid + sub_bid);
      total_direct += rnd2(direct + sub);
      return {
        title: l.desc || `Line item ${i + 1}`,
        work_type: "other",
        materials_cost: mat, labor_cost: lab, equipment_cost: eq, vehicle_cost: veh, sub_cost: sub,
        total_cost: total, sort_order: i + 1, data: {},
      };
    }).filter(l => l.total_cost > 0);

    if (!items.length) return null;
    const bid_price = rnd2(items.reduce((s, l) => s + l.total_cost, 0));
    const gp = rnd2(bid_price - total_direct);
    return {
      bid_price, direct_costs: rnd2(total_direct), gross_profit: gp,
      gross_margin: bid_price ? gp / bid_price : 0,
      notes: items.map(l => l.title).join("; "),
      items,
    };
  }

  useEffect(() => { cbRef.current(compute()); }, [lines, margin]);

  const res = compute();

  return (
    <div>
      {lines.map((l, i) => (
        <div key={i} style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Line {i + 1}</span>
            {lines.length > 1 && <button type="button" onClick={() => remLine(i)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>✕</button>}
          </div>
          <Field label="Description">
            <input value={l.desc} onChange={e => updLine(i, "desc", e.target.value)} placeholder="Work description" style={{ ...INP, marginBottom: 6 }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
            {[["Material ($)","mat"],["Labor ($)","labor"],["Equipment ($)","equip"],["Vehicle ($)","vehicle"],["Sub ($)","sub"]].map(([lbl, k]) => (
              <Field key={k} label={lbl}>
                <input type="number" min="0" value={l[k]} onChange={e => updLine(i, k, e.target.value)} placeholder="0" style={{ ...INP, padding: "6px 8px" }} />
              </Field>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <button type="button" onClick={addLine} style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#475569" }}>
          + Add line
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ ...LBL, margin: 0 }}>Self-perform margin (%)</label>
          <input type="number" min="0" max="100" value={margin} onChange={e => setMargin(e.target.value)} style={{ ...INP, width: 70 }} />
        </div>
      </div>
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
