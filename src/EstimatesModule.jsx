import { useState, useEffect, useMemo } from "react";

// ─── Helpers ─────────────────────────────────────────────────────
const f$ = n => n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fDate = iso => { if (!iso) return "—"; const [y, m, d] = iso.split("T")[0].split("-"); return `${parseInt(m)}/${parseInt(d)}/${y}`; };

const EST_STATUS = {
  draft:     { label: "Draft",     color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.25)" },
  submitted: { label: "Submitted", color: "#2563eb", bg: "rgba(37,99,235,0.1)",   border: "rgba(37,99,235,0.25)"  },
  approved:  { label: "Approved",  color: "#16a34a", bg: "rgba(22,163,74,0.1)",   border: "rgba(22,163,74,0.25)"  },
  declined:  { label: "Declined",  color: "#dc2626", bg: "rgba(220,38,38,0.1)",   border: "rgba(220,38,38,0.25)"  },
};
const WO_STATUS = {
  draft:    { label: "Draft",    color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.25)" },
  issued:   { label: "Issued",   color: "#ea580c", bg: "rgba(234,88,12,0.1)",   border: "rgba(234,88,12,0.25)"  },
  complete: { label: "Complete", color: "#16a34a", bg: "rgba(22,163,74,0.1)",   border: "rgba(22,163,74,0.25)"  },
};

const WORK_TYPE_LABELS = {
  concrete: "Concrete", asphalt: "Asphalt",
  sealcoat: "Sealcoating (Commercial)", sealcoat_residential: "Sealcoating (Residential)",
  landscape_maintenance: "Landscape Maintenance", landscape_construction: "Landscape Construction",
  snow: "Snow", other: "Other",
};

function StatusPill({ status, map }) {
  const s = map[status] || { label: status, color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.25)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ─── Login form ───────────────────────────────────────────────────
export function LoginGate({ supabase, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inp = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 13px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    onLogin();
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "36px 40px", width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#ea580c,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff" }}>E</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Estimating Access</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Sign in with your JRB account</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@jrboehlke.com" style={inp} autoComplete="email" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} autoComplete="current-password" />
          </div>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#b91c1c" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ background: loading ? "#94a3b8" : "#ea580c", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Estimate detail drawer ───────────────────────────────────────
function EstimateDrawer({ estimate, supabase, onClose, onWorkOrderCreated }) {
  const [items, setItems] = useState([]);
  const [workOrder, setWorkOrder] = useState(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!estimate) return;
    setLoadingItems(true);
    Promise.all([
      supabase.from("estimate_bid_items").select("*").eq("estimate_id", estimate.id).order("sort_order"),
      supabase.from("work_orders").select("*").eq("estimate_id", estimate.id).maybeSingle(),
    ]).then(([{ data: bidItems }, { data: wo }]) => {
      setItems(bidItems || []);
      setWorkOrder(wo);
      setLoadingItems(false);
    });
  }, [estimate, supabase]);

  async function createWorkOrder() {
    setCreating(true);
    const { data, error } = await supabase.from("work_orders").insert({ estimate_id: estimate.id }).select().single();
    if (!error && data) { setWorkOrder(data); onWorkOrderCreated(); }
    setCreating(false);
  }

  if (!estimate) return null;
  const row = (label, value) => value ? (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ width: 140, flexShrink: 0, fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#0f172a", flex: 1 }}>{value}</div>
    </div>
  ) : null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxWidth: 580, height: "100%", overflowY: "auto", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{estimate.client_name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{estimate.client_address}{estimate.client_city ? `, ${estimate.client_city}` : ""}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <StatusPill status={estimate.status} map={EST_STATUS} />
                <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, textTransform: "capitalize" }}>{estimate.opportunity_type}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bid Price</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#ea580c", letterSpacing: "-0.02em" }}>{f$(estimate.bid_price)}</div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", padding: "0 4px", marginTop: 4 }}>✕</button>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 20px", flex: 1 }}>
          {/* Action buttons */}
          {estimate.status === "approved" && !workOrder && (
            <button onClick={createWorkOrder} disabled={creating} style={{ display: "block", width: "100%", background: creating ? "#94a3b8" : "#ea580c", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", marginBottom: 16 }}>
              {creating ? "Creating…" : "Create Work Order"}
            </button>
          )}
          {workOrder && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em" }}>Work Order</div>
                <StatusPill status={workOrder.status} map={WO_STATUS} />
              </div>
              {workOrder.issued_at && <div style={{ fontSize: 11, color: "#64748b" }}>Issued {fDate(workOrder.issued_at)}</div>}
              {workOrder.completed_at && <div style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>Completed {fDate(workOrder.completed_at)}</div>}
            </div>
          )}

          {/* Details */}
          {row("Estimator", estimate.estimator_name)}
          {row("County", estimate.county)}
          {row("Duration", estimate.expected_duration_days ? `${estimate.expected_duration_days} days` : null)}
          {row("Timing", estimate.expected_timing)}
          {row("Nearest ER", estimate.nearest_er)}
          {row("Created", fDate(estimate.created_at))}

          {/* Financials */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", margin: "16px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Financials</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                ["Direct Costs", f$(estimate.direct_costs), "#0f172a"],
                ["Gross Profit", f$(estimate.gross_profit), "#15803d"],
                ["Bid Price", f$(estimate.bid_price), "#ea580c"],
              ].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
              Margin target: {estimate.gross_margin_target != null ? `${(estimate.gross_margin_target * 100).toFixed(0)}%` : "—"}
            </div>
          </div>

          {/* Bid items */}
          {loadingItems ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px", fontSize: 12 }}>Loading scope…</div>
          ) : items.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Scope of Work</div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                {items.map((item, i) => (
                  <div key={item.id} style={{ padding: "11px 14px", borderBottom: i < items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{WORK_TYPE_LABELS[item.work_type] || item.work_type}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", fontFamily: "monospace" }}>{f$(item.total_cost)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      {[["Mat", item.materials_cost], ["Labor", item.labor_cost], ["Equip", item.equipment_cost + item.vehicle_cost], ["Sub", item.sub_cost]]
                        .filter(([, v]) => v > 0)
                        .map(([l, v]) => (
                          <span key={l} style={{ fontSize: 10.5, color: "#94a3b8" }}>{l}: {f$(v)}</span>
                        ))}
                    </div>
                  </div>
                ))}
                <div style={{ padding: "11px 14px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Total Bid Price</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#ea580c", fontFamily: "monospace" }}>{f$(estimate.bid_price)}</span>
                </div>
              </div>
            </div>
          )}

          {estimate.notes && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{estimate.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Work Order detail drawer ─────────────────────────────────────
function WorkOrderDrawer({ wo, supabase, onClose, onUpdated }) {
  const [issuing, setIssuing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completedDate, setCompletedDate] = useState("");
  const [dispatcherNote, setDispatcherNote] = useState(wo?.dispatcher_note || "");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setDispatcherNote(wo?.dispatcher_note || "");
  }, [wo]);

  if (!wo) return null;
  const est = wo.estimates;

  async function issueWO() {
    setIssuing(true);
    const { error } = await supabase.from("work_orders").update({
      status: "issued",
      issued_at: new Date().toISOString(),
    }).eq("id", wo.id);
    if (!error) onUpdated();
    setIssuing(false);
  }

  async function completeWO() {
    setCompleting(true);
    const { error } = await supabase.from("work_orders").update({
      status: "complete",
      completed_at: completedDate ? new Date(completedDate).toISOString() : new Date().toISOString(),
    }).eq("id", wo.id);
    if (!error) onUpdated();
    setCompleting(false);
  }

  async function saveNote() {
    setSavingNote(true);
    await supabase.from("work_orders").update({ dispatcher_note: dispatcherNote }).eq("id", wo.id);
    setSavingNote(false);
  }

  const inp = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 13px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxWidth: 580, height: "100%", overflowY: "auto", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{est?.client_name || "Work Order"}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{est?.client_address}{est?.client_city ? `, ${est.client_city}` : ""}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <StatusPill status={wo.status} map={WO_STATUS} />
                {est?.opportunity_type && <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, textTransform: "capitalize" }}>{est.opportunity_type}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bid Price</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#ea580c", letterSpacing: "-0.02em" }}>{f$(est?.bid_price)}</div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", padding: "0 4px", marginTop: 4 }}>✕</button>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Timeline */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Timeline</div>
            {[
              ["Created", fDate(wo.created_at), "#64748b"],
              wo.issued_at && ["Issued", `${fDate(wo.issued_at)}${wo.issued_by ? ` by ${wo.issued_by}` : ""}`, "#ea580c"],
              wo.completed_at && ["Completed", fDate(wo.completed_at), "#16a34a"],
            ].filter(Boolean).map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", gap: 10, fontSize: 12, marginBottom: 4 }}>
                <span style={{ width: 80, color: "#94a3b8", fontWeight: 600, flexShrink: 0 }}>{l}</span>
                <span style={{ color: c, fontWeight: l === "Completed" ? 700 : 400 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {wo.status === "draft" && (
            <button onClick={issueWO} disabled={issuing} style={{ display: "block", width: "100%", background: issuing ? "#94a3b8" : "#ea580c", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: issuing ? "not-allowed" : "pointer", marginBottom: 16 }}>
              {issuing ? "Issuing…" : "Issue Work Order"}
            </button>
          )}
          {wo.status === "issued" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)} style={{ ...inp, flex: 1 }} />
              <button onClick={completeWO} disabled={completing} style={{ background: completing ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 700, cursor: completing ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                {completing ? "Saving…" : "Mark Complete"}
              </button>
            </div>
          )}

          {/* Dispatcher note */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Dispatcher Note</div>
            <textarea value={dispatcherNote} onChange={e => setDispatcherNote(e.target.value)} rows={4}
              style={{ ...inp, resize: "none", lineHeight: 1.5 }}
              placeholder="Access instructions, site contact, hazards, special timing…" />
            <button onClick={saveNote} disabled={savingNote} style={{ marginTop: 6, background: savingNote ? "#94a3b8" : "#1e293b", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: savingNote ? "not-allowed" : "pointer" }}>
              {savingNote ? "Saved" : "Save Note"}
            </button>
          </div>

          {/* Estimate summary */}
          {est && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Estimate Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Estimator", est.estimator_name],
                  ["Duration", est.expected_duration_days ? `${est.expected_duration_days} days` : null],
                  ["Timing", est.expected_timing],
                  ["County", est.county],
                  ["Gross Profit", f$(est.gross_profit)],
                  ["Margin", est.gross_margin_target != null ? `${(est.gross_margin_target * 100).toFixed(0)}%` : null],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {est.nearest_er && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nearest ER</div>
                  <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 3 }}>{est.nearest_er}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Estimates list view ──────────────────────────────────────────
export function EstimatesView({ supabase }) {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [woRefresh, setWoRefresh] = useState(0);

  function load() {
    setLoading(true);
    Promise.resolve(
      supabase.from("estimates").select("*").order("created_at", { ascending: false })
    ).then(({ data, error: err }) => {
      if (err) { setError(err.message); return; }
      setEstimates(data || []);
    }).catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [woRefresh]);

  const filtered = useMemo(() => {
    let e = estimates;
    if (statusFilter !== "all") e = e.filter(x => x.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      e = e.filter(x => [x.client_name, x.client_address, x.client_city].some(f => (f || "").toLowerCase().includes(q)));
    }
    return e;
  }, [estimates, statusFilter, search]);

  const counts = useMemo(() => ({
    all: estimates.length,
    draft: estimates.filter(e => e.status === "draft").length,
    submitted: estimates.filter(e => e.status === "submitted").length,
    approved: estimates.filter(e => e.status === "approved").length,
    declined: estimates.filter(e => e.status === "declined").length,
  }), [estimates]);

  const sel = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", cursor: "pointer" };
  const TH = ({ children, right }) => <th style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", textAlign: right ? "right" : "left", whiteSpace: "nowrap" }}>{children}</th>;
  const TD = ({ children, right, mono, bold, color }) => <td style={{ padding: "9px 12px", fontSize: 12, color: color || "#374151", textAlign: right ? "right" : "left", fontFamily: mono ? "monospace" : "inherit", fontWeight: bold ? 700 : 400 }}>{children}</td>;

  return (
    <div>
      {selected && (
        <EstimateDrawer
          estimate={selected} supabase={supabase}
          onClose={() => setSelected(null)}
          onWorkOrderCreated={() => { setSelected(null); setWoRefresh(r => r + 1); }}
        />
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="Search client or address…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...sel, width: 220, padding: "6px 12px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sel}>
          <option value="all">All ({counts.all})</option>
          <option value="draft">Draft ({counts.draft})</option>
          <option value="submitted">Submitted ({counts.submitted})</option>
          <option value="approved">Approved ({counts.approved})</option>
          <option value="declined">Declined ({counts.declined})</option>
        </select>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{filtered.length} of {estimates.length} estimates</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <TH>Client</TH><TH>Type</TH><TH right>Bid Price</TH>
                <TH>Estimator</TH><TH>Status</TH><TH>Created</TH><TH />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</td></tr>}
              {!loading && error && <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#dc2626", fontSize: 13 }}>Error: {error}</td></tr>}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  {estimates.length === 0 ? "No estimates yet." : "No estimates match your filter."}
                </td></tr>
              )}
              {!loading && !error && filtered.map(est => (
                <tr key={est.id} onClick={() => setSelected(est)}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <TD>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 12.5 }}>{est.client_name}</div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>{est.client_address}{est.client_city ? `, ${est.client_city}` : ""}</div>
                  </TD>
                  <TD><span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{est.opportunity_type}</span></TD>
                  <TD right mono bold color="#ea580c">{f$(est.bid_price)}</TD>
                  <TD color="#64748b">{est.estimator_name}</TD>
                  <TD><StatusPill status={est.status} map={EST_STATUS} /></TD>
                  <TD color="#94a3b8">{fDate(est.created_at)}</TD>
                  <TD><span style={{ fontSize: 11, color: "#94a3b8" }}>›</span></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Work Orders list view ────────────────────────────────────────
export function WorkOrdersView({ supabase }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  function load() {
    setLoading(true);
    Promise.resolve(
      supabase.from("work_orders")
        .select("*, estimates(client_name, client_address, client_city, opportunity_type, bid_price, gross_profit, gross_margin_target, estimator_name, expected_duration_days, expected_timing, county, nearest_er, notes)")
        .order("created_at", { ascending: false })
    ).then(({ data, error: err }) => {
      if (err) { setError(err.message); return; }
      setOrders(data || []);
    }).catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let o = orders;
    if (statusFilter !== "all") o = o.filter(x => x.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      o = o.filter(x => [x.estimates?.client_name, x.estimates?.client_address].some(f => (f || "").toLowerCase().includes(q)));
    }
    return o;
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => ({
    all: orders.length,
    draft: orders.filter(o => o.status === "draft").length,
    issued: orders.filter(o => o.status === "issued").length,
    complete: orders.filter(o => o.status === "complete").length,
  }), [orders]);

  const sel = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", cursor: "pointer" };
  const TH = ({ children, right }) => <th style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", textAlign: right ? "right" : "left", whiteSpace: "nowrap" }}>{children}</th>;
  const TD = ({ children, right, mono, bold, color }) => <td style={{ padding: "9px 12px", fontSize: 12, color: color || "#374151", textAlign: right ? "right" : "left", fontFamily: mono ? "monospace" : "inherit", fontWeight: bold ? 700 : 400 }}>{children}</td>;

  return (
    <div>
      {selected && (
        <WorkOrderDrawer
          wo={selected} supabase={supabase}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load(); }}
        />
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="Search client or address…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...sel, width: 220, padding: "6px 12px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sel}>
          <option value="all">All ({counts.all})</option>
          <option value="draft">Draft ({counts.draft})</option>
          <option value="issued">Issued ({counts.issued})</option>
          <option value="complete">Complete ({counts.complete})</option>
        </select>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{filtered.length} of {orders.length} orders</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <TH>Client</TH><TH>Type</TH><TH right>Bid Price</TH>
                <TH>Issued</TH><TH>Completed</TH><TH>Status</TH><TH />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</td></tr>}
              {!loading && error && <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#dc2626", fontSize: 13 }}>Error: {error}</td></tr>}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  {orders.length === 0 ? "No work orders yet." : "No work orders match your filter."}
                </td></tr>
              )}
              {!loading && !error && filtered.map(wo => (
                <tr key={wo.id} onClick={() => setSelected(wo)}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <TD>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 12.5 }}>{wo.estimates?.client_name || "—"}</div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>{wo.estimates?.client_address}</div>
                  </TD>
                  <TD><span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{wo.estimates?.opportunity_type || "—"}</span></TD>
                  <TD right mono bold color="#ea580c">{f$(wo.estimates?.bid_price)}</TD>
                  <TD color="#64748b">{wo.issued_at ? fDate(wo.issued_at) : "—"}</TD>
                  <TD color={wo.completed_at ? "#16a34a" : "#cbd5e1"} bold={!!wo.completed_at}>{wo.completed_at ? fDate(wo.completed_at) : "—"}</TD>
                  <TD><StatusPill status={wo.status} map={WO_STATUS} /></TD>
                  <TD><span style={{ fontSize: 11, color: "#94a3b8" }}>›</span></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
