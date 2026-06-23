import { useState, useEffect } from "react";

const AGENT_URL = import.meta.env.VITE_AGENT_URL || "https://agent.jrboehlke.com";

const fDate = iso => {
  if (!iso) return "—";
  const d = iso.length > 10 ? iso : iso + "T12:00:00";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${parseInt(m)}/${parseInt(day)}/${y}`;
};

const f$ = n =>
  n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MaintenanceLogPortal() {
  const params = new URLSearchParams(window.location.search);
  const logId  = params.get("log");
  const token  = params.get("token");

  const [loading, setLoading]         = useState(true);
  const [logData, setLogData]         = useState(null);
  const [notFound, setNotFound]       = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!logId || !token) { setNotFound(true); setLoading(false); return; }
    fetch(`${AGENT_URL}/maintenance-log-data?log=${logId}&token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (data.report?.status === "complete") setAlreadyDone(true);
        setLogData(data);
      })
      .catch(status => {
        if (status === 404) setNotFound(true);
        else setError("Could not load maintenance log. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [logId, token]);

  async function handleComplete() {
    if (!logId || !token) {
      setError("Missing authentication credentials. Please use the original link.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${AGENT_URL}/maintenance-log-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_id: logId, token }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Failed to complete");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Styles (match ExpensePortal) ───────────────────────────
  const page = { minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "0 0 60px" };
  const card = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", padding: "20px 18px", margin: "16px 12px" };
  const hdr  = { background: "#1e293b", padding: "20px 16px 18px", display: "flex", alignItems: "center", gap: 12 };
  const btn  = { width: "100%", padding: "15px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 };

  const Header = () => (
    <div style={hdr}>
      <div style={{ background: "#0f766e", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>🔧</span>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>Maintenance Log</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>J.R. Boehlke, Inc.</div>
      </div>
    </div>
  );

  const Row = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", maxWidth: "60%", textAlign: "right" }}>{value}</span>
    </div>
  );

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
      <Header />
      <div style={{ ...card, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>Log Not Found</div>
        <div style={{ color: "#64748b", fontSize: 14 }}>This maintenance log link is invalid or has expired.</div>
      </div>
    </div>
  );

  if (alreadyDone || done) return (
    <div style={page}>
      <Header />
      <div style={{ ...card, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginBottom: 8 }}>Maintenance Log Complete</div>
        <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
          This maintenance record has been logged in FleetOps.
        </div>
      </div>
    </div>
  );

  const { log, report } = logData || {};
  const asset = log?.assets;
  const assetLabel = asset
    ? `${asset.name}${asset.year ? ` (${asset.year})` : ""}${asset.make && asset.model ? ` ${asset.make} ${asset.model}` : ""}`
    : "—";

  return (
    <div style={page}>
      <Header />

      <div style={{ ...card, background: "#fefce8", border: "1px solid #fde047" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#854d0e", marginBottom: 4 }}>Action Required</div>
        <div style={{ fontSize: 13, color: "#713f12", lineHeight: 1.5 }}>
          A maintenance log was pre-created for this expense. Review the details below and tap <strong>Confirm</strong> to complete it.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Log Details</div>
        <Row label="Asset"   value={assetLabel} />
        <Row label="Date"    value={fDate(log?.date)} />
        <Row label="Vendor"  value={log?.vendor || "—"} />
        <Row label="Cost"    value={f$(log?.external_cost)} />
        <Row label="Type"    value={log?.type || "—"} />
        {log?.notes && <Row label="Notes" value={log.notes} />}
      </div>

      {error && (
        <div style={{ margin: "0 12px", padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ padding: "0 12px" }}>
        <button onClick={handleComplete} disabled={submitting} style={{ ...btn, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Saving…" : "Confirm Maintenance Log"}
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
