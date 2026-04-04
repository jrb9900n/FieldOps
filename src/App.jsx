import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Constants ────────────────────────────────────────────────
const STATUS = {
  1: { label:"Open",     dot:"#f59e0b", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.25)" },
  3: { label:"Complete", dot:"#10b981", bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.25)" },
  5: { label:"Skipped",  dot:"#ef4444", bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.25)"  },
};

// ─── Helpers ──────────────────────────────────────────────────
const f$ = n => n==null?"—":"$"+Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fH = n => n==null?"—":Number(n).toFixed(2)+"h";
const rph = jobs => { const rev=jobs.reduce((s,j)=>s+(j.Amount||0),0); const hrs=jobs.reduce((s,j)=>s+(j.TotalManHours||0),0); return hrs>0?rev/hrs:0; };
const pct = (a,b) => b>0?Math.round(100*a/b):0;
const fDate = iso => { if(!iso)return"—"; const [y,m,d]=iso.split("-"); return `${parseInt(m)}/${parseInt(d)}/${y}`; };

// ─── Multi-select dropdown ─────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, width=160 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const allSelected = selected.length === 0;
  const displayLabel = allSelected ? `All ${label}` : selected.length === 1 ? selected[0] : `${selected.length} ${label}`;
  const toggle = val => {
    if(selected.includes(val)) onChange(selected.filter(x=>x!==val));
    else onChange([...selected, val]);
  };
  const sel = {background:"#f1f5f9",color:"#1e293b",border:"1px solid #e2e8f0",borderRadius:6,padding:"6px 10px",fontSize:12,cursor:"pointer"};
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{...sel,display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",minWidth:width}}>
        <span style={{flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis"}}>{displayLabel}</span>
        <span style={{fontSize:9,color:"#94a3b8"}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.10)",zIndex:200,minWidth:Math.max(width,180),maxHeight:280,overflowY:"auto"}}>
          <div onClick={()=>onChange([])} style={{padding:"7px 12px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid #f1f5f9",background:allSelected?"#eff6ff":"#fff",color:allSelected?"#1d4ed8":"#0f172a",fontWeight:allSelected?700:400}}>
            <span style={{width:14,height:14,border:"1.5px solid",borderColor:allSelected?"#1d4ed8":"#cbd5e1",borderRadius:3,background:allSelected?"#1d4ed8":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,color:"#fff"}}>{allSelected?"✓":""}</span>
            All {label}
          </div>
          {options.map(opt=>{
            const chk=selected.includes(opt);
            return(
              <div key={opt} onClick={()=>toggle(opt)} style={{padding:"7px 12px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:chk?"#eff6ff":"#fff",color:chk?"#1d4ed8":"#0f172a"}}>
                <span style={{width:14,height:14,border:"1.5px solid",borderColor:chk?"#1d4ed8":"#cbd5e1",borderRadius:3,background:chk?"#1d4ed8":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,color:"#fff"}}>{chk?"✓":""}</span>
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────
const Badge = ({status}) => {
  const s=STATUS[status]||{label:String(status),dot:"#6b7280",bg:"rgba(107,114,128,0.1)",border:"rgba(107,114,128,0.25)"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:700,letterSpacing:"0.05em",color:s.dot,background:s.bg,border:`1px solid ${s.border}`}}><span style={{width:5,height:5,borderRadius:"50%",background:s.dot,flexShrink:0}}/>{s.label}</span>;
};

const Pill = ({children, color="#3b82f6"}) => (
  <span style={{background:`${color}18`,color,border:`1px solid ${color}30`,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,letterSpacing:"0.03em"}}>{children}</span>
);

function KPITile({label, value, sub, accent="#3b82f6", warn=false}) {
  return (
    <div style={{background:"#f8fafc",border:`1px solid #e2e8f0`,borderRadius:10,padding:"18px 20px",borderTop:`3px solid ${warn?"#ef4444":accent}`,display:"flex",flexDirection:"column",gap:3}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#64748b",textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:warn?"#ef4444":"#0f172a",letterSpacing:"-0.02em",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ─── Job Detail Modal ──────────────────────────────────────────
function JobDetailModal({ job, onClose }) {
  if(!job) return null;
  const comments = job.JobComments || [];
  const row = (label, value) => value ? (
    <div style={{display:"flex",gap:12,padding:"6px 0",borderBottom:"1px solid #f1f5f9"}}>
      <div style={{width:160,flexShrink:0,fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",paddingTop:1}}>{label}</div>
      <div style={{fontSize:13,color:"#0f172a",flex:1}}>{value}</div>
    </div>
  ) : null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#0f172a"}}>{job.Client}</div>
            <div style={{fontSize:12,color:"#64748b"}}>{job.Address}, {job.City} · {fDate(job.StartDate)}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94a3b8",padding:"0 4px"}}>✕</button>
        </div>
        <div style={{padding:"16px 20px"}}>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <Badge status={job.Status}/>
            <Pill>{job.Service}</Pill>
            {job.Assigned&&<Pill color="#8b5cf6">{job.Assigned}</Pill>}
            {job.ScheduleType==="Snow"&&<Pill color="#0ea5e9">❄ Snow</Pill>}
          </div>
          {row("Date", fDate(job.StartDate))}
          {row("Time", job.StartTime&&job.EndTime ? `${job.StartTime} – ${job.EndTime}` : job.StartTime||null)}
          {row("Date Completed", fDate(job.DateCompleted))}
          {row("Completed By", job.CompletedUsername)}
          {row("Service", job.Service)}
          {row("Crew", job.Assigned)}
          {row("Sales Rep", job.SalesRep)}
          {row("Address", `${job.Address||""}, ${job.City||""}, ${job.State||""} ${job.Zip||""}`)}
          {job.Latitude&&row("Coordinates", `${job.Latitude}, ${job.Longitude}`)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,margin:"14px 0"}}>
            {[["Revenue",f$(job.Amount),"#059669"],["Rate",f$(job.Rate),"#64748b"],["Hours",fH(job.TotalManHours),"#2563eb"],["Budget Hrs",fH(job.BudgetedHours),"#64748b"],["Priority",job.Priority||"—","#64748b"],["Rescheduled",job.IsRescheduled?"Yes":"No",job.IsRescheduled?"#ef4444":"#64748b"]].map(([l,v,c])=>(
              <div key={l} style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,fontWeight:600,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
                <div style={{fontSize:15,fontWeight:700,color:c,marginTop:2}}>{v}</div>
              </div>
            ))}
          </div>
          {job.InternalSchedulingNotes&&(
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Scheduling Notes</div>
              <div style={{fontSize:13,color:"#78350f",lineHeight:1.5}}>{job.InternalSchedulingNotes}</div>
            </div>
          )}
          {comments.length>0&&(
            <div style={{marginTop:10}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Comments ({comments.length})</div>
              {comments.map((c,i)=>{
                const dt=c.DateTimeSeconds;
                const ts=dt?`${dt.Month}/${dt.Day}/${dt.Year} ${dt.Hour}:${String(dt.Minute).padStart(2,"0")}`:c.date||"";
                return(
                  <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<comments.length-1?"1px solid #f1f5f9":"none"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"#e2e8f0",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#64748b"}}>{(c.UserName||c.user||"?")[0]}</div>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:"#0f172a"}}>{c.UserName||c.user} <span style={{color:"#94a3b8",fontWeight:400}}>{ts}</span></div>
                      <div style={{fontSize:12,color:"#374151",marginTop:2}}>{c.Comment||c.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {job.InvoiceID&&row("Invoice ID", job.InvoiceID)}
          {job.CustomerID&&row("Customer ID", job.CustomerID)}
        </div>
      </div>
    </div>
  );
}

// ─── Snow Event View ───────────────────────────────────────────
function SnowEventView({ jobs }) {
  // Group by customer_id to find multi-service properties
  const byCustomer = useMemo(()=>{
    const m = {};
    jobs.forEach(j=>{
      const key = j.CustomerID || j.Client;
      if(!m[key]) m[key]={client:j.Client, address:j.Address, city:j.City, jobs:[]};
      m[key].jobs.push(j);
    });
    return Object.values(m).sort((a,b)=>b.jobs.length-a.jobs.length);
  },[jobs]);

  const multi    = byCustomer.filter(c=>c.jobs.length>1);
  const skipped  = byCustomer.filter(c=>c.jobs.every(j=>j.Status===5));
  const done     = byCustomer.filter(c=>c.jobs.some(j=>j.Status===3)&&c.jobs.length===1);

  const TH2 = ({children,right})=><th style={{padding:"7px 10px",fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:"0.07em",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0",textAlign:right?"right":"left",whiteSpace:"nowrap"}}>{children}</th>;
  const TD2 = ({children,right,color})=><td style={{padding:"7px 10px",fontSize:12,color:color||"#374151",textAlign:right?"right":"left",verticalAlign:"middle"}}>{children}</td>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Summary tiles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#9a3412",textTransform:"uppercase",letterSpacing:"0.08em"}}>Multiple Visits</div>
          <div style={{fontSize:28,fontWeight:800,color:"#ea580c"}}>{multi.length}</div>
          <div style={{fontSize:11,color:"#c2410c"}}>properties with 2+ services</div>
        </div>
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#991b1b",textTransform:"uppercase",letterSpacing:"0.08em"}}>All Skipped</div>
          <div style={{fontSize:28,fontWeight:800,color:"#dc2626"}}>{skipped.length}</div>
          <div style={{fontSize:11,color:"#b91c1c"}}>properties skipped entirely</div>
        </div>
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#14532d",textTransform:"uppercase",letterSpacing:"0.08em"}}>Completed Once</div>
          <div style={{fontSize:28,fontWeight:800,color:"#16a34a"}}>{done.length}</div>
          <div style={{fontSize:11,color:"#15803d"}}>properties done exactly once</div>
        </div>
      </div>

      {/* Multi-visit table */}
      {multi.length>0&&(
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #e2e8f0",fontWeight:700,fontSize:13,color:"#0f172a"}}>🔄 Multiple Visits ({multi.length} properties)</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f8fafc"}}><TH2>Property</TH2><TH2 right>Visits</TH2><TH2>Services</TH2><TH2>Statuses</TH2><TH2 right>Total $</TH2></tr></thead>
              <tbody>
                {multi.map((c,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}>
                    <TD2><div style={{fontWeight:600}}>{c.client}</div><div style={{fontSize:11,color:"#94a3b8"}}>{c.address}</div></TD2>
                    <TD2 right><span style={{fontWeight:700,color:"#ea580c"}}>{c.jobs.length}</span></TD2>
                    <TD2>{[...new Set(c.jobs.map(j=>j.Service))].map(s=><Pill key={s}>{s}</Pill>)}</TD2>
                    <TD2>{c.jobs.map((j,k)=><Badge key={k} status={j.Status}/>)}</TD2>
                    <TD2 right color="#059669">{f$(c.jobs.reduce((s,j)=>s+(j.Amount||0),0))}</TD2>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Skipped table */}
      {skipped.length>0&&(
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #e2e8f0",fontWeight:700,fontSize:13,color:"#0f172a"}}>⛔ Skipped Entirely ({skipped.length} properties)</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f8fafc"}}><TH2>Property</TH2><TH2>Service</TH2><TH2>Crew</TH2><TH2>Notes</TH2></tr></thead>
              <tbody>
                {skipped.map((c,i)=>c.jobs.map((j,k)=>(
                  <tr key={i+"-"+k} style={{borderBottom:"1px solid #f1f5f9"}}>
                    <TD2><div style={{fontWeight:600}}>{c.client}</div><div style={{fontSize:11,color:"#94a3b8"}}>{c.address}</div></TD2>
                    <TD2><Pill>{j.Service}</Pill></TD2>
                    <TD2 color="#64748b">{j.Assigned}</TD2>
                    <TD2 color="#94a3b8">{j.InternalSchedulingNotes||"—"}</TD2>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table components ──────────────────────────────────────────
const TH = ({children,right}) => <th style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0",textAlign:right?"right":"left",whiteSpace:"nowrap"}}>{children}</th>;
const TD = ({children,right,mono,bold,color}) => <td style={{padding:"9px 12px",fontSize:12,color:color||"#374151",verticalAlign:"middle",textAlign:right?"right":"left",fontFamily:mono?"'Roboto Mono',monospace":"inherit",fontWeight:bold?700:400}}>{children}</td>;

function JobRow({job,onClick}) {
  return (
    <tr onClick={onClick} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer",transition:"background 0.1s"}}
      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <TD><span style={{fontSize:11,color:"#64748b"}}>{job.StartDate}</span></TD>
      <TD>
        <div style={{fontWeight:600,color:"#0f172a",fontSize:12.5}}>{job.Client}</div>
        <div style={{fontSize:10.5,color:"#94a3b8",marginTop:1}}>{job.Address}, {job.City}</div>
      </TD>
      <TD><Pill>{job.Service}</Pill></TD>
      <TD><Pill color="#8b5cf6">{job.Assigned||"—"}</Pill></TD>
      <TD mono color="#64748b">{job.StartTime||"—"}</TD>
      <TD mono color="#64748b">{job.EndTime||"—"}</TD>
      <TD><Badge status={job.Status}/></TD>
      <TD right bold color="#059669">{f$(job.Amount)}</TD>
      <TD right color="#64748b">{fH(job.TotalManHours)}</TD>
      <TD right color="#94a3b8">{job.BudgetedHours>0?fH(job.BudgetedHours):"—"}</TD>
      <TD><span style={{fontSize:11,color:"#94a3b8"}}>›</span></TD>
    </tr>
  );
}

// ─── Crew card ─────────────────────────────────────────────────
function CrewCard({crew,jobs}) {
  const rev=jobs.reduce((s,j)=>s+(j.Amount||0),0);
  const hrs=jobs.reduce((s,j)=>s+(j.TotalManHours||0),0);
  const done=jobs.filter(j=>j.Status===3).length;
  const skip=jobs.filter(j=>j.Status===5).length;
  const open=jobs.filter(j=>j.Status===1).length;
  const comp=pct(done,jobs.length);
  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><div style={{fontWeight:800,fontSize:14,color:"#0f172a"}}>{crew}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{jobs.length} jobs · {fH(hrs)}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:15,color:"#059669"}}>{f$(rev)}</div><div style={{fontSize:10.5,color:"#94a3b8"}}>{f$(rph(jobs))}/hr</div></div>
      </div>
      <div style={{height:3,background:"#f1f5f9"}}><div style={{height:"100%",width:`${comp}%`,background:"#10b981",transition:"width 0.6s ease"}}/></div>
      <div style={{display:"flex"}}>
        {[{l:"Done",v:done,c:"#10b981"},{l:"Skipped",v:skip,c:"#ef4444"},{l:"Open",v:open,c:"#f59e0b"}].map((s,i)=>(
          <div key={i} style={{flex:1,padding:"8px 4px",textAlign:"center",borderRight:i<2?"1px solid #f1f5f9":"none"}}>
            <div style={{fontSize:20,fontWeight:800,color:s.v>0?s.c:"#cbd5e1"}}>{s.v}</div>
            <div style={{fontSize:9.5,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [view,        setView]      = useState("kpi");
  const [selectedCrews,  setCrews]  = useState([]);
  const [selectedSvcs,   setSvcs]   = useState([]);
  const [selectedStats,  setStats]  = useState([]);
  const [search,      setSearch]    = useState("");
  const [modalJob,    setModalJob]  = useState(null);
  const [syncing,     setSyncing]   = useState(false);
  const [dbJobs,      setDbJobs]    = useState(null);
  const [loading,     setLoading]   = useState(true);
  const [dateFrom,    setDateFrom]  = useState("");
  const [dateTo,      setDateTo]    = useState("");
  // Snow event filter
  const [snowEvents,  setSnowEvents]= useState([]); // [{id,name}]
  const [selectedEvt, setSelectedEvt]= useState("");  // event ID or ""

  const mapRow = r => ({
    ID:            r.id,
    CustomerID:    r.customer_id,
    Client:        r.client,
    Address:       r.address,
    City:          r.city,
    State:         r.state,
    Zip:           r.zip,
    Service:       r.service,
    StartDate:     r.start_date,
    EndDate:       r.end_date,
    StartTime:     r.start_time  || "",
    EndTime:       r.end_time    || "",
    Assigned:      r.assigned,
    Status:        r.status,
    Amount:        r.amount      || 0,
    Rate:          r.rate        || 0,
    Hours:         r.hours       || 0,
    BudgetedHours: r.budgeted_hours || 0,
    TotalManHours: r.total_man_hours || 0,
    IsRescheduled: r.is_rescheduled || false,
    InvoiceID:     r.invoice_id,
    DateCompleted: r.date_completed,
    CompletedUsername: r.completed_username || "",
    SalesRep:      r.sales_rep   || "",
    InternalSchedulingNotes: r.internal_scheduling_notes || "",
    HasComments:   r.has_comments || false,
    ScheduleType:  r.schedule_type || "",
    Latitude:      r.latitude,
    Longitude:     r.longitude,
    JobComments: (r.job_comments || []).map(c => ({
      CommentID: c.comment_id || c.CommentID,
      UserName:  c.user || c.UserName,
      Comment:   c.text || c.Comment,
      date: c.date, time: c.time,
      DateTimeSeconds: c.DateTimeSeconds || (c.date ? {
        Month:parseInt(c.date.split("-")[1]), Day:parseInt(c.date.split("-")[2]),
        Year:parseInt(c.date.split("-")[0]), Hour:parseInt((c.time||"00:00").split(":")[0]),
        Minute:parseInt((c.time||"00:00").split(":")[1]),
      } : null),
    })),
  });

  const fetchJobs = async (from, to) => {
    setLoading(true);
    let q = supabase.from("sa_jobs").select("*").order("start_date", { ascending: false });
    if (from) q = q.gte("start_date", from);
    if (to)   q = q.lte("start_date", to);
    q = q.range(0, 9999);
    const { data, error } = await q;
    if (!error && data && data.length > 0) {
      setDbJobs(data.map(mapRow));
    } else {
      setDbJobs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from("sa_jobs").select("start_date").order("start_date",{ascending:false}).limit(1);
      if (data && data[0]) {
        const maxDate = data[0].start_date;
        const [y,m] = maxDate.split("-");
        const from = `${y}-${m}-01`;
        setDateFrom(from); setDateTo(maxDate);
        await fetchJobs(from, maxDate);
      } else { setDbJobs([]); setLoading(false); }
    }
    init();
  }, []);

  const ALL_JOBS = dbJobs || [];

  // Derive filter options
  const CREWS    = useMemo(()=>[...new Set(ALL_JOBS.map(j=>j.Assigned).filter(Boolean))].sort(),[ALL_JOBS]);
  const SERVICES = useMemo(()=>[...new Set(ALL_JOBS.map(j=>j.Service).filter(Boolean))].sort(),[ALL_JOBS]);

  // Status options
  const STATUS_OPTS = ["Open","Complete","Skipped"];
  const statusToInt = {"Open":1,"Complete":3,"Skipped":5};

  const jobs = useMemo(() => {
    let j = ALL_JOBS;
    if (selectedCrews.length>0)  j = j.filter(x => selectedCrews.includes(x.Assigned));
    if (selectedSvcs.length>0)   j = j.filter(x => selectedSvcs.includes(x.Service));
    if (selectedStats.length>0)  j = j.filter(x => selectedStats.map(s=>statusToInt[s]).includes(x.Status));
    if (search.trim()) { const q=search.toLowerCase(); j=j.filter(x=>[x.Client,x.Address,x.Service,x.City].some(f=>(f||"").toLowerCase().includes(q))); }
    return j;
  }, [selectedCrews, selectedSvcs, selectedStats, search, ALL_JOBS]);

  const totalRev  = jobs.reduce((s,j)=>s+(j.Amount||0),0);
  const totalHrs  = jobs.reduce((s,j)=>s+(j.TotalManHours||0),0);
  const compCount = jobs.filter(j=>j.Status===3).length;
  const skipCount = jobs.filter(j=>j.Status===5).length;
  const openCount = jobs.filter(j=>j.Status===1).length;

  const byCrew = useMemo(()=>{
    const m={};
    jobs.forEach(j=>{const k=j.Assigned||"(Unassigned)";if(!m[k])m[k]=[];m[k].push(j);});
    return Object.entries(m).sort((a,b)=>b[1].reduce((s,j)=>s+(j.Amount||0),0)-a[1].reduce((s,j)=>s+(j.Amount||0),0));
  },[jobs]);

  // Snow events — derived from jobs that have schedule_type=Snow, grouped by DispatchID
  // Since we don't store event ID separately, we identify snow events by unique date+assigned combos
  // Better: group snow jobs by start_date as proxy for events
  const snowJobDates = useMemo(()=>{
    const snowJobs = ALL_JOBS.filter(j=>j.ScheduleType==="Snow");
    const dates = [...new Set(snowJobs.map(j=>j.StartDate))].sort().reverse();
    return dates;
  },[ALL_JOBS]);

  const snowFilteredJobs = useMemo(()=>{
    if(!selectedEvt) return jobs.filter(j=>j.ScheduleType==="Snow");
    return ALL_JOBS.filter(j=>j.ScheduleType==="Snow"&&j.StartDate===selectedEvt);
  },[selectedEvt, jobs, ALL_JOBS]);

  const handleApplyDates = () => { fetchJobs(dateFrom, dateTo); };
  const handleRefresh = async () => { setSyncing(true); await fetchJobs(dateFrom, dateTo); setSyncing(false); };

  const sel = {background:"#f1f5f9",color:"#1e293b",border:"1px solid #e2e8f0",borderRadius:6,padding:"6px 10px",fontSize:12,outline:"none",cursor:"pointer"};
  const navBtn = (id,label) => (
    <button onClick={()=>setView(id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:view===id?"#1d4ed8":"transparent",color:view===id?"#fff":"#475569",transition:"all 0.15s"}}>
      {label}
    </button>
  );

  return (
    <div style={{background:"#f8fafc",minHeight:"100vh",fontFamily:"'DM Sans','IBM Plex Sans',system-ui,sans-serif",color:"#0f172a"}}>

      {/* Modal */}
      {modalJob&&<JobDetailModal job={modalJob} onClose={()=>setModalJob(null)}/>}

      {/* ── Top bar ── */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 20px",height:50,display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:28}}>
          <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,#2563eb,#0891b2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff"}}>F</div>
          <span style={{fontWeight:800,fontSize:13.5,letterSpacing:"-0.03em",color:"#0f172a"}}>FieldOps</span>
          <span style={{color:"#e2e8f0",fontSize:18,margin:"0 2px"}}>|</span>
          <span style={{fontSize:12,color:"#94a3b8"}}>Dispatch Dashboard</span>
        </div>
        <div style={{display:"flex",gap:2}}>
          {navBtn("kpi","KPI Overview")}
          {navBtn("crew","By Crew")}
          {navBtn("jobs","Job List")}
          {navBtn("snow","❄ Snow Events")}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:10.5,color:"#94a3b8",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:5,padding:"3px 9px"}}>
            {loading?"Loading…":ALL_JOBS.length>0?`📅 Live · ${ALL_JOBS.length.toLocaleString()} jobs`:"📭 No data"}
          </div>
          <button onClick={handleRefresh} disabled={syncing} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:syncing?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5,opacity:syncing?0.7:1}}>
            <span style={{display:"inline-block",animation:syncing?"spin 1s linear infinite":"none"}}>↻</span>
            {syncing?"Refreshing…":"Refresh"}
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"8px 20px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <input placeholder="Search client, address, service…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{...sel,width:210,padding:"6px 12px"}}/>
        <MultiSelect label="Crews"    options={CREWS}       selected={selectedCrews} onChange={setCrews}  width={150}/>
        <MultiSelect label="Services" options={SERVICES}    selected={selectedSvcs}  onChange={setSvcs}   width={150}/>
        <MultiSelect label="Statuses" options={STATUS_OPTS} selected={selectedStats} onChange={setStats}  width={140}/>
        <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:4}}>
          <span style={{fontSize:11,color:"#94a3b8"}}>From</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...sel,padding:"5px 8px"}}/>
          <span style={{fontSize:11,color:"#94a3b8"}}>To</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...sel,padding:"5px 8px"}}/>
          <button onClick={handleApplyDates} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Apply</button>
        </div>
        <span style={{fontSize:11,color:"#94a3b8",marginLeft:"auto"}}>{jobs.length.toLocaleString()} of {ALL_JOBS.length.toLocaleString()} jobs</span>
      </div>

      <div style={{padding:"18px 20px"}}>

        {/* ══ KPI VIEW ══════════════════════════════════════════ */}
        {view==="kpi"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10,marginBottom:20}}>
            <KPITile label="Revenue"    value={f$(totalRev)}               sub={`${jobs.length.toLocaleString()} jobs`} accent="#3b82f6"/>
            <KPITile label="Man-Hours"  value={fH(totalHrs)}               sub="Actual on-site"                         accent="#06b6d4"/>
            <KPITile label="Rev / Hour" value={f$(rph(jobs))}              sub="All crews combined"                     accent="#8b5cf6"/>
            <KPITile label="Completion" value={`${pct(compCount,jobs.length)}%`} sub={`${compCount.toLocaleString()} complete`} accent="#10b981"/>
            <KPITile label="Skipped"    value={skipCount}                  sub="Need reschedule"                        accent="#ef4444" warn={skipCount>0}/>
            <KPITile label="Open"       value={openCount}                  sub="Not yet done"                           accent="#f59e0b"/>
          </div>
          <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,fontSize:13,color:"#0f172a"}}>Crew Performance</span>
              <span style={{fontSize:10.5,color:"#94a3b8"}}>{dateFrom&&fDate(dateFrom)} – {dateTo&&fDate(dateTo)}</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#f8fafc"}}>
                {["Crew","Jobs","Done","Skipped","Open","Revenue","Man-Hrs","Rev/Hr","Completion"].map(h=>(
                  <TH key={h} right={!["Crew"].includes(h)}>{h}</TH>
                ))}
              </tr></thead>
              <tbody>
                {byCrew.map(([cr,cjobs])=>{
                  const rev2=cjobs.reduce((s,j)=>s+(j.Amount||0),0);
                  const hrs2=cjobs.reduce((s,j)=>s+(j.TotalManHours||0),0);
                  const done2=cjobs.filter(j=>j.Status===3).length;
                  const skip2=cjobs.filter(j=>j.Status===5).length;
                  const open2=cjobs.filter(j=>j.Status===1).length;
                  const comp2=pct(done2,cjobs.length);
                  return (
                    <tr key={cr} style={{borderBottom:"1px solid #f8fafc"}}>
                      <TD bold color="#0f172a">{cr}</TD>
                      <TD right color="#64748b">{cjobs.length}</TD>
                      <TD right bold color="#10b981">{done2}</TD>
                      <TD right bold color={skip2>0?"#ef4444":"#94a3b8"}>{skip2}</TD>
                      <TD right bold color={open2>0?"#f59e0b":"#94a3b8"}>{open2}</TD>
                      <TD right bold color="#059669">{f$(rev2)}</TD>
                      <TD right color="#64748b">{fH(hrs2)}</TD>
                      <TD right bold color="#2563eb">{f$(hrs2>0?rev2/hrs2:0)}</TD>
                      <TD right>
                        <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                          <div style={{width:48,height:4,background:"#e2e8f0",borderRadius:2,overflow:"hidden"}}>
                            <div style={{width:`${comp2}%`,height:"100%",background:comp2===100?"#10b981":comp2>70?"#3b82f6":"#f59e0b"}}/>
                          </div>
                          <span style={{fontSize:11,color:"#94a3b8",minWidth:28,textAlign:"right"}}>{comp2}%</span>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}

        {/* ══ BY CREW VIEW ══════════════════════════════════════ */}
        {view==="crew"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
            {byCrew.map(([cr,cjobs])=><CrewCard key={cr} crew={cr} jobs={cjobs}/>)}
          </div>
        )}

        {/* ══ JOB LIST VIEW ══════════════════════════════════════ */}
        {view==="jobs"&&(
          <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  <TH>Date</TH><TH>Client</TH><TH>Service</TH><TH>Crew</TH>
                  <TH>Start</TH><TH>End</TH><TH>Status</TH>
                  <TH right>Amount</TH><TH right>Man-Hrs</TH><TH right>Budget Hrs</TH><TH/>
                </tr></thead>
                <tbody>
                  {jobs.length===0&&(
                    <tr><td colSpan={11} style={{padding:"32px",textAlign:"center",color:"#94a3b8",fontSize:13}}>{loading?"Loading…":"No jobs match current filters"}</td></tr>
                  )}
                  {jobs.map(j=>(
                    <JobRow key={j.ID+j.StartDate} job={{...j,StartDate:fDate(j.StartDate)}} onClick={()=>setModalJob(j)}/>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ SNOW EVENTS VIEW ══════════════════════════════════ */}
        {view==="snow"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <span style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>Snow Event Date:</span>
              <select value={selectedEvt} onChange={e=>setSelectedEvt(e.target.value)} style={{...sel,minWidth:200}}>
                <option value="">All Snow Events</option>
                {snowJobDates.map(d=><option key={d} value={d}>{fDate(d)}</option>)}
              </select>
              <span style={{fontSize:11,color:"#94a3b8"}}>{snowFilteredJobs.length} jobs</span>
            </div>
            {/* KPI summary for snow */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:16}}>
              <KPITile label="Revenue" value={f$(snowFilteredJobs.reduce((s,j)=>s+(j.Amount||0),0))} sub={`${snowFilteredJobs.length} jobs`} accent="#0ea5e9"/>
              <KPITile label="Complete" value={snowFilteredJobs.filter(j=>j.Status===3).length} sub="completed" accent="#10b981"/>
              <KPITile label="Skipped" value={snowFilteredJobs.filter(j=>j.Status===5).length} sub="skipped" accent="#ef4444" warn={snowFilteredJobs.filter(j=>j.Status===5).length>0}/>
              <KPITile label="Open" value={snowFilteredJobs.filter(j=>j.Status===1).length} sub="pending" accent="#f59e0b"/>
            </div>
            <SnowEventView jobs={snowFilteredJobs}/>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f8fafc; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        select option { background: #fff; }
        input[type="date"] { color-scheme: light; }
      `}</style>
    </div>
  );
}
