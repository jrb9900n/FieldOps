import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AGENT_URL = import.meta.env.VITE_AGENT_URL || "https://agent.jrboehlke.com";

const COST_CATEGORIES = [
  "Purchase of material for a job",
  "Equipment rental for a job",
  "Purchase of consumables used by your crew but spread across multiple jobs (e.g. sealcoating spray tips, caution tape, survey stakes)",
  "Repair service for a specific vehicle or trailer",
  "Repair service for a specific tool or equipment",
  "Purchase of a tool or equipment",
  "Purchase of supplies or parts for a specific vehicle or trailer",
  "Purchase of supplies or parts for a specific tool or equipment",
  "Purchase of consumables for use in the shop, yard, or office (non vehicle-related; e.g. towels)",
  "Purchase of consumables for vehicles and equipment (grease, wiper fluid) excluding fuel",
  "Purchase of supplies for general field use (excluding tools; tiedown straps, cones, etc)",
  "Purchase of fuel",
  "Other",
];

const JOB_CATEGORIES = new Set([
  "Purchase of material for a job",
  "Equipment rental for a job",
]);

const ASSET_CATEGORIES = new Set([
  "Repair service for a specific vehicle or trailer",
  "Repair service for a specific tool or equipment",
  "Purchase of a tool or equipment",
  "Purchase of supplies or parts for a specific vehicle or trailer",
  "Purchase of supplies or parts for a specific tool or equipment",
  "Purchase of consumables for vehicles and equipment (grease, wiper fluid) excluding fuel",
  "Purchase of fuel",
]);

const f$ = n =>
  n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fDate = iso => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
};

export default function ExpensePortal({ token }) {
  const [loading, setLoading]         = useState(true);
  const [report, setReport]           = useState(null);
  const [assets, setAssets]           = useState([]);
  const [notFound, setNotFound]       = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Form state
  const [category, setCategory]     = useState("");
  const [jobNumber, setJobNumber]   = useState("");
  const [assetId, setAssetId]       = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [done, setDone]             = useState(null);
  const [error, setError]           = useState(null);

  const fileInputRef = useRef(null);

  const showJobSection   = JOB_CATEGORIES.has(category);
  const showAssetSection = ASSET_CATEGORIES.has(category);

  useEffect(() => {
    fetch(`${AGENT_URL}/expense-data?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ report: r, assets: a }) => {
        if (r.status !== "pending_employee") { setAlreadyDone(true); setReport(r); }
        else { setReport(r); setAssets(a); }
      })
      .catch(status => {
        if (status === 404) setNotFound(true);
        else setError("Could not load expense details. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = ev => setReceiptPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) { setError("Please select what this cost is related to."); return; }
    if (showAssetSection && !assetId) { setError("Please select the asset this expense is for."); return; }
    if (!description.trim()) { setError("Please describe the item or service purchased."); return; }
    if (!receiptFile && !report.receipt_path) { setError("Please upload a photo of the receipt."); return; }

    setError(null);
    setSubmitting(true);

    try {
      // Upload receipt to Supabase Storage (skip if already uploaded via email)
      let path = report.receipt_path || null;
      if (!path) {
        setUploadProgress("Uploading receipt…");
        const ext = receiptFile.name.split(".").pop() || "jpg";
        path = `${token}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("expense-receipts")
          .upload(path, receiptFile, { contentType: receiptFile.type, upsert: false });
        if (uploadErr) throw new Error(`Receipt upload failed: ${uploadErr.message}`);
      }

      setUploadProgress("Saving…");

      // Submit form to agent server
      const res = await fetch(`${AGENT_URL}/expense-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          category: category === "Other" ? "Other" : category,
          job_number: showJobSection ? jobNumber.trim() || null : null,
          asset_id: showAssetSection ? assetId || null : null,
          item_description: description.trim(),
          receipt_path: path,
          receipt_url: null,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Submission failed");

      setDone(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  // ── Styles ─────────────────────────────────────────────────
  const page  = { minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "0 0 60px" };
  const card  = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", padding: "20px 18px", margin: "16px 12px" };
  const label = { fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 };
  const input = { width: "100%", padding: "11px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 15, color: "#0f172a", background: "#fff", outline: "none", boxSizing: "border-box" };
  const select_s = { ...input, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 };
  const btn   = { width: "100%", padding: "15px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 };
  const hdr   = { background: "#1e293b", padding: "20px 16px 18px", display: "flex", alignItems: "center", gap: 12 };
  const preRow = (lbl, val) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lbl}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{val}</span>
    </div>
  );

  // ── States ─────────────────────────────────────────────────

  if (loading) return (
    <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#64748b" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        Loading…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound) return (
    <div style={page}>
      <div style={hdr}><span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>JRB Expense Portal</span></div>
      <div style={{ ...card, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>Link Not Found</div>
        <div style={{ color: "#64748b", fontSize: 14 }}>This expense link is invalid or has expired. Contact your manager if you believe this is an error.</div>
      </div>
    </div>
  );

  if (alreadyDone) return (
    <div style={page}>
      <div style={hdr}><span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>JRB Expense Portal</span></div>
      <div style={{ ...card, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>Already Submitted</div>
        <div style={{ color: "#64748b", fontSize: 14 }}>
          This expense report has already been submitted
          {report?.submitted_at ? ` on ${fDate(report.submitted_at.slice(0, 10))}` : ""}.
        </div>
      </div>
    </div>
  );

  if (done) return (
    <div style={page}>
      <div style={hdr}><span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>JRB Expense Portal</span></div>
      <div style={{ ...card, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginBottom: 8 }}>Receipt Submitted!</div>
        <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
          Your expense report has been received.
        </div>
        {done.status === "pending_maintenance_log" && (
          <div style={{ marginTop: 20, background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "14px 16px", textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#854d0e", marginBottom: 6 }}>Action Required</div>
            <div style={{ fontSize: 13, color: "#713f12", lineHeight: 1.5 }}>
              Because this expense is for a specific asset, you must complete a maintenance log entry in FleetOps.
              A log has been pre-created for you — tap below to review and complete it.
            </div>
            <a
              href={done.maintenance_log_url || "https://fieldops.jrboehlke.com/log"}
              style={{ display: "block", marginTop: 12, background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "12px 16px", borderRadius: 8, fontWeight: 700, fontSize: 14, textAlign: "center" }}
            >
              Complete Maintenance Log →
            </a>
          </div>
        )}
      </div>
    </div>
  );

  // ── Main Form ──────────────────────────────────────────────

  return (
    <div style={page}>
      {/* Header */}
      <div style={hdr}>
        <div style={{ background: "#3b82f6", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>💳</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>Credit Card Expense</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>J.R. Boehlke, Inc.</div>
        </div>
      </div>

      {/* Pre-filled charge details */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Charge Details</div>
        {preRow("Employee", report.employee_name || "—")}
        {preRow("Card", `...${report.card_last_four}`)}
        {preRow("Date", fDate(report.transaction_date))}
        {preRow("Vendor", report.vendor || "—")}
        {preRow("Amount", f$(report.amount))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1 — Cost category */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Section 1 of 4 — Cost Type</div>
          <label style={label}>What is this cost related to? *</label>
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setJobNumber(""); setAssetId(""); }}
            required
            style={select_s}
          >
            <option value="">— Select one —</option>
            {COST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Section 2 — Job info (conditional) */}
        {showJobSection && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Section 2 of 4 — Project Info</div>
            <label style={label}>Job number or project name</label>
            <input
              type="text"
              value={jobNumber}
              onChange={e => setJobNumber(e.target.value)}
              placeholder="e.g. 24-1042 or Smith Driveway"
              style={input}
            />
          </div>
        )}

        {/* Section 3 — Asset info (conditional) */}
        {showAssetSection && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Section 3 of 4 — Asset Info</div>
            <label style={label}>Vehicle, trailer, or equipment *</label>
            <select
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              required={showAssetSection}
              style={select_s}
            >
              <option value="">— Select asset —</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>
                  {a.id} — {a.name}{a.year ? ` (${a.year})` : ""}{a.make && a.model ? ` ${a.make} ${a.model}` : ""}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              A maintenance log will be created in FleetOps for this asset.
            </div>
          </div>
        )}

        {/* Section 4 — Description + receipt */}
        {category && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              Section {showJobSection || showAssetSection ? "4" : "2"} of {showJobSection || showAssetSection ? "4" : "2"} — Final Information
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={label}>Describe the item or service purchased *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                rows={3}
                placeholder="e.g. 2 bags hydraulic cement, 1 tube black sealant"
                style={{ ...input, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            <div>
              <label style={label}>Receipt photo *</label>
              {report.receipt_path && !receiptPreview ? (
                <div style={{ border: "2px solid #bbf7d0", borderRadius: 10, padding: "16px", background: "#f0fdf4", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Receipt received via email</div>
                    <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>Your emailed receipt has been attached to this report.</div>
                  </div>
                </div>
              ) : !receiptPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: "2px dashed #cbd5e1", borderRadius: 10, padding: "28px 16px", textAlign: "center", cursor: "pointer", background: "#f8fafc" }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Take or upload a photo</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Tap to open camera or choose from your photos</div>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <img src={receiptPreview} alt="Receipt preview" style={{ width: "100%", borderRadius: 10, border: "1px solid #e2e8f0", display: "block" }} />
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); fileInputRef.current.value = ""; }}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: "0 12px", padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        {category && (
          <div style={{ padding: "0 12px" }}>
            <button type="submit" disabled={submitting} style={{ ...btn, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? (uploadProgress || "Submitting…") : "Submit Expense Report"}
            </button>
          </div>
        )}
      </form>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        select:focus, input:focus, textarea:focus { border-color: #3b82f6; outline: none; }
      `}</style>
    </div>
  );
}
