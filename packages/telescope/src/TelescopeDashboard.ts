export function renderTelescopeDashboard(basePath: string, token?: string): string {
  const appUrl = process.env.APP_URL || "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Telescope</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
:root{--bg:#0f1117;--bg2:#1a1d28;--bg3:#252836;--border:#2d3147;--text:#e2e8f0;--muted:#94a3b8;--accent:#8b5cf6;--green:#10b981;--yellow:#f59e0b;--red:#ef4444;--blue:#3b82f6;--orange:#f97316}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:ui-monospace,'Cascadia Code',monospace;font-size:13px;display:flex;height:100vh;overflow:hidden}
/* Sidebar */
.sidebar{width:200px;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
.sb-hdr{padding:14px 16px;border-bottom:1px solid var(--border)}
.sb-hdr h1{font-size:15px;font-weight:700;color:var(--accent);letter-spacing:.1em}
.sb-sub{font-size:10px;color:var(--muted);margin-top:3px}
.dot{width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;margin-right:4px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.nav{flex:1;padding:8px;overflow-y:auto}
.nav-grp{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);padding:10px 10px 4px}
.nav-it{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:6px;cursor:pointer;color:var(--muted);margin-bottom:1px;transition:.1s}
.nav-it:hover,.nav-it.active{background:var(--bg3);color:var(--text)}
.nav-it .cnt{background:var(--bg3);border-radius:10px;padding:1px 7px;font-size:10px;min-width:20px;text-align:center}
.nav-it.active .cnt{background:var(--accent);color:#fff}
.sb-foot{padding:10px;border-top:1px solid var(--border)}
.clear-btn{width:100%;padding:6px;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit;transition:.15s}
.clear-btn:hover{border-color:var(--red);color:var(--red);background:rgba(239,68,68,.05)}
/* Main */
.main{flex:1;display:flex;overflow:hidden}
/* Entry list pane */
.list-panel{width:360px;border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
.lp-hdr{padding:9px 12px;border-bottom:1px solid var(--border)}
.lp-hdr input{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--text);font-size:12px;font-family:inherit;outline:none;transition:.15s}
.lp-hdr input:focus{border-color:var(--accent)}
.lp-body{flex:1;overflow-y:auto}
.entry{padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;align-items:flex-start;gap:9px;transition:.1s}
.entry:hover{background:rgba(255,255,255,.02)}
.entry.sel{background:var(--bg3);border-left:2px solid var(--accent)}
.entry .ico{width:26px;height:26px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:1px}
.entry .info{flex:1;min-width:0}
.entry .ttl{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.entry .meta{font-size:10px;color:var(--muted);margin-top:2px}
.entry .age{font-size:10px;color:var(--muted);flex-shrink:0;padding-top:2px}
.ico.request{background:rgba(59,130,246,.15);color:var(--blue)}
.ico.exception{background:rgba(239,68,68,.15);color:var(--red)}
.ico.job{background:rgba(16,185,129,.15);color:var(--green)}
.ico.schedule{background:rgba(249,115,22,.15);color:var(--orange)}
.ico.query{background:rgba(139,92,246,.15);color:var(--accent)}
.ico.log{background:rgba(245,158,11,.15);color:var(--yellow)}
.ico.cache{background:rgba(236,72,153,.15);color:#ec4899}
.ico.charts{background:rgba(99,102,241,.15);color:var(--accent)}
/* Detail pane */
.detail-panel{flex:1;display:flex;flex-direction:column;overflow:hidden}
.dp-hdr{padding:12px 18px;border-bottom:1px solid var(--border)}
.dp-ttl{font-size:14px;font-weight:600}
.dp-sub{font-size:11px;color:var(--muted);margin-top:3px}
.dp-body{flex:1;overflow-y:auto;padding:16px 18px}
.dp-empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted)}
.ds{margin-bottom:16px}
.ds h3{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:7px}
.dt{width:100%;border-collapse:collapse}
.dt td{padding:5px 0;border-bottom:1px solid var(--border);vertical-align:top;font-size:12px}
.dt td:first-child{color:var(--muted);width:33%;padding-right:10px}
pre{background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px;overflow-x:auto;font-size:11px;white-space:pre-wrap;word-break:break-all;margin-top:4px}
.badge{display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.04em}
.b200{background:rgba(16,185,129,.15);color:var(--green)}
.b4xx{background:rgba(245,158,11,.15);color:var(--yellow)}
.b5xx{background:rgba(239,68,68,.15);color:var(--red)}
.m-get{background:rgba(59,130,246,.15);color:var(--blue)}
.m-post{background:rgba(16,185,129,.15);color:var(--green)}
.m-put{background:rgba(245,158,11,.15);color:var(--yellow)}
.m-patch{background:rgba(249,115,22,.15);color:var(--orange)}
.m-delete{background:rgba(239,68,68,.15);color:var(--red)}
/* Charts view */
.charts-view{flex:1;overflow-y:auto;padding:16px}
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
@media(max-width:1100px){.chart-grid{grid-template-columns:1fr}}
.chart-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px}
.chart-title{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
.chart-title span{color:var(--text);font-size:12px;font-weight:600;letter-spacing:0;text-transform:none}
.chart-wrap{position:relative;height:170px}
.slow-table{width:100%;border-collapse:collapse}
.slow-table th{background:var(--bg3);padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.slow-table td{padding:7px 10px;border-top:1px solid var(--border);font-size:11px}
.slow-table tr:hover td{background:rgba(255,255,255,.02);cursor:pointer}
.dur-pill{display:inline-flex;align-items:center;gap:6px}
.dur-pill .bar{height:4px;border-radius:2px;background:var(--accent);min-width:4px}
.status-bars{display:flex;flex-direction:column;gap:4px}
.status-row{display:flex;align-items:center;gap:8px;font-size:11px}
.status-row .label{width:40px;color:var(--muted);flex-shrink:0}
.status-row .fill{height:14px;border-radius:2px;min-width:2px}
.status-row .num{color:var(--text);width:40px}
</style>
</head>
<body>
<div class="sidebar">
  <div class="sb-hdr">
    <h1>TELESCOPE</h1>
    <div class="sb-sub"><span class="dot"></span>Live</div>
  </div>
  <div class="nav">
    <div class="nav-grp">Views</div>
    <div class="nav-it" id="nav-charts" onclick="showCharts(this)">Charts <span class="cnt">↗</span></div>
    <div class="nav-grp">Watchers</div>
    <div class="nav-it active" id="nav-all" onclick="setType(null,this)">All <span class="cnt" id="c-all">0</span></div>
    <div class="nav-it" id="nav-request" onclick="setType('request',this)">Requests <span class="cnt" id="c-request">0</span></div>
    <div class="nav-it" id="nav-exception" onclick="setType('exception',this)">Exceptions <span class="cnt" id="c-exception">0</span></div>
    <div class="nav-it" id="nav-job" onclick="setType('job',this)">Jobs <span class="cnt" id="c-job">0</span></div>
    <div class="nav-it" id="nav-schedule" onclick="setType('schedule',this)">Schedule <span class="cnt" id="c-schedule">0</span></div>
    <div class="nav-it" id="nav-query" onclick="setType('query',this)">Queries <span class="cnt" id="c-query">0</span></div>
    <div class="nav-it" id="nav-log" onclick="setType('log',this)">Logs <span class="cnt" id="c-log">0</span></div>
    <div class="nav-it" id="nav-cache" onclick="setType('cache',this)">Cache <span class="cnt" id="c-cache">0</span></div>
  </div>
  <div class="sb-foot">
    <button class="clear-btn" onclick="clearAll()">Clear All Entries</button>
  </div>
</div>

<div class="main" id="main">
  <!-- Entry list -->
  <div class="list-panel" id="list-panel">
    <div class="lp-hdr">
      <input type="text" id="search" placeholder="Search entries…" oninput="renderList()">
    </div>
    <div class="lp-body" id="list-body"><div class="dp-empty">Loading…</div></div>
  </div>

  <!-- Detail / Charts pane -->
  <div class="detail-panel" id="detail-panel">
    <div class="dp-empty" id="detail-wrap">↑ Select an entry to inspect</div>
  </div>
</div>

<script>
const B='${basePath}';
const APP_URL='${appUrl}';
const API_BASE = APP_URL && APP_URL.trim() ? APP_URL.replace(new RegExp('/+$'), '') + B : B;
const T=${token ? `'${token}'` : "null"};
const HDR=T?{'Authorization':'Bearer '+T}:{};

Chart.defaults.color='#94a3b8';
Chart.defaults.borderColor='#2d3147';
Chart.defaults.font.family="ui-monospace,'Cascadia Code',monospace";
Chart.defaults.font.size=10;
const COPTS={responsive:true,maintainAspectRatio:false,animation:false,
  plugins:{legend:{labels:{color:'#94a3b8',boxWidth:10,padding:10}}},
  scales:{
    x:{ticks:{color:'#94a3b8',maxRotation:0,maxTicksLimit:12},grid:{color:'rgba(45,49,71,.5)'}},
    y:{ticks:{color:'#94a3b8'},grid:{color:'rgba(45,49,71,.5)'},beginAtZero:true},
  },
};

const ICONS={request:'→',exception:'!',job:'⚙',schedule:'⏰',query:'⬡',log:'▪',cache:'◈'};
let curType=null,selId=null,entries=[],chartsActive=false;
let chartReq=null,chartQuery=null;

/* ── Sidebar: Charts view ─────────────────────────────────────────── */
function showCharts(el){
  chartsActive=true;selId=null;
  document.querySelectorAll('.nav-it').forEach(e=>e.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('list-panel').style.display='none';
  const dp=document.getElementById('detail-panel');
  dp.innerHTML='<div class="charts-view" id="charts-view"><div style="color:var(--muted);padding:20px">Loading charts…</div></div>';
  loadCharts();
}

function exitCharts(){
  chartsActive=false;
  document.getElementById('list-panel').style.display='';
  chartReq=null; chartQuery=null;
}

function setType(t,el){
  exitCharts();
  curType=t;selId=null;
  document.querySelectorAll('.nav-it').forEach(e=>e.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('detail-panel').innerHTML='<div class="dp-empty">↑ Select an entry to inspect</div>';
  refresh();
}

/* ── Charts rendering ─────────────────────────────────────────────── */
async function loadCharts(){
  const[metrics,slow]=await Promise.all([
    fetch(API_BASE+'/api/metrics',{headers:HDR}).then(r=>r.json()),
    fetch(API_BASE+'/api/slow',{headers:HDR}).then(r=>r.json()),
  ]);

  const reqBuckets=metrics.requests||[];
  const qBuckets=metrics.queries||[];
  const labels=reqBuckets.map(b=>{const d=new Date(b.ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');});

  /* Status code breakdown from recent request entries */
  const statuses={};
  (slow.requests||[]).forEach(e=>{const s=Math.floor((e.content.status||200)/100)*100;statuses[s]=(statuses[s]||0)+1;});

  const cv=document.getElementById('charts-view');
  if(!cv||!chartsActive)return;
  cv.innerHTML=\`
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Request Rate <span id="req-total"></span></div>
      <div class="chart-wrap"><canvas id="ch-req"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Avg Response Time (ms) <span id="req-avg"></span></div>
      <div class="chart-wrap"><canvas id="ch-reqt"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Query Rate <span id="q-total"></span></div>
      <div class="chart-wrap"><canvas id="ch-q"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Avg Query Time (ms) <span id="q-avg"></span></div>
      <div class="chart-wrap"><canvas id="ch-qt"></canvas></div>
    </div>
  </div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Slowest Requests (top 10)</div>
      <table class="slow-table" id="slow-req-tbl">
        <thead><tr><th>Method</th><th>URI</th><th>Status</th><th>Duration</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title">Slowest Queries (top 10)</div>
      <table class="slow-table" id="slow-q-tbl">
        <thead><tr><th>Query</th><th>Duration</th><th>Rows</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Status Code Distribution</div>
      <div id="status-bars" class="status-bars" style="padding:8px 0"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">P95 Response Time (ms)</div>
      <div class="chart-wrap"><canvas id="ch-p95"></canvas></div>
    </div>
  </div>\`;

  /* Request rate chart */
  const totalReqs=reqBuckets.reduce((a,b)=>a+b.count,0);
  document.getElementById('req-total').textContent=totalReqs+' total';
  new Chart(document.getElementById('ch-req'),{type:'bar',data:{labels,datasets:[
    {label:'Requests',data:reqBuckets.map(b=>b.count),backgroundColor:'rgba(59,130,246,.4)',borderColor:'#3b82f6',borderWidth:1},
    {label:'Errors',data:reqBuckets.map(b=>b.errors||0),backgroundColor:'rgba(239,68,68,.4)',borderColor:'#ef4444',borderWidth:1},
  ]},options:{...COPTS,plugins:{...COPTS.plugins,tooltip:{mode:'index'}}}});

  /* Avg response time */
  const avgReq=reqBuckets.filter(b=>b.count).reduce((a,b)=>a+b.avgDuration,0)/Math.max(1,reqBuckets.filter(b=>b.count).length);
  document.getElementById('req-avg').textContent='avg '+Math.round(avgReq)+'ms';
  new Chart(document.getElementById('ch-reqt'),{type:'line',data:{labels,datasets:[
    {label:'Avg ms',data:reqBuckets.map(b=>b.count?b.avgDuration:null),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.08)',fill:true,tension:.3,pointRadius:2,spanGaps:true},
  ]},options:{...COPTS}});

  /* Query rate */
  const totalQ=qBuckets.reduce((a,b)=>a+b.count,0);
  document.getElementById('q-total').textContent=totalQ+' total';
  new Chart(document.getElementById('ch-q'),{type:'bar',data:{labels:qBuckets.map(b=>{const d=new Date(b.ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}),datasets:[
    {label:'Queries',data:qBuckets.map(b=>b.count),backgroundColor:'rgba(139,92,246,.4)',borderColor:'#8b5cf6',borderWidth:1},
    {label:'Slow (>100ms)',data:qBuckets.map(b=>b.slowCount||0),backgroundColor:'rgba(245,158,11,.4)',borderColor:'#f59e0b',borderWidth:1},
  ]},options:{...COPTS}});

  /* Avg query time */
  const avgQ=qBuckets.filter(b=>b.count).reduce((a,b)=>a+b.avgDuration,0)/Math.max(1,qBuckets.filter(b=>b.count).length);
  document.getElementById('q-avg').textContent='avg '+Math.round(avgQ)+'ms';
  new Chart(document.getElementById('ch-qt'),{type:'line',data:{labels:qBuckets.map(b=>{const d=new Date(b.ts);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');}),datasets:[
    {label:'Avg ms',data:qBuckets.map(b=>b.count?b.avgDuration:null),borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,.08)',fill:true,tension:.3,pointRadius:2,spanGaps:true},
  ]},options:{...COPTS}});

  /* P95 response time */
  new Chart(document.getElementById('ch-p95'),{type:'line',data:{labels,datasets:[
    {label:'P95 ms',data:reqBuckets.map(b=>b.count?b.p95Duration:null),borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.08)',fill:true,tension:.3,pointRadius:2,spanGaps:true},
    {label:'Avg ms',data:reqBuckets.map(b=>b.count?b.avgDuration:null),borderColor:'#3b82f6',tension:.3,borderDash:[4,3],pointRadius:0,spanGaps:true},
  ]},options:{...COPTS}});

  /* Status bars */
  const total5=Object.values(statuses).reduce((a,b)=>a+b,0)||1;
  const colors={'2':'var(--green)','3':'var(--blue)','4':'var(--yellow)','5':'var(--red)'};
  const labels5={'2':'2xx','3':'3xx','4':'4xx','5':'5xx'};
  const sb2=document.getElementById('status-bars');
  sb2.innerHTML=Object.entries(statuses).sort().map(([s,n])=>\`
    <div class="status-row">
      <span class="label">\${labels5[String(s)[0]]||s+'xx'}</span>
      <div class="fill" style="width:\${Math.round(n/total5*100)}%;background:\${colors[String(s)[0]]||'var(--muted)'}"></div>
      <span class="num">\${n}</span>
    </div>\`).join('');
  if(!Object.keys(statuses).length)sb2.innerHTML='<div style="color:var(--muted);padding:8px">No data</div>';

  /* Slow requests table */
  const srBody=document.querySelector('#slow-req-tbl tbody');
  const maxRDur=Math.max(...(slow.requests||[]).map(e=>e.content.duration||0),1);
  srBody.innerHTML=(slow.requests||[]).map(e=>{
    const c=e.content;
    const pct=Math.round((c.duration||0)/maxRDur*80);
    const scls=c.status>=500?'b5xx':c.status>=400?'b4xx':'b200';
    return\`<tr onclick="selEntry('\${e.id}')">
      <td><span class="badge m-\${(c.method||'get').toLowerCase()}">\${c.method||''}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="\${c.uri||''}">\${(c.uri||'').slice(0,40)}</td>
      <td><span class="badge \${scls}">\${c.status||''}</span></td>
      <td><div class="dur-pill"><div class="bar" style="width:\${pct}px"></div>\${c.duration||0}ms</div></td>
    </tr>\`;
  }).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:12px">No data</td></tr>';

  /* Slow queries table */
  const sqBody=document.querySelector('#slow-q-tbl tbody');
  const maxQDur=Math.max(...(slow.queries||[]).map(e=>e.content.duration||0),1);
  sqBody.innerHTML=(slow.queries||[]).map(e=>{
    const c=e.content;
    const pct=Math.round((c.duration||0)/maxQDur*60);
    return\`<tr onclick="selEntry('\${e.id}')">
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="\${c.sql||''}">\${(c.sql||'').slice(0,50)}</td>
      <td><div class="dur-pill"><div class="bar" style="width:\${pct}px;background:var(--yellow)"></div>\${c.duration||0}ms</div></td>
      <td>\${c.rows!=null?c.rows:'-'}</td>
    </tr>\`;
  }).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:12px">No data</td></tr>';
}

/* ── Entry list ───────────────────────────────────────────────────── */
function timeAgo(d){
  const s=Math.floor((Date.now()-new Date(d))/1000);
  return s<60?s+'s':s<3600?Math.floor(s/60)+'m':Math.floor(s/3600)+'h';
}
function etitle(e){const c=e.content;switch(e.type){
  case'request':return(c.method||'')+' '+(c.uri||c.path||'');
  case'exception':return c.class||c.message||'Exception';
  case'job':return c.name||c.displayName||'Job';
  case'schedule':return c.task||c.name||'Task';
  case'query':return(c.sql||'Query').slice(0,70);
  case'log':return'['+((c.level||'info').toUpperCase())+'] '+(c.message||'');
  case'cache':return(c.type?c.type.toUpperCase()+' ':'')+c.key;
  default:return JSON.stringify(e.content).slice(0,60);
}}
function emeta(e){const c=e.content,p=[];switch(e.type){
  case'request':if(c.status)p.push(c.status);if(c.duration!=null)p.push(c.duration+'ms');break;
  case'job':if(c.queue)p.push(c.queue);if(c.status)p.push(c.status);break;
  case'schedule':if(c.expression)p.push(c.expression);if(c.status)p.push(c.status);break;
  case'query':if(c.duration!=null)p.push(c.duration+'ms');if(c.rows!=null)p.push(c.rows+' rows');break;
  case'log':p.push(c.level||'info');break;
}}

function renderList(){
  const q=document.getElementById('search').value.toLowerCase();
  const filtered=entries.filter(e=>!q||etitle(e).toLowerCase().includes(q)||JSON.stringify(e.content).toLowerCase().includes(q));
  const body=document.getElementById('list-body');
  if(!filtered.length){body.innerHTML='<div class="dp-empty">No entries</div>';return;}
  body.innerHTML=filtered.map(e=>{
    const meta=emeta(e);
    return'<div class="entry'+(e.id===selId?' sel':'')+'" onclick="selEntry(\\''+e.id+'\\')">' +
      '<div class="ico '+e.type+'">'+(ICONS[e.type]||'?')+'</div>'+
      '<div class="info"><div class="ttl" title="'+etitle(e)+'">'+etitle(e)+'</div>'+
      (meta?'<div class="meta">'+meta+'</div>':'')+
      '</div><div class="age">'+timeAgo(e.createdAt)+'</div></div>';
  }).join('');
}

async function selEntry(id){
  if(chartsActive){exitCharts();document.getElementById('detail-panel').innerHTML='<div class="dp-empty">Select an entry to inspect</div>';}
  selId=id;renderList();
  const e=await fetch(API_BASE+'/api/entries/'+id,{headers:HDR}).then(r=>r.json());
  renderDetail(e);
}

function row(k,v){return'<tr><td>'+k+'</td><td>'+v+'</td></tr>';}
function section(title,rows){return'<div class="ds"><h3>'+title+'</h3><table class="dt">'+rows+'</table></div>';}
function pre(v){return'<pre>'+JSON.stringify(v,null,2)+'</pre>';}
function sbadge(s){const cls=s>=500?'b5xx':s>=400?'b4xx':'b200';return'<span class="badge '+cls+'">'+s+'</span>';}
function mbadge(m){return'<span class="badge m-'+(m||'').toLowerCase()+'">'+(m||'')+'</span>';}

function renderDetail(e){
  const c=e.content;
  let body='';
  switch(e.type){
    case'request':
      body+=section('Request',row('Method',mbadge(c.method))+row('URI',c.uri||'-')+row('Status',c.status?sbadge(c.status):'-')+row('Duration',c.duration!=null?c.duration+'ms':'-')+row('IP',c.ip||'-')+row('User',c.userId?'#'+c.userId:'Guest'));
      if(c.requestHeaders)body+='<div class="ds"><h3>Request Headers</h3>'+pre(c.requestHeaders)+'</div>';
      if(c.requestBody&&Object.keys(c.requestBody).length)body+='<div class="ds"><h3>Request Body</h3>'+pre(c.requestBody)+'</div>';
      if(c.requestQuery&&Object.keys(c.requestQuery).length)body+='<div class="ds"><h3>Query Params</h3>'+pre(c.requestQuery)+'</div>';
      if(c.responseBody!=null)body+='<div class="ds"><h3>Response</h3>'+pre(c.responseBody)+'</div>';
      break;
    case'exception':
      body+=section('Exception',row('Class',c.class||'Error')+row('Message',c.message||'-')+row('File',c.file||'-')+row('Status',c.status||'-'));
      if(c.stack)body+='<div class="ds"><h3>Stack Trace</h3><pre>'+c.stack+'</pre></div>';
      if(c.request)body+=section('Request',row('Method',mbadge(c.request.method))+row('URI',c.request.uri||'-'));
      break;
    case'job':
      body+=section('Job',row('Name',c.name||c.displayName||'-')+row('Queue',c.queue||'-')+row('Connection',c.connection||'-')+row('Status',c.status||'-')+row('Duration',c.durationMs!=null?c.durationMs+'ms':'-')+row('Attempts',c.attempts??'-')+row('UUID',c.uuid||'-')+(c.exception?row('Exception',c.exception):''));
      break;
    case'schedule':
      body+=section('Scheduled Task',row('Task',c.task||c.name||'-')+row('Expression','<code>'+c.expression+'</code>')+row('Status',c.status||'-')+row('Duration',c.durationMs!=null?c.durationMs+'ms':'-')+(c.exception?row('Exception',c.exception):''));
      break;
    case'query':
      body+=section('Query',row('Duration',c.duration!=null?c.duration+'ms':'-')+row('Connection',c.connection||'default')+row('Collection',c.collection||'-')+row('Rows',c.rows!=null?c.rows:'-')+(c.error?row('Error',c.error):''));
      if(c.sql)body+='<div class="ds"><h3>SQL / Operation</h3><pre>'+c.sql+'</pre></div>';
      if(c.bindings&&c.bindings.length)body+='<div class="ds"><h3>Bindings</h3>'+pre(c.bindings)+'</div>';
      break;
    case'log':
      body+=section('Log',row('Level',(c.level||'info').toUpperCase())+row('Message',c.message||'-'));
      if(c.context&&Object.keys(c.context).length)body+='<div class="ds"><h3>Context</h3>'+pre(c.context)+'</div>';
      break;
    case'cache':
      body+=section('Cache',row('Type',c.type||'-')+row('Key',c.key||'-')+(c.ttl!=null?row('TTL',c.ttl+'s'):'')+((c.hit!=null)?row('Hit',c.hit?'Yes':'No'):''));
      if(c.value!=null)body+='<div class="ds"><h3>Value</h3>'+pre(c.value)+'</div>';
      break;
    default:
      body+='<div class="ds">'+pre(c)+'</div>';
  }
  document.getElementById('detail-panel').innerHTML=
    '<div class="dp-hdr"><div class="dp-ttl">'+etitle(e)+'</div>'+
    '<div class="dp-sub">'+new Date(e.createdAt).toLocaleString()+' · entry #'+e.sequence+'</div></div>'+
    '<div class="dp-body">'+body+'</div>';
}

let _busy=false,_timer;
async function refresh(){
  clearTimeout(_timer);
  if(_busy){_timer=setTimeout(refresh,5000);return;}
  _busy=true;
  try{
    if(chartsActive){await loadCharts();return;}
    const url=API_BASE+'/api/entries'+(curType?'?type='+curType:'');
    entries=await fetch(url,{headers:HDR}).then(r=>r.json());
    renderList();
    const stats=await fetch(API_BASE+'/api/stats',{headers:HDR}).then(r=>r.json());
    let total=0;
    for(const[t,n]of Object.entries(stats)){const el=document.getElementById('c-'+t);if(el)el.textContent=n;total+=n;}
    document.getElementById('c-all').textContent=total;
  }catch(e){console.warn('Telescope refresh error',e);}
  finally{_busy=false;_timer=setTimeout(refresh,5000);}
}

async function clearAll(){
  if(!confirm('Clear all Telescope entries?'))return;
  await fetch(API_BASE+'/api/entries',{method:'DELETE',headers:HDR});
  entries=[];selId=null;
  renderList();
  document.getElementById('detail-panel').innerHTML='<div class="dp-empty">↑ Select an entry to inspect</div>';
}

refresh();
</script>
</body>
</html>`;
}
