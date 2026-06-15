// cmux-style GUI: a left sidebar of agent workspaces (status/notification rings)
// and a main pane with the selected agent's live terminal (an embedded ttyd
// iframe) plus a toolbar (broadcast / merge / PR / kill). Live over SSE.
// Inlined so there is no asset-copy build step. `"__AMUX_TOKEN__"` is replaced
// server-side with the auth token (or "").
export const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>amux</title>
<style>
  :root{--bg:#0d1117;--panel:#0d1117;--card:#161b22;--bd:#30363d;--fg:#e6edf3;--mut:#8b949e;
        --grn:#3fb950;--ylw:#d29922;--cyn:#39c5cf;--red:#f85149;--gry:#6e7681;--sel:#1f2937}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{background:var(--bg);color:var(--fg);font:14px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
       display:flex;height:100vh;overflow:hidden}
  button{background:#21262d;color:var(--fg);border:1px solid var(--bd);border-radius:6px;
         padding:5px 10px;cursor:pointer;font:inherit;font-size:12px}
  button:hover{border-color:var(--mut)}
  input,select{background:#010409;color:var(--fg);border:1px solid var(--bd);border-radius:6px;
       padding:6px 8px;font:inherit;font-size:13px}

  /* sidebar */
  .side{width:264px;min-width:264px;background:#0b0e13;border-right:1px solid var(--bd);
        display:flex;flex-direction:column}
  .brand{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--bd);
         font-weight:700;font-size:16px}
  .brand .dot{width:8px;height:8px;border-radius:50%;background:var(--gry)}
  .brand .dot.live{background:var(--grn);box-shadow:0 0 8px var(--grn)}
  .side .new{margin:12px}
  .list{flex:1;overflow:auto;padding:0 8px}
  .ws{display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;margin-bottom:4px}
  .ws:hover{background:#11161d}
  .ws.sel{background:var(--sel);outline:1px solid var(--bd)}
  .ring{width:10px;height:10px;border-radius:50%;flex:none;background:var(--gry)}
  .ring.running{background:var(--grn)}
  .ring.waiting{background:var(--ylw);box-shadow:0 0 0 0 rgba(210,153,34,.7);animation:pulse 1.4s infinite}
  .ring.done{background:var(--cyn)}
  .ring.error{background:var(--red)}
  .ring.dead{background:var(--gry)}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(210,153,34,.6)}70%{box-shadow:0 0 0 7px rgba(210,153,34,0)}100%{box-shadow:0 0 0 0 rgba(210,153,34,0)}}
  .ws .meta{min-width:0;flex:1}
  .ws .nm{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ws .sub{color:var(--mut);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ws .warn{color:var(--red)}
  .conf{border-top:1px solid var(--bd);padding:10px 14px;font-size:12px;color:var(--red);max-height:30%;overflow:auto}
  .conf .f{color:var(--mut);font-size:11px}

  /* main */
  .main{flex:1;display:flex;flex-direction:column;min-width:0}
  .top{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--bd)}
  .top .cur{font-weight:700}
  .top .cur small{color:var(--mut);font-weight:400;margin-left:8px}
  .top .sp{flex:1}
  .top input{width:200px}
  .stage{flex:1;position:relative;background:#010409}
  iframe{border:0;width:100%;height:100%;display:none;background:#010409}
  .empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
         color:var(--mut);flex-direction:column;gap:8px}

  /* modal */
  .modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center}
  .modal.open{display:flex}
  .sheet{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:20px;width:340px;
         display:flex;flex-direction:column;gap:10px}
  .sheet h3{margin:0 0 4px}
  .ferr{color:var(--red);font-size:12px;min-height:14px}
</style>
</head>
<body>
<aside class="side">
  <div class="brand"><span class="dot" id="live"></span> amux <span id="count" style="color:var(--mut);font-weight:400;font-size:12px"></span></div>
  <button class="new" id="newbtn">+ new agent</button>
  <div class="list" id="list"></div>
  <div class="conf" id="conf" style="display:none"><b>⚠ conflicts</b><div id="conflist"></div></div>
</aside>
<section class="main">
  <div class="top">
    <span class="cur" id="cur">no agent selected</span>
    <span class="sp"></span>
    <input id="bcast" placeholder="broadcast to agent…" />
    <button id="bcastbtn">send</button>
    <button id="mergebtn">merge</button>
    <button id="prbtn">PR</button>
    <button id="killbtn">kill</button>
  </div>
  <div class="stage">
    <iframe id="term" title="terminal"></iframe>
    <div class="empty" id="empty">▦<br/>select or create an agent</div>
  </div>
</section>

<div class="modal" id="modal">
  <form class="sheet" id="newform">
    <h3>new agent</h3>
    <input id="f_name" placeholder="name" autocomplete="off" required />
    <select id="f_agent"></select>
    <input id="f_repo" placeholder="repo path" value="." />
    <div class="ferr" id="f_err"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button type="button" id="cancel">cancel</button>
      <button type="submit">create</button>
    </div>
  </form>
</div>

<script>
const TOKEN="__AMUX_TOKEN__";
const AUTH=TOKEN?{'x-amux-token':TOKEN}:{};
const Q=TOKEN?('?token='+encodeURIComponent(TOKEN)):'';
if(TOKEN&&location.search){history.replaceState(null,'',location.pathname);}
function api(p,o){o=o||{};o.headers=Object.assign({},o.headers||{},AUTH);return fetch(p,o);}
function postJSON(p,b){return api(p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});}
function esc(s){return (s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
const $=id=>document.getElementById(id);

let agents=[],selected=null,conflicted=new Set();

function renderList(){
  $('count').textContent=agents.length?('· '+agents.length):'';
  $('list').innerHTML=agents.map(a=>\`
    <div class="ws \${a.name===selected?'sel':''}" onclick="select('\${esc(a.name)}')">
      <span class="ring \${a.status}"></span>
      <span class="meta">
        <div class="nm">\${esc(a.name)} \${conflicted.has(a.name)?'<span class="warn">⚠</span>':''}</div>
        <div class="sub">\${esc(a.status)} · \${esc(a.branch)}\${a.note?' · '+esc(a.note):''}</div>
      </span>
    </div>\`).join('')|| '<div style="color:var(--mut);padding:14px">no agents yet</div>';
}

async function select(name){
  selected=name;
  const a=agents.find(x=>x.name===name);
  $('cur').innerHTML=esc(name)+(a?\` <small>\${esc(a.branch)} · \${esc(a.status)}</small>\`:'');
  renderList();
  const term=$('term'),empty=$('empty');
  try{
    const r=await api('/api/term/'+encodeURIComponent(name));
    const j=await r.json();
    if(!r.ok)throw new Error(j.error||'failed');
    term.src='http://'+location.hostname+':'+j.port;
    term.style.display='block';empty.style.display='none';
  }catch(e){
    term.style.display='none';empty.style.display='flex';
    empty.innerHTML='▦<br/>'+esc(e.message);
  }
}

async function loadConflicts(){
  const cs=await (await api('/api/conflicts')).json();
  conflicted=new Set(cs.flatMap(c=>c.agents));
  $('conf').style.display=cs.length?'block':'none';
  $('conflist').innerHTML=cs.map(c=>\`<div style="margin-top:6px">\${esc(c.file)}<div class="f">← \${c.agents.map(esc).join(', ')}</div></div>\`).join('');
  renderList();
}

// toolbar actions
$('bcastbtn').onclick=async()=>{if(!selected)return;const t=$('bcast').value.trim();if(!t)return;await postJSON('/api/broadcast',{names:[selected],text:t});$('bcast').value='';};
$('mergebtn').onclick=async()=>{if(!selected)return;const r=await postJSON('/api/merge',{name:selected});const j=await r.json();alert(j.merged?('merged into '+j.into):('conflicts: '+(j.conflicts||[]).join(', ')||j.error));};
$('prbtn').onclick=async()=>{if(!selected)return;const r=await postJSON('/api/pr',{name:selected});const j=await r.json();alert(j.url||j.error||'done');};
$('killbtn').onclick=async()=>{if(!selected)return;if(!confirm('kill '+selected+'?'))return;await postJSON('/api/kill',{name:selected,rmWorktree:false});selected=null;$('term').style.display='none';$('empty').style.display='flex';$('cur').textContent='no agent selected';};

// new-agent modal
$('newbtn').onclick=()=>{$('modal').classList.add('open');$('f_name').focus();};
$('cancel').onclick=()=>$('modal').classList.remove('open');
$('newform').onsubmit=async ev=>{
  ev.preventDefault();$('f_err').textContent='';
  const body={name:$('f_name').value.trim(),agent:$('f_agent').value,repo:$('f_repo').value.trim()||'.'};
  const r=await postJSON('/api/new',body);const j=await r.json();
  if(r.ok){$('modal').classList.remove('open');$('f_name').value='';setTimeout(()=>select(body.name),400);}
  else $('f_err').textContent=j.error||'failed';
};

async function boot(){
  const keys=await (await api('/api/agent-keys')).json();
  $('f_agent').innerHTML=keys.map(k=>\`<option>\${esc(k)}</option>\`).join('');
  agents=await (await api('/api/agents')).json();
  renderList();await loadConflicts();
  const ev=new EventSource('/api/events'+Q);
  ev.onopen=()=>$('live').classList.add('live');
  ev.onerror=()=>$('live').classList.remove('live');
  ev.addEventListener('snapshot',e=>{
    agents=JSON.parse(e.data);
    if(selected&&!agents.find(a=>a.name===selected)){selected=null;$('term').style.display='none';$('empty').style.display='flex';}
    loadConflicts();
  });
}
boot();
</script>
</body>
</html>`;
