import { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────────
// Fallback sample data — used when Supabase has no rows yet
// ─────────────────────────────────────────────────────────────────
const SAMPLE_JOBS = [
  { ID:"c24b29a9-1", CustomerID:"f956f86d-1", Client:"Chia Xiong", Address:"N111W12508 Strawgrass Ln", City:"Germantown", State:"WI", Zip:"53022", Service:"App3", StartDate:"7/1/2025", EndDate:"7/1/2025", StartTime:"3:43 PM", EndTime:"4:06 PM", Assigned:"Dave", Status:3, Amount:92, Rate:92, Hours:0.38, BudgetedHours:0, TotalManHours:0.38, NumberOfMen:1, IsRescheduled:false, InvoiceID:"ae3e3926-1", IsInvoiceLocked:true, DateCompleted:"7/1/2025", CompletedUsername:"Dave", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:2.1, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"613e6812-2", CustomerID:"4158fd06-2", Client:"Michael Nelson", Address:"W129N11615 Hazel Heights", City:"Germantown", State:"WI", Zip:"53022", Service:"App3", StartDate:"7/1/2025", EndDate:"7/1/2025", StartTime:"11:23 AM", EndTime:"11:29 AM", Assigned:"Dave", Status:3, Amount:92, Rate:92, Hours:0.1, BudgetedHours:0, TotalManHours:0.1, NumberOfMen:1, IsRescheduled:false, InvoiceID:"bafda77a-2", IsInvoiceLocked:true, DateCompleted:"7/1/2025", CompletedUsername:"Dave", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:0.8, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"5a2b1c3d-3", CustomerID:"9f1e2d3c-3", Client:"Janet Radtke & Becky Rasmason", Address:"W129N11633 Hazel Heights", City:"Germantown", State:"WI", Zip:"53022", Service:"App3", StartDate:"7/1/2025", EndDate:"7/1/2025", StartTime:"9:00 AM", EndTime:"9:22 AM", Assigned:"Dave", Status:3, Amount:114, Rate:114, Hours:0.37, BudgetedHours:0, TotalManHours:0.37, NumberOfMen:1, IsRescheduled:false, InvoiceID:"cc1d2e3f-3", IsInvoiceLocked:true, DateCompleted:"7/1/2025", CompletedUsername:"Dave", JobComments:[], InternalSchedulingNotes:"She would prefer apps to be between 9am–3pm.", ClientNotes:"", ActualMileage:0.2, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"2a3b4c5d-16", CustomerID:"6e7f8a9b-16", Client:"Colleen Crane", Address:"2050 Lower Rd", City:"Grafton", State:"WI", Zip:"53024", Service:"App3", StartDate:"7/1/2025", EndDate:"7/1/2025", StartTime:"10:15 AM", EndTime:"10:30 AM", Assigned:"Dave", Status:3, Amount:55, Rate:55, Hours:0.25, BudgetedHours:0, TotalManHours:0.25, NumberOfMen:1, IsRescheduled:false, InvoiceID:"d6e7f8a9-16", IsInvoiceLocked:true, DateCompleted:"7/1/2025", CompletedUsername:"Dave", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:1.4, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"9d0e1f2a-13", CustomerID:"3b4c5d6e-13", Client:"Chris Weber", Address:"N118W12564 Black Forest Trail", City:"Germantown", State:"WI", Zip:"53022", Service:"BEDM", StartDate:"7/1/2025", EndDate:"7/1/2025", StartTime:"8:00 AM", EndTime:"9:30 AM", Assigned:"FSL", Status:3, Amount:320, Rate:320, Hours:1.5, BudgetedHours:2, TotalManHours:3.0, NumberOfMen:2, IsRescheduled:false, InvoiceID:"a3b4c5d6-13", IsInvoiceLocked:true, DateCompleted:"7/1/2025", CompletedUsername:"FSL", JobComments:[], InternalSchedulingNotes:"Schedule app #4 with other app #3s to spray queen anne's lace.", ClientNotes:"", ActualMileage:4.2, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"0e1f2a3b-14", CustomerID:"4c5d6e7f-14", Client:"Rolling Hills Subdivision", Address:"3000 Upper Ridge Road", City:"Port Washington", State:"WI", Zip:"53074", Service:"MOW", StartDate:"7/2/2025", EndDate:"7/2/2025", StartTime:"7:30 AM", EndTime:"11:00 AM", Assigned:"LawnCrew1", Status:3, Amount:409, Rate:409, Hours:3.5, BudgetedHours:3, TotalManHours:7.0, NumberOfMen:2, IsRescheduled:false, InvoiceID:"b4c5d6e7-14", IsInvoiceLocked:true, DateCompleted:"7/2/2025", CompletedUsername:"Michael Reardon", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:8.1, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"1f2a3b4c-15", CustomerID:"5d6e7f8a-15", Client:"Scott Schmidt", Address:"3237 N HWY O", City:"Saukville", State:"WI", Zip:"53080", Service:"MOW", StartDate:"7/2/2025", EndDate:"7/2/2025", StartTime:"1:00 PM", EndTime:"1:45 PM", Assigned:"LawnCrew1", Status:1, Amount:55, Rate:55, Hours:0, BudgetedHours:0.75, TotalManHours:0, NumberOfMen:1, IsRescheduled:false, InvoiceID:"c5d6e7f8-15", IsInvoiceLocked:false, DateCompleted:"", CompletedUsername:"", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:0, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"8f9a0b1c-4", CustomerID:"2d3e4f5a-4", Client:"Greenbriar HOA", Address:"1803 Hilltop Dr", City:"West Bend", State:"WI", Zip:"53095", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"9:54 AM", EndTime:"2:17 PM", Assigned:"LawnCrew1", Status:3, Amount:748, Rate:748, Hours:4.38, BudgetedHours:3.5, TotalManHours:8.76, NumberOfMen:2, IsRescheduled:false, InvoiceID:"d4e5f6a7-4", IsInvoiceLocked:true, DateCompleted:"7/3/2025", CompletedUsername:"Michael Reardon", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:12.4, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"1b2c3d4e-5", CustomerID:"5f6a7b8c-5", Client:"First Citizens Bank – West Bend", Address:"876 S. Main Street", City:"West Bend", State:"WI", Zip:"53095", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"9:26 AM", EndTime:"9:37 AM", Assigned:"LawnCrew1", Status:3, Amount:49, Rate:49, Hours:0.18, BudgetedHours:0.25, TotalManHours:0.18, NumberOfMen:1, IsRescheduled:false, InvoiceID:"e5f6a7b8-5", IsInvoiceLocked:true, DateCompleted:"7/3/2025", CompletedUsername:"Michael Reardon", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:0.3, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"2c3d4e5f-6", CustomerID:"6a7b8c9d-6", Client:"Howard Jensen", Address:"11049 W Bonniwell", City:"Mequon", State:"WI", Zip:"53097", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"9:18 AM", EndTime:"9:18 AM", Assigned:"LawnCrew2", Status:3, Amount:89, Rate:89, Hours:0.5, BudgetedHours:0.5, TotalManHours:0.5, NumberOfMen:1, IsRescheduled:false, InvoiceID:"f6a7b8c9-6", IsInvoiceLocked:true, DateCompleted:"7/3/2025", CompletedUsername:"Steffen Jacob", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:1.1, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"3d4e5f6a-7", CustomerID:"7b8c9d0e-7", Client:"Riverlake Subdivision HOA", Address:"10432 N River Lake Dr", City:"Mequon", State:"WI", Zip:"53092", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"", EndTime:"", Assigned:"LawnCrew2", Status:5, Amount:150, Rate:150, Hours:0, BudgetedHours:0.75, TotalManHours:0, NumberOfMen:1, IsRescheduled:true, InvoiceID:"a7b8c9d0-7", IsInvoiceLocked:true, DateCompleted:"7/2/2025", CompletedUsername:"LawnCrew2", JobComments:[{CommentID:"0a01c5ef", UserName:"Steffen Jacob", Comment:"Skipped: Cut 7/2 lawn 2", DateTimeSeconds:{Month:7,Day:3,Year:2025,Hour:8,Minute:25}},{CommentID:"cb0ef3e3", UserName:"Steffen Jacob", Comment:"Skipped: Cut 7/2 lawn 2", DateTimeSeconds:{Month:7,Day:1,Year:2025,Hour:17,Minute:46}}], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:1.68, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"4e5f6a7b-8", CustomerID:"8c9d0e1f-8", Client:"Dennis Schultz", Address:"10617 Highlawn Ct.", City:"Cedarburg", State:"WI", Zip:"53012", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"8:14 AM", EndTime:"9:18 AM", Assigned:"LawnCrew2", Status:3, Amount:72, Rate:72, Hours:1.07, BudgetedHours:1, TotalManHours:1.07, NumberOfMen:1, IsRescheduled:false, InvoiceID:"b8c9d0e1-8", IsInvoiceLocked:true, DateCompleted:"7/3/2025", CompletedUsername:"Steffen Jacob", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:3.2, SalesRep:"Alyssa Endlich", AccountBalance:-231.72 },
  { ID:"5f6a7b8c-9", CustomerID:"9d0e1f2a-9", Client:"Jim Trubshaw", Address:"10634 Turnberry Dr", City:"Mequon", State:"WI", Zip:"53092", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"11:37 AM", EndTime:"12:02 PM", Assigned:"LawnCrew2", Status:3, Amount:95, Rate:95, Hours:0.42, BudgetedHours:0.5, TotalManHours:0.84, NumberOfMen:2, IsRescheduled:false, InvoiceID:"c9d0e1f2-9", IsInvoiceLocked:true, DateCompleted:"7/3/2025", CompletedUsername:"Steffen Jacob", JobComments:[], InternalSchedulingNotes:"She's always been on Thursdays mowing route and would like to keep it that way (4/24/25 NL).", ClientNotes:"", ActualMileage:2.8, SalesRep:"Alyssa Endlich", AccountBalance:1077.16 },
  { ID:"6a7b8c9d-10", CustomerID:"0e1f2a3b-10", Client:"Matt Malczewski (Residence)", Address:"10263 N Wildwood Ct", City:"Mequon", State:"WI", Zip:"53097", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"12:50 PM", EndTime:"12:55 PM", Assigned:"LawnCrew2", Status:5, Amount:85, Rate:85, Hours:0, BudgetedHours:0.25, TotalManHours:0, NumberOfMen:1, IsRescheduled:true, InvoiceID:"d0e1f2a3-10", IsInvoiceLocked:false, DateCompleted:"7/3/2025", CompletedUsername:"Lawn Crew 2", JobComments:[{CommentID:"skip001", UserName:"Lawn Crew 2", Comment:"Skipped 7/3/2025 12:58 PM: \"Customer declined us to cut the grass\"", DateTimeSeconds:{Month:7,Day:3,Year:2025,Hour:12,Minute:58}}], InternalSchedulingNotes:"AUTOPAY", ClientNotes:"", ActualMileage:0.5, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"7b8c9d0e-11", CustomerID:"1f2a3b4c-11", Client:"Arlene Brandt", Address:"1790 Granville Road", City:"Cedarburg", State:"WI", Zip:"53012", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"9:29 AM", EndTime:"10:15 AM", Assigned:"LawnCrew2", Status:3, Amount:59, Rate:59, Hours:0.77, BudgetedHours:0.75, TotalManHours:0.77, NumberOfMen:1, IsRescheduled:false, InvoiceID:"e1f2a3b4-11", IsInvoiceLocked:true, DateCompleted:"7/3/2025", CompletedUsername:"Steffen Jacob", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:1.9, SalesRep:"Alyssa Endlich", AccountBalance:0 },
  { ID:"8c9d0e1f-12", CustomerID:"2a3b4c5d-12", Client:"Peter Wagner", Address:"10380 N Wildwood Ct", City:"Mequon", State:"WI", Zip:"53092", Service:"MOW", StartDate:"7/3/2025", EndDate:"7/3/2025", StartTime:"11:00 AM", EndTime:"11:30 AM", Assigned:"LawnCrew2", Status:1, Amount:85, Rate:85, Hours:0, BudgetedHours:0.5, TotalManHours:0, NumberOfMen:1, IsRescheduled:false, InvoiceID:"f2a3b4c5-12", IsInvoiceLocked:false, DateCompleted:"", CompletedUsername:"", JobComments:[], InternalSchedulingNotes:"", ClientNotes:"", ActualMileage:0, SalesRep:"Alyssa Endlich", AccountBalance:-74.49 },
];

// ─── Constants ────────────────────────────────────────────────
const STATUS = {
  1: { label:"Open",     dot:"#f59e0b", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.25)" },
  3: { label:"Complete", dot:"#10b981", bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.25)" },
  5: { label:"Skipped",  dot:"#ef4444", bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.25)"  },
};
// CREWS/DATES/SERVICES derived dynamically inside App from ALL_JOBS

// ─── Helpers ──────────────────────────────────────────────────
const f$ = n => n==null?"—":"$"+Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fH = n => n==null?"—":Number(n).toFixed(2)+"h";
const rph = jobs => {
  const rev=jobs.reduce((s,j)=>s+(j.Amount||0),0);
  const hrs=jobs.reduce((s,j)=>s+(j.TotalManHours||0),0);
  return hrs>0?rev/hrs:0;
};
const pct = (a,b) => b>0?Math.round(100*a/b):0;

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
    <div style={{background:"#0f172a",border:`1px solid ${warn?"rgba(239,68,68,0.3)":"#1e293b"}`,borderRadius:10,padding:"18px 20px",borderTop:`3px solid ${warn?"#ef4444":accent}`,display:"flex",flexDirection:"column",gap:3}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:warn?"#ef4444":"#f1f5f9",letterSpacing:"-0.02em",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#334155",marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ─── Comment row ──────────────────────────────────────────────
function CommentRow({c}) {
  const dt=c.DateTimeSeconds;
  const ts=dt?`${dt.Month}/${dt.Day}/${dt.Year} ${dt.Hour}:${String(dt.Minute).padStart(2,"0")}`:"";
  return (
    <div style={{display:"flex",gap:8,padding:"5px 0"}}>
      <div style={{width:20,height:20,borderRadius:"50%",background:"#1e293b",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#475569",fontWeight:700}}>{c.UserName?c.UserName[0]:""}</div>
      <div>
        <span style={{fontSize:11,fontWeight:700,color:"#94a3b8"}}>{c.UserName}</span>
        {ts&&<span style={{fontSize:10,color:"#334155",marginLeft:6}}>{ts}</span>}
        <div style={{fontSize:12,color:"#cbd5e1",marginTop:1}}>{c.Comment}</div>
      </div>
    </div>
  );
}

// ─── Job table row ────────────────────────────────────────────
const TH = ({children,right}) => <th style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"#334155",letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:"1px solid #1e293b",textAlign:right?"right":"left",whiteSpace:"nowrap"}}>{children}</th>;
const TD = ({children,right,mono,bold,color}) => <td style={{padding:"9px 12px",fontSize:12,color:color||"#cbd5e1",verticalAlign:"middle",textAlign:right?"right":"left",fontFamily:mono?"'Roboto Mono',monospace":"inherit",fontWeight:bold?700:400}}>{children}</td>;

function JobRow({job,expanded,onToggle}) {
  const hasDetail = job.InternalSchedulingNotes||(job.JobComments||[]).length>0;
  const overBudget = job.BudgetedHours>0 && job.TotalManHours>job.BudgetedHours;
  return <>
    <tr onClick={hasDetail?onToggle:undefined} style={{borderBottom:"1px solid #0f172a",background:expanded?"#0d1f3c":"transparent",cursor:hasDetail?"pointer":"default",transition:"background 0.12s"}}>
      <TD><span style={{fontSize:11,color:"#475569"}}>{job.StartDate}</span></TD>
      <TD>
        <div style={{fontWeight:600,color:"#e2e8f0",fontSize:12.5}}>{job.Client}</div>
        <div style={{fontSize:10.5,color:"#334155",marginTop:1}}>{job.Address}, {job.City}</div>
      </TD>
      <TD><Pill>{job.Service}</Pill></TD>
      <TD><Pill color="#8b5cf6">{job.Assigned}</Pill></TD>
      <TD mono>{job.StartTime||"—"}</TD>
      <TD mono>{job.EndTime||"—"}</TD>
      <TD><Badge status={job.Status}/></TD>
      <TD right bold color="#34d399">{f$(job.Amount)}</TD>
      <TD right color={overBudget?"#f87171":"#94a3b8"}>{fH(job.TotalManHours)}</TD>
      <TD right color="#334155">{job.BudgetedHours>0?fH(job.BudgetedHours):"—"}</TD>
      <TD right>
        {hasDetail&&<span style={{fontSize:12,color:expanded?"#60a5fa":"#1e3a5f"}}>{expanded?"▲":"▼"}</span>}
      </TD>
    </tr>
    {expanded&&hasDetail&&(
      <tr style={{background:"#070f1f",borderBottom:"1px solid #1e293b"}}>
        <td colSpan={11} style={{padding:"10px 16px 14px 60px"}}>
          {job.InternalSchedulingNotes&&(
            <div style={{fontSize:11.5,color:"#94a3b8",marginBottom:8,lineHeight:1.5}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#334155",textTransform:"uppercase"}}>Scheduling Notes · </span>
              {job.InternalSchedulingNotes}
            </div>
          )}
          {(job.JobComments||[]).map((c,i)=><CommentRow key={i} c={c}/>)}
        </td>
      </tr>
    )}
  </>;
}

// ─── Crew card (By Crew view) ─────────────────────────────────
function CrewCard({crew,jobs}) {
  const rev   = jobs.reduce((s,j)=>s+(j.Amount||0),0);
  const hrs   = jobs.reduce((s,j)=>s+(j.TotalManHours||0),0);
  const done  = jobs.filter(j=>j.Status===3).length;
  const skip  = jobs.filter(j=>j.Status===5).length;
  const open  = jobs.filter(j=>j.Status===1).length;
  const comp  = pct(done,jobs.length);
  return (
    <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {/* header */}
      <div style={{padding:"14px 16px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontWeight:800,fontSize:14,color:"#f1f5f9"}}>{crew}</div>
          <div style={{fontSize:11,color:"#334155",marginTop:2}}>{jobs.length} jobs · {fH(hrs)}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontWeight:700,fontSize:15,color:"#34d399"}}>{f$(rev)}</div>
          <div style={{fontSize:10.5,color:"#334155"}}>{f$(rph(jobs))}/hr</div>
        </div>
      </div>
      {/* progress */}
      <div style={{height:2,background:"#1e293b"}}>
        <div style={{height:"100%",width:`${comp}%`,background:"#10b981",transition:"width 0.6s ease"}}/>
      </div>
      {/* stat pills */}
      <div style={{display:"flex",borderBottom:"1px solid #1e293b"}}>
        {[{l:"Done",v:done,c:"#10b981"},{l:"Skipped",v:skip,c:"#ef4444"},{l:"Open",v:open,c:"#f59e0b"}].map((s,i)=>(
          <div key={i} style={{flex:1,padding:"8px 4px",textAlign:"center",borderRight:i<2?"1px solid #1e293b":"none"}}>
            <div style={{fontSize:20,fontWeight:800,color:s.v>0?s.c:"#1e293b"}}>{s.v}</div>
            <div style={{fontSize:9.5,color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* job list */}
      <div style={{overflowY:"auto",maxHeight:240,flex:1}}>
        {jobs.map(j=>(
          <div key={j.ID} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderBottom:"1px solid #0a1628",fontSize:11.5}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:STATUS[j.Status]?.dot||"#6b7280",flexShrink:0}}/>
            <span style={{flex:1,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.Client}</span>
            <span style={{color:"#334155",flexShrink:0,marginRight:4}}>{j.Service}</span>
            <span style={{color:"#34d399",fontWeight:700,flexShrink:0,minWidth:52,textAlign:"right"}}>{f$(j.Amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [view,     setView]     = useState("kpi");
  const [crew,     setCrew]     = useState("All");
  const [date,     setDate]     = useState("All");
  const [status,   setStatus]   = useState("All");
  const [search,   setSearch]   = useState("");
  const [expID,    setExpID]    = useState(null);
  const [syncing,  setSyncing]  = useState(false);
  const [dbJobs,   setDbJobs]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("sa_jobs")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(2000);
      if (!error && data && data.length > 0) {
        const mapped = data.map(r => ({
          ID: r.id, CustomerID: r.customer_id,
          Client: r.client, Address: r.address, City: r.city,
          State: r.state, Zip: r.zip, Service: r.service,
          StartDate: r.start_date, EndDate: r.end_date,
          StartTime: r.start_time||"", EndTime: r.end_time||"",
          Assigned: r.assigned, Status: r.status,
          Amount: r.amount, Rate: r.rate, Hours: r.hours,
          BudgetedHours: r.budgeted_hours, TotalManHours: r.total_man_hours,
          NumberOfMen: r.number_of_men, IsRescheduled: r.is_rescheduled,
          InvoiceID: r.invoice_id, IsInvoiceLocked: r.is_invoice_locked,
          DateCompleted: r.date_completed, CompletedUsername: r.completed_username,
          JobComments: r.job_comments||[], InternalSchedulingNotes: r.internal_scheduling_notes||"",
          ClientNotes: r.client_notes||"", ActualMileage: r.actual_mileage,
          SalesRep: r.sales_rep, AccountBalance: r.account_balance,
        }));
        setDbJobs(mapped);
        setLastSync(data[0]?.last_synced_at);
      } else {
        setDbJobs([]);
      }
      setLoading(false);
    }
    fetchJobs();
  }, []);

  const ALL_JOBS = (dbJobs && dbJobs.length > 0) ? dbJobs : SAMPLE_JOBS;
  const isLiveData = dbJobs && dbJobs.length > 0;

  const CREWS    = [...new Set(ALL_JOBS.map(j=>j.Assigned).filter(Boolean))].sort();
  const DATES    = [...new Set(ALL_JOBS.map(j=>j.StartDate).filter(Boolean))].sort();

  const jobs = useMemo(()=>{
    let j=ALL_JOBS;
    if(crew  !=="All") j=j.filter(x=>x.Assigned===crew);
    if(date  !=="All") j=j.filter(x=>x.StartDate===date);
    if(status!=="All") j=j.filter(x=>String(x.Status)===status);
    if(search.trim()){
      const q=search.toLowerCase();
      j=j.filter(x=>[x.Client,x.Address,x.Service,x.City].some(f=>(f||"").toLowerCase().includes(q)));
    }
    return j;
  },[crew,date,status,search,ALL_JOBS]);

  const totalRev  = jobs.reduce((s,j)=>s+(j.Amount||0),0);
  const totalHrs  = jobs.reduce((s,j)=>s+(j.TotalManHours||0),0);
  const compCount = jobs.filter(j=>j.Status===3).length;
  const skipCount = jobs.filter(j=>j.Status===5).length;
  const openCount = jobs.filter(j=>j.Status===1).length;

  const byCrew = useMemo(()=>{
    const m={};
    jobs.forEach(j=>{if(!m[j.Assigned])m[j.Assigned]=[];m[j.Assigned].push(j);});
    return Object.entries(m).sort((a,b)=>b[1].reduce((s,j)=>s+(j.Amount||0),0)-a[1].reduce((s,j)=>s+(j.Amount||0),0));
  },[jobs]);

  const handleRefresh = async () => {
    setSyncing(true);
    const { data, error } = await supabase.from("sa_jobs").select("*").order("start_date",{ascending:false}).limit(2000);
    if (!error && data && data.length > 0) {
      const mapped = data.map(r => ({
        ID:r.id,CustomerID:r.customer_id,Client:r.client,Address:r.address,City:r.city,
        State:r.state,Zip:r.zip,Service:r.service,StartDate:r.start_date,EndDate:r.end_date,
        StartTime:r.start_time||"",EndTime:r.end_time||"",Assigned:r.assigned,Status:r.status,
        Amount:r.amount,Rate:r.rate,Hours:r.hours,BudgetedHours:r.budgeted_hours,
        TotalManHours:r.total_man_hours,NumberOfMen:r.number_of_men,IsRescheduled:r.is_rescheduled,
        InvoiceID:r.invoice_id,IsInvoiceLocked:r.is_invoice_locked,DateCompleted:r.date_completed,
        CompletedUsername:r.completed_username,JobComments:r.job_comments||[],
        InternalSchedulingNotes:r.internal_scheduling_notes||"",ClientNotes:r.client_notes||"",
        ActualMileage:r.actual_mileage,SalesRep:r.sales_rep,AccountBalance:r.account_balance,
      }));
      setDbJobs(mapped);
      setLastSync(data[0]?.last_synced_at);
    }
    setSyncing(false);
  };

  const sel = {background:"#0f172a",color:"#94a3b8",border:"1px solid #1e293b",borderRadius:6,padding:"6px 10px",fontSize:12,outline:"none",cursor:"pointer"};
  const navBtn = (id,label) => (
    <button onClick={()=>setView(id)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",letterSpacing:"0.02em",background:view===id?"#1d4ed8":"transparent",color:view===id?"#fff":"#475569",transition:"all 0.15s"}}>
      {label}
    </button>
  );

  return (
    <div style={{background:"#020b18",minHeight:"100vh",fontFamily:"'DM Sans','IBM Plex Sans',system-ui,sans-serif",color:"#f1f5f9"}}>

      {/* ── Top bar ── */}
      <div style={{background:"#050e1c",borderBottom:"1px solid #0f1f35",padding:"0 20px",height:50,display:"flex",alignItems:"center",gap:0,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:28}}>
          <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,#2563eb,#0891b2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-0.05em"}}>F</div>
          <span style={{fontWeight:800,fontSize:13.5,letterSpacing:"-0.03em",color:"#f1f5f9"}}>FieldOps</span>
          <span style={{color:"#0f1f35",fontSize:18,margin:"0 2px"}}>|</span>
          <span style={{fontSize:12,color:"#334155"}}>Dispatch Dashboard</span>
        </div>
        <div style={{display:"flex",gap:2}}>
          {navBtn("kpi","KPI Overview")}
          {navBtn("crew","By Crew")}
          {navBtn("jobs","Job List")}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:10.5,color:"#334155",background:"#0a1628",border:"1px solid #0f2040",borderRadius:5,padding:"3px 9px"}}>
            {loading ? "Loading…" : isLiveData ? `📅 Live · ${ALL_JOBS.length} jobs` : `📅 Sample · ${ALL_JOBS.length} jobs`}
          </div>
          <button onClick={handleRefresh} disabled={syncing} style={{background:syncing?"#0f2040":"#0f2d5c",color:syncing?"#334155":"#60a5fa",border:"1px solid #1d4ed830",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:syncing?"not-allowed":"pointer",letterSpacing:"0.04em",display:"flex",alignItems:"center",gap:5}}>
            <span style={{display:"inline-block",animation:syncing?"spin 1s linear infinite":"none"}}>↻</span>
            {syncing?"Syncing…":"SYNC SA"}
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{background:"#050e1c",borderBottom:"1px solid #0a1628",padding:"8px 20px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <input placeholder="Search client, address, service…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{...sel,width:210,padding:"6px 12px",color:"#94a3b8"}}/>
        <select value={crew}   onChange={e=>setCrew(e.target.value)}   style={sel}>
          <option value="All">All Crews</option>{CREWS.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={date}   onChange={e=>setDate(e.target.value)}   style={sel}>
          <option value="All">All Dates</option>{DATES.map(d=><option key={d}>{d}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={sel}>
          <option value="All">All Statuses</option>
          <option value="1">Open</option>
          <option value="3">Complete</option>
          <option value="5">Skipped</option>
        </select>
        <span style={{fontSize:11,color:"#1e3a5f",marginLeft:"auto"}}>{jobs.length} of {ALL_JOBS.length} jobs</span>
      </div>

      <div style={{padding:"18px 20px"}}>

        {/* ══ KPI VIEW ══════════════════════════════════════════ */}
        {view==="kpi"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10,marginBottom:20}}>
            <KPITile label="Revenue"         value={f$(totalRev)}      sub={`${jobs.length} jobs`}    accent="#3b82f6"/>
            <KPITile label="Man-Hours"        value={fH(totalHrs)}      sub="Actual on-site"          accent="#06b6d4"/>
            <KPITile label="Rev / Hour"       value={f$(rph(jobs))}     sub="All crews combined"      accent="#8b5cf6"/>
            <KPITile label="Completion"       value={`${pct(compCount,jobs.length)}%`} sub={`${compCount} complete`} accent="#10b981"/>
            <KPITile label="Skipped"          value={skipCount}         sub="Need reschedule"         accent="#ef4444" warn={skipCount>0}/>
            <KPITile label="Open"             value={openCount}         sub="Not yet done"            accent="#f59e0b"/>
          </div>

          {/* Crew breakdown */}
          <div style={{background:"#0a1628",border:"1px solid #0f2040",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #0f2040",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>Crew Performance</span>
              <span style={{fontSize:10.5,color:"#1e3a5f"}}>{DATES[0]} – {DATES[DATES.length-1]}</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#070f1f"}}>
                  {["Crew","Jobs","Done","Skipped","Open","Revenue","Man-Hrs","Rev/Hr","Completion"].map(h=>(
                    <TH key={h} right={!["Crew"].includes(h)}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byCrew.map(([cr,cjobs])=>{
                  const rev2=cjobs.reduce((s,j)=>s+(j.Amount||0),0);
                  const hrs2=cjobs.reduce((s,j)=>s+(j.TotalManHours||0),0);
                  const done2=cjobs.filter(j=>j.Status===3).length;
                  const skip2=cjobs.filter(j=>j.Status===5).length;
                  const open2=cjobs.filter(j=>j.Status===1).length;
                  const comp2=pct(done2,cjobs.length);
                  return (
                    <tr key={cr} style={{borderBottom:"1px solid #0a1628"}}>
                      <TD bold color="#e2e8f0">{cr}</TD>
                      <TD right color="#475569">{cjobs.length}</TD>
                      <TD right bold color="#10b981">{done2}</TD>
                      <TD right bold color={skip2>0?"#ef4444":"#1e3a5f"}>{skip2}</TD>
                      <TD right bold color={open2>0?"#f59e0b":"#1e3a5f"}>{open2}</TD>
                      <TD right bold color="#34d399">{f$(rev2)}</TD>
                      <TD right color="#64748b">{fH(hrs2)}</TD>
                      <TD right bold color="#60a5fa">{f$(hrs2>0?rev2/hrs2:0)}</TD>
                      <TD right>
                        <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                          <div style={{width:48,height:4,background:"#0f2040",borderRadius:2,overflow:"hidden"}}>
                            <div style={{width:`${comp2}%`,height:"100%",background:comp2===100?"#10b981":comp2>70?"#3b82f6":"#f59e0b"}}/>
                          </div>
                          <span style={{fontSize:11,color:"#475569",minWidth:28,textAlign:"right"}}>{comp2}%</span>
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
          <div style={{background:"#0a1628",border:"1px solid #0f2040",borderRadius:10,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
                <thead>
                  <tr style={{background:"#070f1f"}}>
                    <TH>Date</TH><TH>Client</TH><TH>Service</TH><TH>Crew</TH>
                    <TH>Start</TH><TH>End</TH><TH>Status</TH>
                    <TH right>Amount</TH><TH right>Actual Hrs</TH><TH right>Budget Hrs</TH><TH/>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length===0&&(
                    <tr><td colSpan={11} style={{padding:"32px",textAlign:"center",color:"#1e3a5f",fontSize:13}}>No jobs match current filters</td></tr>
                  )}
                  {jobs.map(j=>(
                    <JobRow key={j.ID} job={j} expanded={expID===j.ID} onToggle={()=>setExpID(expID===j.ID?null:j.ID)}/>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{margin:"0 20px 20px",background:"#050e1c",border:"1px solid #0a1628",borderRadius:8,padding:"10px 14px",display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:14}}>🗄️</span>
        <span style={{fontSize:11,color:"#1e3a5f",lineHeight:1.5}}>
          <span style={{color:"#334155",fontWeight:700}}>Supabase schema ready · </span>
          Tables: <code style={{color:"#3b82f6",fontSize:10.5}}>sa_jobs</code> · <code style={{color:"#3b82f6",fontSize:10.5}}>sa_job_snapshots</code> · <code style={{color:"#3b82f6",fontSize:10.5}}>sa_sync_log</code> ·
          Views: <code style={{color:"#8b5cf6",fontSize:10.5}}>v_crew_daily_kpis</code> · <code style={{color:"#8b5cf6",fontSize:10.5}}>v_crew_weekly_kpis</code> · <code style={{color:"#8b5cf6",fontSize:10.5}}>v_skipped_jobs</code>
        </span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #070f1f; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        select option { background: #0f172a; }
      `}</style>
    </div>
  );
}
