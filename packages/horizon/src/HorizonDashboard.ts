export function renderHorizonDashboard(basePath: string, token?: string): string {
  const appUrl = process.env.APP_URL || '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Horizon</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
:root{--bg:#0f1117;--bg2:#1a1d28;--bg3:#252836;--border:#2d3147;--text:#e2e8f0;--muted:#94a3b8;--accent:#6366f1;--green:#10b981;--yellow:#f59e0b;--red:#ef4444;--blue:#3b82f6}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:ui-monospace,'Cascadia Code',monospace;font-size:13px;min-height:100vh}
header{background:var(--bg2);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
header h1{font-size:17px;font-weight:700;color:var(--accent);letter-spacing:.1em}
.hdr-right{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:11px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;margin-right:4px;animation:pulse 2s infinite}
.dot.err{background:var(--red)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.wrap{max-width:1400px;margin:0 auto;padding:20px 24px}
.grid-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px}
.stat{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px}
.stat .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px}
.stat .val{font-size:24px;font-weight:700}
.val.g{color:var(--green)}.val.y{color:var(--yellow)}.val.r{color:var(--red)}.val.b{color:var(--blue)}
.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
@media(max-width:900px){.chart-row{grid-template-columns:1fr}}
.chart-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px}
.chart-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:12px}
.chart-wrap{position:relative;height:180px}
section{margin-bottom:20px}
section h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.section-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
table{width:100%;border-collapse:collapse;background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
th{background:var(--bg3);padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:600}
td{padding:8px 12px;border-top:1px solid var(--border);vertical-align:middle}
tr:hover td{background:rgba(255,255,255,.02)}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.running{background:rgba(16,185,129,.15);color:var(--green)}
.paused{background:rgba(245,158,11,.15);color:var(--yellow)}
.stopped{background:rgba(239,68,68,.15);color:var(--red)}
.processed{background:rgba(16,185,129,.15);color:var(--green)}
.failed{background:rgba(239,68,68,.15);color:var(--red)}
.pending{background:rgba(99,102,241,.15);color:var(--accent)}
.btn{padding:3px 9px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;font-size:11px;font-family:inherit;transition:.15s}
.btn:hover{background:var(--bg3)}
.btn.d{border-color:var(--red);color:var(--red)}.btn.d:hover{background:rgba(239,68,68,.1)}
.btn.s{border-color:var(--green);color:var(--green)}.btn.s:hover{background:rgba(16,185,129,.1)}
.btn.p{border-color:var(--accent);color:var(--accent)}.btn.p:hover{background:rgba(99,102,241,.1)}
.btn.y{border-color:var(--yellow);color:var(--yellow)}.btn.y:hover{background:rgba(245,158,11,.1)}
.acts{display:flex;gap:6px;flex-wrap:wrap}
.qgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.qcard{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:10px}
.qcard .qn{font-size:10px;color:var(--muted);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qcard .qs{font-size:20px;font-weight:700;margin-bottom:8px}
.qcard .qacts{display:flex;gap:4px;flex-wrap:wrap}
.empty{text-align:center;padding:18px;color:var(--muted)}
.trunc{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
code{font-family:inherit;background:var(--bg3);padding:1px 4px;border-radius:3px;font-size:11px}
.dur-bar{height:4px;border-radius:2px;background:var(--accent);margin-top:4px;transition:width .3s}
tr.clickable{cursor:pointer}
.pg{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11px;color:var(--muted)}
/* filter bar */
.filter-bar{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center}
.filter-bar select,.filter-bar input{background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-family:inherit;font-size:11px}
/* modals */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:100;display:flex;align-items:center;justify-content:center}
.modal{background:var(--bg2);border:1px solid var(--border);border-radius:10px;width:min(680px,96vw);max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.modal-hdr{padding:13px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.modal-hdr h2{font-size:13px;font-weight:700}
.modal-close{background:transparent;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:0 4px;line-height:1;transition:.1s}
.modal-close:hover{color:var(--text)}
.modal-body{overflow-y:auto;padding:16px 18px;flex:1}
.mds{margin-bottom:14px}
.mds h3{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px}
.mdt{width:100%;border-collapse:collapse}
.mdt td{padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;vertical-align:top}
.mdt td:first-child{color:var(--muted);width:28%;padding-right:10px}
.mpre{background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px;overflow:auto;font-size:11px;white-space:pre-wrap;word-break:break-all;max-height:220px;margin-top:4px}
/* start worker form */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.form-group{display:flex;flex-direction:column;gap:4px}
.form-group label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.form-group input,.form-group select{background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:4px;font-family:inherit;font-size:12px}
.form-group input:focus,.form-group select:focus{outline:none;border-color:var(--accent)}
</style>
</head>
<body>
<header>
  <h1>HORIZON</h1>
  <div class="hdr-right">
    <span><span class="dot" id="dot"></span><span id="ts">Connecting…</span></span>
  </div>
</header>
<div class="wrap">

  <!-- Stats -->
  <div class="grid-stats">
    <div class="stat"><div class="lbl">Active Workers</div><div class="val g" id="s-aw">-</div></div>
    <div class="stat"><div class="lbl">Paused Workers</div><div class="val y" id="s-pw">-</div></div>
    <div class="stat"><div class="lbl">Throughput / min</div><div class="val b" id="s-tp">-</div></div>
    <div class="stat"><div class="lbl">Processed</div><div class="val g" id="s-pr">-</div></div>
    <div class="stat"><div class="lbl">Failed</div><div class="val r" id="s-fa">-</div></div>
    <div class="stat"><div class="lbl">Memory</div><div class="val" id="s-mem">-</div></div>
    <div class="stat"><div class="lbl">Uptime</div><div class="val" id="s-up">-</div></div>
  </div>

  <!-- Charts -->
  <div class="chart-row">
    <div class="chart-card">
      <div class="chart-title">Throughput — jobs/min (last hour)</div>
      <div class="chart-wrap"><canvas id="chart-tp"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Processing time — ms (last hour)</div>
      <div class="chart-wrap"><canvas id="chart-dur"></canvas></div>
    </div>
  </div>

  <!-- Workers -->
  <section>
    <h2>Workers
      <div class="section-actions">
        <button class="btn p" onclick="openStartWorker()">+ Start Worker</button>
      </div>
    </h2>
    <table>
      <thead><tr><th>ID</th><th>Connection</th><th>Queues</th><th>Status</th><th>Processed</th><th>Memory</th><th>Runtime</th><th>Last Run</th><th>Current Job</th><th>Actions</th></tr></thead>
      <tbody id="wb"><tr><td colspan="10" class="empty">No workers registered</td></tr></tbody>
    </table>
  </section>

  <!-- Queue sizes -->
  <section>
    <h2>Queues</h2>
    <div class="qgrid" id="qg"><div style="color:var(--muted)">Loading…</div></div>
  </section>

  <!-- Scheduler -->
  <section>
    <h2>Scheduled Tasks</h2>
    <table>
      <thead><tr><th>Task</th><th>Expression</th><th>Description</th><th>Last Run</th><th>Next Run</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="sb"><tr><td colspan="7" class="empty">No scheduled tasks</td></tr></tbody>
    </table>
  </section>

  <!-- Recent Jobs -->
  <section>
    <h2>Recent Jobs</h2>
    <div class="filter-bar">
      <select id="f-queue" onchange="applyFilters()"><option value="">All queues</option></select>
      <select id="f-status" onchange="applyFilters()">
        <option value="">All statuses</option>
        <option value="processed">Processed</option>
        <option value="failed">Failed</option>
      </select>
      <input id="f-search" placeholder="Search job name…" oninput="applyFilters()" style="width:180px">
    </div>
    <table>
      <thead><tr><th>Job</th><th>Queue</th><th>Connection</th><th>Status</th><th>Duration</th><th>Completed At</th></tr></thead>
      <tbody id="jb"><tr><td colspan="6" class="empty">No recent jobs</td></tr></tbody>
    </table>
    <div class="pg" id="job-pg"></div>
  </section>

  <!-- Failed Jobs -->
  <section>
    <h2>Failed Jobs
      <div class="section-actions">
        <button class="btn d" onclick="flushFailed()">Flush All</button>
      </div>
    </h2>
    <table>
      <thead><tr><th>UUID</th><th>Job</th><th>Queue</th><th>Connection</th><th>Exception</th><th>Failed At</th><th>Actions</th></tr></thead>
      <tbody id="fb"><tr><td colspan="7" class="empty">No failed jobs</td></tr></tbody>
    </table>
    <div class="pg" id="fail-pg"></div>
  </section>
</div>

<!-- Job / Pending detail modal -->
<div class="modal-bg" id="modal-bg" style="display:none" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <div class="modal-hdr">
      <h2 id="modal-title">Job Details</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<!-- Start Worker modal -->
<div class="modal-bg" id="sw-bg" style="display:none" onclick="if(event.target===this)closeStartWorker()">
  <div class="modal" style="width:min(500px,96vw)">
    <div class="modal-hdr">
      <h2>Start Worker</h2>
      <button class="modal-close" onclick="closeStartWorker()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1">
          <label>Worker ID</label>
          <input id="sw-id" placeholder="worker-1" value="worker-1">
        </div>
        <div class="form-group">
          <label>Connection</label>
          <input id="sw-conn" placeholder="redis (leave blank for default)">
        </div>
        <div class="form-group">
          <label>Queues (comma-separated)</label>
          <input id="sw-queues" placeholder="default,high,low" value="default">
        </div>
        <div class="form-group">
          <label>Max Tries</label>
          <input id="sw-tries" type="number" value="3">
        </div>
        <div class="form-group">
          <label>Memory (MB)</label>
          <input id="sw-mem" type="number" value="128">
        </div>
        <div class="form-group">
          <label>Timeout (s)</label>
          <input id="sw-timeout" type="number" value="60">
        </div>
        <div class="form-group">
          <label>Sleep (s)</label>
          <input id="sw-sleep" type="number" value="3">
        </div>
      </div>
      <button class="btn s" style="width:100%;padding:8px" onclick="startWorker()">Start Worker</button>
    </div>
  </div>
</div>

<script>
const B='${basePath}';
const APP_URL='${appUrl}';
const API_BASE = APP_URL && APP_URL.trim() ? APP_URL.replace(new RegExp('/+$'), '') + B : B;
const T=${token ? `'${token}'` : "null"};
const H=T?{'Authorization':'Bearer '+T}:{};

Chart.defaults.color='#94a3b8';
Chart.defaults.borderColor='#2d3147';
Chart.defaults.font.family="ui-monospace,'Cascadia Code',monospace";
Chart.defaults.font.size=10;

const COPTS={
  responsive:true,maintainAspectRatio:false,animation:false,
  plugins:{legend:{labels:{color:'#94a3b8',boxWidth:10,padding:12}}},
  scales:{
    x:{ticks:{color:'#94a3b8',maxRotation:0,maxTicksLimit:12},grid:{color:'rgba(45,49,71,.6)'}},
    y:{ticks:{color:'#94a3b8'},grid:{color:'rgba(45,49,71,.6)'},beginAtZero:true},
  },
};

let chartTp, chartDur;
function initCharts(){
  chartTp=new Chart(document.getElementById('chart-tp'),{
    type:'line',
    data:{labels:[],datasets:[
      {label:'Processed',data:[],borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.12)',fill:true,tension:.3,pointRadius:2},
      {label:'Failed',data:[],borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,.12)',fill:true,tension:.3,pointRadius:2},
    ]},options:{...COPTS},
  });
  chartDur=new Chart(document.getElementById('chart-dur'),{
    type:'line',
    data:{labels:[],datasets:[
      {label:'Avg ms',data:[],borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.08)',fill:true,tension:.3,pointRadius:2},
      {label:'Max ms',data:[],borderColor:'#f59e0b',tension:.3,borderDash:[4,3],pointRadius:0},
    ]},options:{...COPTS},
  });
}

/* ── Helpers ── */
function fmt(d){if(!d)return'-';const t=new Date(d);return t.toLocaleDateString()+' '+t.toLocaleTimeString();}
function dur(ms){if(!ms&&ms!==0)return'-';return ms<1000?ms+'ms':(ms/1000).toFixed(2)+'s';}
function up(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return h?h+'h '+m+'m':m?m+'m '+x+'s':x+'s';}
function badge(s){return '<span class="badge '+s+'">'+s+'</span>';}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
async function api(p,o={}){
  const r=await fetch(API_BASE+p,{headers:{...H,'Content-Type':'application/json'},...o});
  return r.json();
}

/* ── Pagination & state ── */
let allJobs=[],allFailed=[],filteredJobs=[],jobPage=0,failPage=0;
const PG=20;

/* ── Job filters ── */
function applyFilters(){
  const q=document.getElementById('f-queue').value;
  const st=document.getElementById('f-status').value;
  const s=(document.getElementById('f-search').value||'').toLowerCase();
  filteredJobs=allJobs.filter(j=>{
    if(q&&j.queue!==q)return false;
    if(st&&j.status!==st)return false;
    if(s&&!(j.displayName||'').toLowerCase().includes(s))return false;
    return true;
  });
  jobPage=0;
  renderJobs();
}

function updateQueueFilter(jobs){
  const sel=document.getElementById('f-queue');
  const cur=sel.value;
  const queues=[...new Set(jobs.map(j=>j.queue).filter(Boolean))].sort();
  sel.innerHTML='<option value="">All queues</option>'+queues.map(q=>'<option value="'+esc(q)+'">'+esc(q)+'</option>').join('');
  if(cur)sel.value=cur;
}

function renderJobs(){
  const list=filteredJobs.length||document.getElementById('f-queue').value||document.getElementById('f-status').value||document.getElementById('f-search').value?filteredJobs:allJobs;
  const total=list.length,pages=Math.max(1,Math.ceil(total/PG));
  if(jobPage>=pages)jobPage=pages-1;
  const slice=list.slice(jobPage*PG,(jobPage+1)*PG),base=jobPage*PG;
  const maxDur=Math.max(...slice.map(j=>j.durationMs||0),1);
  var html='';
  if(!slice.length){html='<tr><td colspan="6" class="empty">No jobs</td></tr>';}
  else{slice.forEach(function(j,i){
    html+='<tr class="clickable" onclick="showJobModal('+JSON.stringify(list)+'['+(base+i)+'])">'
      +'<td class="trunc" title="'+esc(j.displayName||'')+'">'+esc(j.displayName||'-')+'</td>'
      +'<td>'+esc(j.queue||'-')+'</td><td>'+esc(j.connection||'-')+'</td>'
      +'<td>'+badge(j.status||'-')+'</td>'
      +'<td>'+dur(j.durationMs)+'<div class="dur-bar" style="width:'+Math.round((j.durationMs||0)/maxDur*100)+'%;background:'+(j.status==='failed'?'var(--red)':'var(--accent)')+'"></div></td>'
      +'<td>'+fmt(j.completedAt)+'</td>'
      +'</tr>';
  });}
  document.getElementById('jb').innerHTML=html;
  const pgEl=document.getElementById('job-pg');
  pgEl.innerHTML=total>PG?'<span>'+(base+1)+'–'+Math.min(base+PG,total)+' of '+total+'</span>'
    +'<button class="btn" '+(jobPage===0?'disabled':'')+' onclick="jobPage--;renderJobs()">← Prev</button>'
    +'<button class="btn" '+(jobPage>=pages-1?'disabled':'')+' onclick="jobPage++;renderJobs()">Next →</button>':'';
}

function renderFailed(){
  const total=allFailed.length,pages=Math.max(1,Math.ceil(total/PG));
  if(failPage>=pages)failPage=pages-1;
  const slice=allFailed.slice(failPage*PG,(failPage+1)*PG),base=failPage*PG;
  var html='';
  if(!slice.length){html='<tr><td colspan="7" class="empty">No failed jobs</td></tr>';}
  else{slice.forEach(function(j,i){
    var name=j.displayName||(j.payload&&JSON.parse(j.payload||'{}').displayName)||'Unknown';
    var uuid=j.uuid||'';
    html+='<tr class="clickable" onclick="showJobModal(allFailed['+(base+i)+'])">'
      +'<td class="trunc" title="'+esc(uuid)+'">'+esc(uuid.slice(0,8))+'…</td>'
      +'<td class="trunc" title="'+esc(name)+'">'+esc(name)+'</td>'
      +'<td>'+esc(j.queue||'-')+'</td><td>'+esc(j.connection||'-')+'</td>'
      +'<td class="trunc" title="'+esc(j.exception||'')+'">'+esc((j.exception||'').slice(0,50)||'-')+'</td>'
      +'<td>'+fmt(j.failed_at||j.failedAt)+'</td>'
      +'<td><div class="acts">'
        +'<button class="btn s" onclick="event.stopPropagation();retryF(allFailed['+(base+i)+'].uuid)">Retry</button>'
        +'<button class="btn d" onclick="event.stopPropagation();forgetF(allFailed['+(base+i)+'].uuid)">Delete</button>'
      +'</div></td>'
      +'</tr>';
  });}
  document.getElementById('fb').innerHTML=html;
  const pgEl=document.getElementById('fail-pg');
  pgEl.innerHTML=total>PG?'<span>'+(base+1)+'–'+Math.min(base+PG,total)+' of '+total+'</span>'
    +'<button class="btn" '+(failPage===0?'disabled':'')+' onclick="failPage--;renderFailed()">← Prev</button>'
    +'<button class="btn" '+(failPage>=pages-1?'disabled':'')+' onclick="failPage++;renderFailed()">Next →</button>':'';
}

/* ── Job detail modal ── */
function showJobModal(j){
  if(!j)return;
  document.getElementById('modal-title').textContent=j.displayName||j.name||'Job';
  function mrow(k,v){return'<tr><td>'+k+'</td><td>'+v+'</td></tr>';}
  var info=mrow('Queue',esc(j.queue||'-'))+mrow('Connection',esc(j.connection||'-'))
    +mrow('Status',badge(j.status||'pending'))+mrow('Duration',dur(j.durationMs))
    +mrow('Attempts',j.attempts!=null?j.attempts:'-')
    +mrow('Completed',fmt(j.completedAt||j.failed_at||j.failedAt));
  if(j.uuid)info+=mrow('UUID','<code>'+esc(j.uuid)+'</code>');
  if(j.availableAt)info+=mrow('Available At',fmt(new Date(j.availableAt*1000)));
  if(j.createdAt&&!j.completedAt)info+=mrow('Created At',fmt(new Date(j.createdAt*1000)));
  var body='<div class="mds"><h3>Info</h3><table class="mdt">'+info+'</table></div>';
  var payload=j.payload||j.data||j.args;
  if(typeof payload==='string'){try{payload=JSON.parse(payload);}catch{}}
  if(payload!=null)body+='<div class="mds"><h3>Payload</h3><pre class="mpre">'+esc(JSON.stringify(payload,null,2))+'</pre></div>';
  if(j.exception)body+='<div class="mds"><h3>Exception</h3><pre class="mpre">'+esc(j.exception)+'</pre></div>';
  var trace=j.exception_trace||j.trace||j.stackTrace;
  if(trace)body+='<div class="mds"><h3>Stack Trace</h3><pre class="mpre">'+esc(trace)+'</pre></div>';
  document.getElementById('modal-body').innerHTML=body;
  document.getElementById('modal-bg').style.display='flex';
}
function closeModal(){document.getElementById('modal-bg').style.display='none';}

/* ── Pending queue jobs modal ── */
async function browseQueue(qname){
  document.getElementById('modal-title').textContent='Pending: '+qname;
  document.getElementById('modal-body').innerHTML='<div style="color:var(--muted);text-align:center;padding:16px">Loading…</div>';
  document.getElementById('modal-bg').style.display='flex';
  try{
    const jobs=await api('/api/queues/'+encodeURIComponent(qname)+'/jobs');
    if(!jobs.length){document.getElementById('modal-body').innerHTML='<div class="empty">Queue is empty</div>';return;}
    var html='<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--bg3)"><th style="padding:6px 10px;font-size:10px;color:var(--muted)">Job</th><th style="padding:6px 10px;font-size:10px;color:var(--muted)">Attempts</th><th style="padding:6px 10px;font-size:10px;color:var(--muted)">Created</th></tr></thead><tbody>';
    jobs.slice(0,100).forEach(function(j){
      html+='<tr class="clickable" onclick="showJobModal('+esc(JSON.stringify(j))+')" style="border-top:1px solid var(--border)">'
        +'<td style="padding:7px 10px">'+esc(j.displayName||j.job||'-')+'</td>'
        +'<td style="padding:7px 10px">'+j.attempts+'</td>'
        +'<td style="padding:7px 10px">'+fmt(j.createdAt?new Date(j.createdAt*1000):null)+'</td>'
        +'</tr>';
    });
    html+='</tbody></table>';
    if(jobs.length>100)html+='<div style="color:var(--muted);font-size:11px;padding:8px 10px">Showing first 100 of '+jobs.length+'</div>';
    document.getElementById('modal-body').innerHTML=html;
  }catch(e){
    document.getElementById('modal-body').innerHTML='<div class="empty">Error: '+esc(e.message)+'</div>';
  }
}

/* ── Worker actions ── */
async function wAction(id,act){await api('/api/workers/'+encodeURIComponent(id)+'/'+act,{method:'POST'});refresh();}

/* ── Start Worker ── */
function openStartWorker(){document.getElementById('sw-bg').style.display='flex';}
function closeStartWorker(){document.getElementById('sw-bg').style.display='none';}
async function startWorker(){
  const id=document.getElementById('sw-id').value.trim();
  if(!id){alert('Worker ID is required');return;}
  const conn=document.getElementById('sw-conn').value.trim()||undefined;
  const queues=document.getElementById('sw-queues').value.trim()||'default';
  const def={
    id,
    connection:conn,
    queues:queues.split(',').map(q=>q.trim()).filter(Boolean),
    options:{
      maxTries:parseInt(document.getElementById('sw-tries').value)||3,
      memory:parseInt(document.getElementById('sw-mem').value)||128,
      timeout:parseInt(document.getElementById('sw-timeout').value)||60,
      sleep:parseInt(document.getElementById('sw-sleep').value)||3,
    },
  };
  try{
    await api('/api/workers',{method:'POST',body:JSON.stringify(def)});
    closeStartWorker();
    refresh();
  }catch(e){alert('Error: '+e.message);}
}

/* ── Queue actions ── */
async function purgeQueue(qname){
  if(!confirm('Purge all pending jobs in "'+qname+'"? This cannot be undone.'))return;
  try{
    const r=await api('/api/queues/'+encodeURIComponent(qname),{method:'DELETE'});
    alert('Purged '+(r.purged||0)+' jobs from '+qname);
    refresh();
  }catch(e){alert('Error: '+e.message);}
}

/* ── Scheduler actions ── */
async function runTaskNow(name){
  if(!confirm('Run "'+name+'" now?'))return;
  try{
    const r=await api('/api/scheduler/'+encodeURIComponent(name)+'/run',{method:'POST'});
    if(r.error)alert('Error: '+r.error);
    else{alert('Task dispatched: '+name);refresh();}
  }catch(e){alert('Error: '+e.message);}
}

/* ── Failed job actions ── */
async function retryF(uuid){await api('/api/jobs/failed/'+uuid+'/retry',{method:'POST'});refresh();}
async function forgetF(uuid){if(!confirm('Delete this failed job?'))return;await api('/api/jobs/failed/'+uuid,{method:'DELETE'});refresh();}
async function flushFailed(){if(!confirm('Delete ALL failed jobs?'))return;await api('/api/jobs/failed',{method:'DELETE'});refresh();}

/* ── Main refresh ── */
let _busy=false,_timer;
async function refresh(){
  clearTimeout(_timer);
  if(_busy){_timer=setTimeout(refresh,5000);return;}
  _busy=true;
  try{
    const[sum,workers,queues,jobs,failed,sched,metrics]=await Promise.all([
      api('/api/stats'),api('/api/workers'),api('/api/queues'),
      api('/api/jobs/recent?limit=200'),api('/api/jobs/failed'),api('/api/scheduler'),
      api('/api/metrics'),
    ]);

    document.getElementById('s-aw').textContent=sum.activeWorkers;
    document.getElementById('s-pw').textContent=sum.pausedWorkers;
    document.getElementById('s-tp').textContent=sum.throughputPerMinute;
    document.getElementById('s-pr').textContent=sum.totalProcessed;
    document.getElementById('s-fa').textContent=sum.totalFailed;
    document.getElementById('s-mem').textContent=sum.memoryMb+'MB';
    document.getElementById('s-up').textContent=up(sum.uptimeSeconds);
    document.getElementById('dot').className='dot';
    document.getElementById('ts').textContent='Updated '+new Date().toLocaleTimeString();

    /* Charts */
    if(metrics&&metrics.length){
      const labels=metrics.map(b=>{const d=new Date(b.ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');});
      chartTp.data.labels=labels;
      chartTp.data.datasets[0].data=metrics.map(b=>b.processed);
      chartTp.data.datasets[1].data=metrics.map(b=>b.failed);
      chartTp.update('none');
      chartDur.data.labels=labels;
      chartDur.data.datasets[0].data=metrics.map(b=>b.processed?Math.round(b.totalMs/b.processed):null);
      chartDur.data.datasets[1].data=metrics.map(b=>b.maxMs||null);
      chartDur.update('none');
    }

    /* Workers */
    const wb=document.getElementById('wb');
    wb.innerHTML=!workers.length?'<tr><td colspan="10" class="empty">No workers registered</td></tr>':workers.map(w=>\`
      <tr>
        <td class="trunc" title="\${esc(w.id)}">\${esc(w.id)}</td>
        <td>\${esc(w.connection||'-')}</td>
        <td>\${esc((Array.isArray(w.queues)?w.queues:['default']).join(', '))}</td>
        <td>\${badge(w.status)}</td>
        <td>\${w.jobsProcessed}</td>
        <td>\${w.memoryMb?Math.round(w.memoryMb)+'MB':'-'}</td>
        <td>\${w.runtimeSeconds?Math.round(w.runtimeSeconds)+'s':'-'}</td>
        <td>\${fmt(w.lastRun)}</td>
        <td class="trunc" title="\${w.currentJob?esc(w.currentJob.displayName):''}">\${w.currentJob?esc(w.currentJob.displayName):'-'}</td>
        <td><div class="acts">
          \${w.status==='running'?'<button class="btn" onclick="wAction(\\''+esc(w.id)+'\\',\\'pause\\')">Pause</button>':''}
          \${w.status==='paused'?'<button class="btn s" onclick="wAction(\\''+esc(w.id)+'\\',\\'resume\\')">Resume</button>':''}
          \${w.status!=='stopped'?'<button class="btn d" onclick="wAction(\\''+esc(w.id)+'\\',\\'stop\\')">Stop</button>':''}
        </div></td>
      </tr>\`).join('');

    /* Queues */
    const qg=document.getElementById('qg');
    const qe=Object.entries(queues);
    qg.innerHTML=!qe.length?'<div style="color:var(--muted)">No queues</div>':qe.map(([n,s])=>
      '<div class="qcard">'
        +'<div class="qn" title="'+esc(n)+'">'+esc(n)+'</div>'
        +'<div class="qs">'+s+'</div>'
        +'<div class="qacts">'
          +'<button class="btn p" style="font-size:10px;padding:2px 6px" onclick="browseQueue('+JSON.stringify(n)+')">Browse</button>'
          +(s>0?'<button class="btn d" style="font-size:10px;padding:2px 6px" onclick="purgeQueue('+JSON.stringify(n)+')">Purge</button>':'')
        +'</div>'
      +'</div>').join('');

    /* Scheduler */
    const sb=document.getElementById('sb');
    sb.innerHTML=!sched.length?'<tr><td colspan="7" class="empty">No scheduled tasks</td></tr>':sched.map(t=>\`
      <tr>
        <td class="trunc" title="\${esc(t.name)}">\${esc(t.name)}</td>
        <td><code>\${esc(t.expression)}</code></td>
        <td>\${esc(t.description||'-')}</td>
        <td>\${fmt(t.lastRun)}</td>
        <td>\${fmt(t.nextRun)}</td>
        <td>\${t.isRunning?badge('running'):'-'}</td>
        <td><button class="btn y" onclick="runTaskNow(\\''+esc(t.name)+'\\')">Run Now</button></td>
      </tr>\`).join('');

    /* Recent Jobs */
    allJobs=Array.isArray(jobs)?jobs:[];
    updateQueueFilter(allJobs);
    applyFilters();

    /* Failed Jobs */
    allFailed=Array.isArray(failed)?failed:[];
    renderFailed();

  }catch(e){
    document.getElementById('dot').className='dot err';
    document.getElementById('ts').textContent='Error: '+e.message;
  }finally{
    _busy=false;
    _timer=setTimeout(refresh,5000);
  }
}

initCharts();
refresh();
</script>
</body>
</html>`;
}
