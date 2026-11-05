/*! STARBOUND ENVOY v3.3.0 — © 2026 Rainwater Games (Jeff Rainwater). All rights reserved. */
'use strict';
(function(){
const VERSION='0.2';
const $=id=>document.getElementById(id);
const RES={};SB_RES.forEach(r=>RES[r.id]=r);
const RACE={};SB_RACES.forEach(r=>RACE[r.id]=r);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
function shuffle(r,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

let G=null; // game state (saved)
let V={view:'helm',sel:null,dlg:null,logSel:null,warpT:0,toasts:[]}; // transient UI
const SB=window.__SB={state:'title',get G(){return G;},V};
const params=new URLSearchParams(location.search);

/* ---------------- world generation ---------------- */
function showIntro(){const d=document.createElement('div');d.id='intro';
  d.innerHTML='<canvas id="introSky"></canvas><div class="itx"><div class="ihd">STARBOUND ENVOY</div><div class="small">TERRAN CONCORD · v3.3.0</div><p>You are an envoy of the Terran Concord, sent from Earth past the last charted star.</p><p>Find the living worlds no one has met. Learn their secrets.</p><p>Bind the galaxy together, one trade route at a time.</p><button class="btn pri" id="introGo">Begin</button><div class="small">tap anywhere to skip</div></div>';
  document.body.appendChild(d);const c=d.querySelector('canvas'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  const st=[...Array(160)].map(()=>({x:Math.random()*c.width,y:Math.random()*c.height,z:Math.random()*2+.3}));let on=true;
  (function fr(){if(!on)return;x.fillStyle='rgba(3,6,18,.45)';x.fillRect(0,0,c.width,c.height);st.forEach(p=>{p.y+=p.z*.6;if(p.y>c.height){p.y=0;p.x=Math.random()*c.width;}x.fillStyle='rgba(200,225,255,'+(.3+p.z/3)+')';x.fillRect(p.x,p.y,p.z,p.z);});requestAnimationFrame(fr);})();
  const end=()=>{d.classList.add('out');setTimeout(()=>{on=false;d.remove();introToast();},700);};d.addEventListener('click',end,{once:true});}
SB.showIntro=()=>showIntro();
function newGame(slot,seed){
  seed=seed||((Date.now()^Math.floor(Math.random()*1e9))>>>0);
  const r=rng(seed);
  // v2.1: cohab races share a partner's homeworld; 10 empty worlds; 3 cols x 24 rows
  const solo=SB_RACES.filter(rc=>!rc.cohab||!RACE[rc.cohab]),NEMPTY=10;
  const names=shuffle(r,SB_SYSNAMES).slice(0,solo.length+NEMPTY);
  const pts=[];
  const all=[...SB_PORTS.map(n=>({name:n,port:true})),...names.map(n=>({name:n}))];
  // v3.2: fixed organic layout (same every game): clusters, voids, min spacing
  const LP=organicLayout(all.length);const order=[0,...shuffle(r,LP.map((_,i)=>i).slice(1))];
  all.forEach((s,i)=>pts.push(LP[order[i]]));
  const systems=all.map((s,i)=>({id:i,name:s.name,port:!!s.port,x:pts[i].x,y:pts[i].y,
    type:s.port?'station':pick(r,SB_PTYPES),owner:null,rich:[],scan:0,derelict:false,tex:Math.floor(r()*1e9)}));
  const worlds=shuffle(r,systems.filter(s=>!s.port&&s.id!==0).map(s=>s.id));
  const races={};
  solo.forEach((rc,i)=>{
    const sys=systems[worlds[i]];sys.owner=rc.id;
    const pool=SB_RES.map(x=>x.id).filter(x=>!rc.wants.includes(x)&&x!==rc.taboo&&x!==rc.secretWant);
    sys.rich=shuffle(r,pool).slice(0,3);
    races[rc.id]={home:sys.id,tech:clamp(rc.techBase+Math.round((r()-.5)*2),1,5),rep:0};
  });
  if(races.kth){const h=systems[races.kth.home];const far=systems.filter(x=>x.owner&&!x.port).sort((p,q)=>Math.hypot(q.x-.5,q.y-.5)-Math.hypot(p.x-.5,p.y-.5))[0];if(far&&far!==h){const o=far.owner;far.owner='kth';h.owner=o;races[o].home=h.id;races.kth.home=far.id;const t=far.rich;far.rich=h.rich;h.rich=t;}}
  SB_RACES.forEach(rc=>{if(races[rc.id])return;const hs=systems[races[rc.cohab].home];hs.co=rc.id;
    races[rc.id]={home:hs.id,tech:clamp(rc.techBase+Math.round((r()-.5)*2),1,5),rep:0};});
  systems.forEach(s=>{ if(!s.owner&&!s.port){ s.rich=shuffle(r,SB_RES.map(x=>x.id)).slice(0,2); s.derelict=r()<.6; } if(s.port) s.rich=shuffle(r,SB_RES.map(x=>x.id)).slice(0,9); });
  // relationships: baseline plus random shuffles
  const rel={};
  SB_RELATIONS.forEach(([a,b,v])=>rel[pk(a,b)]=v);
  const ids=SB_RACES.map(x=>x.id);const pairs=[];
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)pairs.push(pk(ids[i],ids[j]));
  shuffle(r,pairs).slice(0,2).forEach(p=>{rel[p]=pick(r,[-1,0,1]);});
  SB_RACES.forEach(rc=>{if(rc.nemesis&&RACE[rc.nemesis])rel[pk(rc.id,rc.nemesis)]=-1;}); // permanent wars never shuffle
  SB_RACES.forEach(rc=>{if(rc.friendAll)ids.forEach(o=>{if(o!==rc.id)rel[pk(rc.id,o)]=1;});}); // friends with everyone, always
  G={v:1,seed,slot,created:Date.now(),savedAt:0,turn:1,credits:600,fuel:100,fuelMax:100,cargoMax:60,
    cargo:{water:4,medicine:2,textile:5},loc:0,systems,races,rel,kn:{},hist:{},enc:null,visit:{id:1,topics:{},tradeRep:0},journal:[]};
  systems[0].scan=1;
  return G;
}
function pk(a,b){return a<b?a+'|'+b:b+'|'+a;}
function relOf(a,b){if((RACE[a]&&RACE[a].isolationist)||(RACE[b]&&RACE[b].isolationist))return 0;return (G.rel[pk(a,b)])||0;}
const sys=id=>G.systems[id];
const here=()=>sys(G.loc);
const homeOf=rid=>sys(G.races[rid].home);
// v2.1 shared worlds: who lives here, and who you are talking to
const residents=s=>[s.owner,s.co].filter(Boolean);
const act=s=>{const w=G.visit&&G.visit.with;return w&&residents(s).includes(w)?w:s.owner;};
function lies(rid){const rc=RACE[rid];if(!rc.liar)return false;if(rc.lieRate==null)return true;const L=G.visit.lieRoll=G.visit.lieRoll||{};if(L[rid]==null)L[rid]=Math.random()<rc.lieRate;return L[rid];}

/* ---------------- knowledge / log ---------------- */
function truth(rid,f){
  const rc=RACE[rid],st=G.races[rid];
  switch(f){
    case 'loc':return homeOf(rid).name;
    case 'tech':return st.tech;
    case 'wants':return rc.wants.slice();
    case 'rich':return homeOf(rid).rich.slice();
    case 'allies':return SB_RACES.filter(o=>o.id!==rid&&relOf(rid,o.id)===1).map(o=>o.id);
    case 'enemies':return SB_RACES.filter(o=>o.id!==rid&&relOf(rid,o.id)===-1).map(o=>o.id);
    case 'taboo':return rc.taboo;
    case 'secret':return rc.secretWant;
  }
}
function kn(rid){return G.kn[rid]||(G.kn[rid]={});}
function know(rid,f,v,rumored){
  const k=kn(rid);
  if(v===undefined)v=truth(rid,f);
  if(!k[f]||k[f].r||!rumored)k[f]={v,r:!!rumored};
  if(!k.portrait){G.rsrc=G.rsrc||{};if(!G.rsrc[rid])G.rsrc[rid]=V.src||'Subspace chatter';}
}
function meet(rid){const k=kn(rid);if(!k.name||k.name.r)know(rid,'name',true);if(!k.loc||k.loc.r)know(rid,'loc');if(!k.portrait){k.portrait={v:true};milestones();}}
/* v3 compendium milestones */
const MILES=[[10,150,'Xenologist'],[25,400,'Pathfinder'],[50,800,'Star Cartographer'],[88,1500,'Envoy of All Worlds']];
function foundCount(){return SB_RACES.filter(r=>G.kn[r.id]&&G.kn[r.id].portrait).length;}
function milestones(){G.miles=G.miles||{};const n=foundCount();MILES.forEach(([m,cr,t])=>{if(n>=m&&!G.miles[m]){G.miles[m]=G.turn;G.credits+=cr;toast('Compendium milestone: '+m+' species found! Title "'+t+'" and ¢'+cr+'.','g');}});}
/* v3 hull, upgrades, fees */
const UPG={cargo:{n:'Cargo pods (+20 hold)',c:400},scanner:{n:'Deep scanner (cheaper scans, more clues)',c:300},engines:{n:'Ion engines (−25% fuel)',c:500},shields:{n:'Shield array (half damage)',c:450},resist:{n:'Charm dampener (see through beguiling offers)',c:250}};
const REPAIR_PER=3,DOCK_FEE=8,SCAN_CR=20;
function damage(n,why){G.hull=G.hull==null?100:G.hull;if(G.up&&G.up.shields)n=Math.ceil(n/2);G.hull=Math.max(0,G.hull-n);G.ls=Math.max(0,(G.ls==null?100:G.ls)-Math.ceil(n*.6));(G.dmg=G.dmg||[]).push('T'+G.turn+': −'+n+'% '+why);if(G.dmg.length>6)G.dmg.shift();let t='Minor scrape: hull −'+n+'% ('+why+'). Repair at any port when convenient.';
  if(G.hull<=15){friendlyTow('hull worn thin');return n;}
  toast(t);return n;}
const TOW_FEE=15;
function nearestPort(){return G.systems.filter(x=>x.port).sort((p,q)=>dist(G.loc,p.id)-dist(G.loc,q.id))[0];}
function friendlyTow(why){st().tow=1;const p=nearestPort(),fee=Math.min(G.credits,TOW_FEE);G.credits-=fee;G.hull=Math.max(G.hull,40);G.ls=Math.max(G.ls==null?100:G.ls,60);if(G.fuel<20)G.fuel=20;G.loc=p.id;V.sel=null;
  toast('A friendly tug crew tows you to '+p.name+' ('+why+'). They patch you up for '+(fee?'¢'+fee:'free')+'. No harm done.','g');}
function canRepair(s){return s.port||(s.owner&&G.races[act(s)]&&G.races[act(s)].rep>=15&&kn(act(s)).portrait);}
function repairCost(){return Math.min(G.credits,(100-(G.hull==null?100:G.hull))*REPAIR_PER);}
function repair(){const s=here();if(!canRepair(s))return;const c=repairCost(),pts=Math.floor(c/REPAIR_PER);if(!pts)return;G.credits-=pts*REPAIR_PER;G.hull=Math.min(100,G.hull+pts);if(G.hull>=100){G.ls=100;G.dmg=[];}else G.ls=Math.min(100,(G.ls==null?100:G.ls)+pts);toast('Repaired '+pts+'% for ¢'+pts*REPAIR_PER+'.','g');commit();}
function upCost(k){return G.forgeDeal?Math.round(UPG[k].c*.7):UPG[k].c;}
function buyUpg(k){const s=here(),u=UPG[k];G.up=G.up||{};if(!s.port||G.up[k]||G.credits<upCost(k))return;G.credits-=upCost(k);G.forgeDeal=0;G.up[k]=G.turn;if(k==='cargo')G.cargoMax+=20;toast('Installed: '+u.n+'.','g');commit();}
function yardHtml(){const s=here();G.hull=G.hull==null?100:G.hull;let h='';if(!canRepair(s)&&!s.port)return'<p class="small">Hull '+G.hull+'%. Repairs at ports or friendly worlds.</p>';
  h+='<h2>SHIPYARD</h2><p class="small">Hull integrity '+G.hull+'% · repairs ¢'+REPAIR_PER+' per %</p>';
  h+='<button class="btn" data-a="repair" '+(G.hull>=100||!repairCost()?'disabled':'')+'>🔧 Repair hull'+(G.hull>=100?' · pristine':' · ¢'+repairCost())+'</button>';
  if(s.port){G.up=G.up||{};Object.keys(UPG).forEach(k=>{const u=UPG[k],own=G.up[k];h+='<button class="btn" data-a="upg" data-v="'+k+'" '+(own||G.credits<upCost(k)?'disabled':'')+'>'+(own?'✓ ':'')+esc(u.n)+(own?' · installed':' · ¢'+upCost(k))+'</button>';});}
  return h;}
function lifeTick(){G.ls=G.ls==null?100:G.ls;G.morale=G.morale==null?80:G.morale;
  if(G.ls<50){G.morale=Math.max(40,G.morale-2);toast('Life support is a bit stuffy ('+G.ls+'%). The crew would love a repair stop.');}
  else G.morale=Math.min(100,G.morale+3);
  if(G.ls<25)V.towPending='life support running low';}
function moraleMult(){return 1;}
function jumpRange(){return (G.fuel/(42*(G.up&&G.up.engines?.75:1))*10).toFixed(1);}
function bar(v,col){return'<span class="gbar"><i style="width:'+Math.max(0,Math.min(100,v))+'%;background:'+(v<50?'#e8c37a':(col||'#5fe3a1'))+'"></i></span>';}
function addLead(rid,text){const L=G.leads=G.leads||[];const t=String(text).replace(/^"|"$/g,'');if(L.some(l=>l.rid===rid&&l.text===t))return;L.push({rid,text:t,turn:G.turn});if(L.length>30)L.shift();}
function missions(){const out=[];const loc=r=>RACE[r]&&kn(r).loc&&!kn(r).loc.r?homeOf(r):null;
  if(typeof SB_QUESTS!=='undefined')SB_QUESTS.forEach(c=>{const q=(G.q||{})[c.id];if(!q)return;const st=c.steps[Math.min(q.step,c.steps.length-1)];
    out.push({key:'q'+c.id,grp:q.done?'done':'active',from:c.steps[0].r,title:c.name,goal:c.steps[0].goal,next:q.done?'Complete. Reward collected.':c.steps[q.step-1].goal,at:q.done?null:loc(st.r),status:q.done?'Completed':'Step '+q.step+'/'+c.steps.length});});
  favs().forEach((f,i)=>{const done=f.state==='done',open=f.state==='open';out.push({key:'f'+i,grp:open?'active':done?'done':'failed',from:f.from,title:'Favor: '+FAV_KIND[f.kind].item,goal:'Carry '+FAV_KIND[f.kind].item+' to the '+RACE[f.to].short+'.',next:open?'Deliver at '+sys(G.races[f.to].home).name:'',at:open?sys(G.races[f.to].home):null,status:open?'Open · '+favorRewardText(f):done?'Delivered':'Failed'});});
  (G.leads||[]).forEach((l,i)=>out.push({key:'l'+i,grp:'lead',from:l.rid,title:'The '+RACE[l.rid].short+' mentioned a need',goal:l.text,next:'Bring what they want to their market.',at:loc(l.rid),status:'Lead · T'+l.turn}));
  Object.keys(G.rsrc||{}).forEach(r=>{if(kn(r).portrait)return;const k=kn(r);out.push({key:'r'+r,grp:'lead',from:null,title:'Find: '+(k.name?raceName(r):'unnamed signal'),goal:'Rumored species. Source: '+G.rsrc[r]+'.',next:k.loc?'Investigate '+k.loc.v+(k.loc.r?' (unconfirmed)':''):'Location unknown. Deep scans may find coordinates.',at:k.loc?G.systems.find(x=>x.name===k.loc.v):null,status:'Rumored'});});
  return out;}
function missionBadgeCount(){const M=G.mseen||{};return missions().filter(m=>M[m.key]!==m.status+m.next).length;}
const missionView=()=>{const all=missions(),M=G.mseen=G.mseen||{};let h='<h2>MISSION LOG</h2>'+(V.logFrom?'<button class="btn pri" data-a="logret">‹ Back to conversation</button>':'');
  [['active','ACTIVE'],['lead','LEADS & HINTS'],['done','COMPLETED'],['failed','FAILED']].forEach(([g,lab])=>{const L=all.filter(m=>m.grp===g);if(!L.length&&g==='failed')return;
    h+='<div class="cxh">'+lab+' · '+L.length+'</div>';if(!L.length){h+='<p class="small">'+(g==='active'?'No active missions. Friendly species may ask for help when hailed.':'Nothing yet.')+'</p>';return;}
    h+='<ul class="ml">'+L.map(m=>{const sig=m.status+m.next,bd=M[m.key]==null?'<span class="nb">NEW</span>':M[m.key]!==sig?'<span class="nb up">UPDATED</span>':'';
      const pr=m.from&&kn(m.from).portrait?'<img src="'+RACE[m.from].img+'" alt="">':'<span class="pt sil">?</span>';
      return'<li class="mi '+g+'">'+pr+'<div><b>'+esc(m.title)+'</b>'+bd+'<br><span class="small">'+(m.from&&kn(m.from).portrait?'From the '+esc(RACE[m.from].short)+' · ':'')+esc(m.status)+'</span><br>'+esc(m.goal)+(m.next?'<br><span class="nx">▸ '+esc(m.next)+'</span>':'')+(m.at?'<br><button class="cx mapgo" data-a="mapgo" data-v="'+m.at.id+'">◎ '+esc(m.at.name)+'</button>':'')+'</div></li>';}).join('')+'</ul>';});
  V.markSeen=all.map(m=>[m.key,m.status+m.next]);return h;};
const statusView=()=>{const s=here();G.hull=G.hull==null?100:G.hull;G.ls=G.ls==null?100:G.ls;G.morale=G.morale==null?80:G.morale;G.up=G.up||{};
  let h='<h2>ENGINEERING · SHIP STATUS</h2>'+(V.logFrom?'<button class="btn pri" data-a="logret">‹ Back to conversation</button>':'');
  const sh=G.up.shields?100:50,ls=G.ls;
  h+='<div class="con"><div class="cr"><b>HULL</b>'+bar(G.hull)+'<span>'+G.hull+'%</span></div>'+((G.dmg||[]).length?'<div class="cn">'+(G.hull<50?'Hull below 50%: jumps use 15% more fuel until repaired.<br>':'')+G.dmg.map(esc).join('<br>')+'</div>':'<div class="cn">No outstanding damage.</div>')+
   '<div class="cr"><b>SHIELDS</b>'+bar(sh,'#7fd0ff')+'<span>'+sh+'%</span></div><div class="cn">'+(G.up.shields?'Shield array: incoming damage halved.':'Stock emitters. A shield array halves damage.')+'</div>'+
   '<div class="cr"><b>FUEL</b>'+bar(G.fuel*100/G.fuelMax,'#ffd36b')+'<span>'+Math.round(G.fuel)+'/'+G.fuelMax+'</span></div><div class="cn">Est. jump range ≈ '+jumpRange()+' ly'+(G.up.engines?' (ion engines)':'')+'</div>'+
   '<div class="cr"><b>LIFE SUPPORT</b>'+bar(ls)+'<span>'+ls+'%</span></div><div class="cn">'+(ls>=75?'Nominal.':ls>=50?'A little stuffy from hull wear. Repairs freshen it up.':'Running low. If it dips further a friendly tug will tow you to port (¢'+TOW_FEE+').')+'</div>'+
   '<div class="cr"><b>CREW MORALE</b>'+bar(G.morale,'#c59bff')+'<span>'+G.morale+'%</span></div><div class="cn">'+(G.morale<60?'Terran Concord crew of 12: a bit weary, a port stop will cheer them up.':'Terran Concord crew of 12, in good spirits.')+'</div>'+
   '<div class="cr"><b>CREDITS</b><span class="cv">¢'+G.credits+'</span></div></div>';
  h+='<div class="cxh">CARGO HOLD · '+cargoUsed()+'/'+G.cargoMax+'</div>'+bar(cargoUsed()*100/G.cargoMax,'#7fd0ff');
  const ids=Object.keys(G.cargo).filter(k=>G.cargo[k]>0);
  h+=ids.length?'<table class="ct"><tr><th>Item</th><th>Qty</th><th>Avg paid</th></tr>'+ids.map(k=>{const P=G.paid&&G.paid[k];return'<tr class="mlink" data-a="mkt" data-v="'+k+'"><td>'+esc(RES[k].name)+'<br>'+thTag(k)+'</td><td>'+G.cargo[k]+'</td><td>'+(P&&P.q?'¢'+Math.round(P.c/P.q):'—')+'</td></tr>';}).join('')+'</table>':'<p class="small">Hold empty.</p>';
  h+='<div class="cxh">UPGRADES</div><p class="small">'+Object.keys(UPG).map(k=>(G.up[k]?'✓ ':'· ')+esc(UPG[k].n)+(G.up[k]?'':' (not installed)')).join('<br>')+'</p>';
  if(s.port||canRepair(s)){h+='<div class="cxh">DOCKED SERVICES</div>'+refuelBtn()+'<button class="btn" data-a="repair" '+(G.hull>=100||!repairCost()?'disabled':'')+'>🔧 Repair hull'+(G.hull>=100?' · pristine':' · ¢'+repairCost())+'</button>';}
  return h;};
function bribeCost(rid){return 40+Math.max(0,-Math.round(G.races[rid].rep))*2;}
/* v3 quests */
function qState(){return G.q=G.q||{};}
function qStart(rid){if(typeof SB_QUESTS==='undefined')return;const Q=qState();const t=tier(rid);if(t==='hostile'||t==='wary')return;
  const c=SB_QUESTS.find(c=>!c.manual&&!Q[c.id]&&c.steps[0].r===rid&&c.steps.every(x=>RACE[x.r]));if(!c)return;
  Q[c.id]={step:1,start:G.turn};V.dlg.lines.push({who:RACE[rid].speaker,text:c.steps[0].say});V.dlg.lines.push({who:'',text:'New quest: '+c.name+'. '+c.steps[0].goal+'.'});hist(rid,'Asked you: '+c.name+'.');}
function qEvent(type,rid,g){if(typeof SB_QUESTS==='undefined')return[];const Q=qState(),out=[];
  SB_QUESTS.forEach(c=>{const q=Q[c.id];if(!q||q.done)return;const st=c.steps[q.step];if(!st||st.t!==type||st.r!==rid||(st.g&&st.g!==g))return;
    out.push(st.say);q.step++;if(q.step>=c.steps.length){q.done=G.turn;const R=c.reward;G.credits+=R.cr||0;Object.entries(R.rep||{}).forEach(([r,n])=>{if(RACE[r])addRep(r,n,'quest: '+c.name);});
      for(let i=0;i<(R.intel||0);i++){const t=SB_RACES.find(x=>!kn(x.id).loc);if(t){V.src=RACE[c.steps[0].r].short+' (quest reward)';know(t.id,'loc');}}
      out.push('Quest complete: '+c.name+'. +¢'+(R.cr||0)+(R.intel?' and star-chart intel':'')+'.');toast('Quest complete: '+c.name,'g');}
    else out.push('Quest updated: '+c.steps[q.step-1].goal+'.');});
  return out;}
function questsHtml(){if(typeof SB_QUESTS==='undefined')return'';const Q=qState();const act0=SB_QUESTS.filter(c=>Q[c.id]);
  let h='<div class="cxh">QUESTS · '+act0.filter(c=>Q[c.id].done).length+'/'+SB_QUESTS.length+' complete</div>';
  if(!act0.length)return h+'<p class="small">No quests yet. Friendly species sometimes ask for help when hailed.</p>';
  act0.forEach(c=>{const q=Q[c.id];h+='<p class="small"><b>'+(q.done?'✓ ':'▸ ')+esc(c.name)+'</b> · step '+Math.min(q.step,c.steps.length)+'/'+c.steps.length+'<br>'+(q.done?'Complete.':esc(c.steps[q.step-1].goal))+'</p>';});return h;}
function hist(rid,text){(G.hist[rid]=G.hist[rid]||[]).push('T'+G.turn+': '+text);}
function rumor(fromRid){
  const others=SB_RACES.filter(x=>x.id!==fromRid);
  const rid=pick(Math.random,others).id;V.src=fromRid&&RACE[fromRid]?'The '+RACE[fromRid].short:'Port gossip';
  const f=pick(Math.random,['loc','wants','allies','enemies','tech','rich']);
  const honest=Math.random()<.7;
  let v=truth(rid,f);
  if(!honest){
    if(f==='loc')v=pick(Math.random,G.systems.filter(s=>!s.port&&s.name!==v)).name;
    else if(f==='tech')v=clamp(v+(Math.random()<.5?-2:2),1,5);
    else if(f==='allies'||f==='enemies')v=[pick(Math.random,SB_RACES.filter(x=>x.id!==rid)).id];
    else v=shuffle(Math.random,SB_RES.map(x=>x.id)).slice(0,3);
  }
  const k=kn(rid);
  if(k[f]&&!k[f].r) return 'Nothing new about the '+RACE[rid].short+' — you already have that confirmed.';
  if(!k.name)k.name={v:true,r:true};
  know(rid,f,v,true);
  return 'Rumor: '+RACE[rid].short+' '+describe(rid,f,v)+'. (Logged as rumored)';
}
function describe(rid,f,v){
  switch(f){
    case 'loc':return 'homeworld lies at '+v;
    case 'tech':return 'technology is '+TECH_NAMES[v];
    case 'wants':return 'pay well for '+v.map(x=>RES[x].name).join(', ');
    case 'rich':return 'world is rich in '+v.map(x=>RES[x].name).join(', ');
    case 'allies':return v.length?'are allied with '+v.map(x=>RACE[x].short).join(', '):'have no allies';
    case 'enemies':return v.length?'are at war with '+v.map(x=>RACE[x].short).join(', '):'are at war with no one';
  }
  return '';
}
function verifyHome(rid){ // visiting / scanning a homeworld confirms everything observable
  know(rid,'loc');
}

/* ---------------- reputation & politics ---------------- */
function repLabel(v){return v<=-50?'Hostile':v<=-15?'Wary':v<15?'Neutral':v<40?'Cordial':v<70?'Friendly':'Allied';}
function trx(t){t=String(t);if(t.indexOf('⟪')<0)return t;return (G.up&&G.up.scanner)||G.translate?t.replace(/⟪(.*?)⟫/g,' [Translated: $1]'):t.replace(/⟪.*?⟫/g,'')+(/⟪/.test(t)?' (A scanner upgrade could translate more.)':'');}
function addRep(rid,d,why,quiet){if(RACE[rid]&&RACE[rid].moody&&d)d=Math.round(d*(.6+Math.random()*.8))||Math.sign(d);
  if(!RACE[rid]||!d)return;
  const st=G.races[rid];const old=st.rep;st.rep=clamp(Math.round((st.rep+d)*10)/10,-100,100);
  const real=Math.round(st.rep-old);repLog(rid);
  if(!quiet&&kn(rid).name&&real!==0)toast(RACE[rid].short+(real>0?' approve':' disapprove')+(why?' ('+why+')':'')+' '+(real>0?'+':'')+real,real>0?'g':'b');
}
// Helping/trading with a race ripples to its allies (+) and enemies (-)
function ripple(rid,d,why){
  addRep(rid,d,why);
  SB_RACES.forEach(o=>{if(o.id===rid)return;const rl=relOf(rid,o.id);
    if(rl===1)addRep(o.id,d*.5,'ally of '+RACE[rid].short);
    if(rl===-1)addRep(o.id,-d*.5,'enemy of '+RACE[rid].short);});
}
// Bullying a race: victims' allies and bully-haters are angered, strength-respecters are impressed
function bully(rid,amt,why){
  if(RACE[rid])addRep(rid,-amt,why);
  SB_RACES.forEach(o=>{if(o.id===rid)return;let d=0;
    if(RACE[rid]){const rl=relOf(rid,o.id);if(rl===1)d-=amt*.6;if(rl===-1)d+=amt*.3;}
    d-=amt*o.hatesBullies*.4;d+=amt*Math.max(0,o.respectsStrength)*.3;
    if(Math.abs(d)>=.5)addRep(o.id,d,d<0?'heard of your aggression':'impressed by your force');});
}
function mercy(rid,amt,why){
  if(RACE[rid])addRep(rid,amt,why);
  SB_RACES.forEach(o=>{if(o.id===rid)return;const d=amt*(o.hatesBullies*.5+(RACE[rid]&&relOf(rid,o.id)===1?.5:0));
    if(d>=.5)addRep(o.id,d,'heard of your mercy');});
}

/* ---------------- save / load ---------------- */
const SK=n=>'sbe.slot.'+n;
function save(){ if(!G||!G.slot)return; G.savedAt=Date.now();
  try{localStorage.setItem(SK(G.slot),JSON.stringify(G));localStorage.setItem('sbe.last',String(G.slot));}catch(e){} }
function readSlot(n){try{const s=localStorage.getItem(SK(n));return s?JSON.parse(s):null;}catch(e){return null;}}
// old saves (pre-0.2) lack newer races: give each a fresh home system in a free spot of the map
function migrate(g0){if(!g0||!g0.systems)return g0;if(!g0.spoke){g0.spoke={};Object.keys(g0.hist||{}).forEach(r=>{if((g0.hist[r]||[]).some(x=>/Opened talks|Spoke with them over comms/.test(x)))g0.spoke[r]=1;});}const r=rng((g0.seed||1)+77);const used=new Set(g0.systems.map(s=>s.name));
  SB_RACES.forEach(rc=>{if(g0.races[rc.id])return;if(rc.cohab&&g0.races[rc.cohab]){const hs=g0.systems[g0.races[rc.cohab].home];if(hs&&!hs.co){hs.co=rc.id;g0.races[rc.id]={home:hs.id,tech:clamp(rc.techBase+Math.round((r()-.5)*2),1,5),rep:0};SB_RELATIONS.forEach(([a,b,v])=>{if(a===rc.id||b===rc.id)g0.rel[pk(a,b)]=v;});SB_RACES.forEach(o=>{if(o.friendAll&&o.id!==rc.id)g0.rel[pk(o.id,rc.id)]=1;});return;}}let x,y,best=null,bd=-1;for(let t=0;t<300;t++){x=.08+r()*.84;y=.07+r()*.86;const d=Math.min(...g0.systems.map(s=>Math.hypot(s.x-x,s.y-y)));if(d>bd){bd=d;best=[x,y];}}
    const name=SB_SYSNAMES.find(n=>!used.has(n))||(rc.short+' Prime');used.add(name);const pool=SB_RES.map(z=>z.id).filter(z=>!rc.wants.includes(z)&&z!==rc.taboo&&z!==rc.secretWant);
    const s={id:g0.systems.length,name,port:false,x:best[0],y:best[1],type:pick(r,SB_PTYPES),owner:rc.id,rich:shuffle(r,pool).slice(0,3),scan:0,derelict:false,tex:Math.floor(r()*1e9)};g0.systems.push(s);
    g0.races[rc.id]={home:s.id,tech:clamp(rc.techBase+Math.round((r()-.5)*2),1,5),rep:0};
    SB_RELATIONS.forEach(([a,b,v])=>{if(a===rc.id||b===rc.id)g0.rel[pk(a,b)]=v;});
    SB_RACES.forEach(o=>{if(o.friendAll&&o.id!==rc.id)g0.rel[pk(o.id,rc.id)]=1;});});
  return g0;}
function lastSlot(){const n=+localStorage.getItem('sbe.last');return n&&readSlot(n)?n:0;}

/* ---------------- audio ---------------- */
const AU={ctx:null,on:localStorage.getItem('sbe.mute')!=='1',master:null,music:null};
function audioInit(){
  if(AU.ctx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=AU.ctx=new AC();AU.master=c.createGain();AU.master.gain.value=AU.on?1:0;AU.master.connect(c.destination);
  // ambient pad: slow drifting chords through a lowpass + feedback delay
  const mg=AU.music=c.createGain();mg.gain.value=.11;
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;
  const dl=c.createDelay();dl.delayTime.value=.55;const fb=c.createGain();fb.gain.value=.38;
  mg.connect(lp);lp.connect(AU.master);lp.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(AU.master);
  const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=.07;lg.gain.value=380;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
  const chords=[[220,277.2,329.6,415.3],[196,246.9,293.7,370],[174.6,220,261.6,329.6],[207.7,261.6,311.1,392]];
  const voices=[0,1,2,3].map(()=>{const o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain();o.type='sine';o2.type='triangle';o2.detune.value=7;g.gain.value=0;o.connect(g);o2.connect(g);g.connect(mg);o.start();o2.start();return{o,o2,g};});
  let ci=0;
  function step(){const t=c.currentTime,ch=chords[ci++%chords.length];
    voices.forEach((v,i)=>{const f=ch[i]/(i===0?2:1);v.o.frequency.setTargetAtTime(f,t,1.5);v.o2.frequency.setTargetAtTime(f,t,1.5);
      v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(.22-i*.035,t,2);});
    // sparkle
    for(let k=0;k<3;k++){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=ch[(k+ci)%4]*2*(k===2?2:1);
      const s=t+1+k*1.7+Math.random();g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.05,s+.05);g.gain.exponentialRampToValueAtTime(.0001,s+2.5);
      o.connect(g);g.connect(mg);o.start(s);o.stop(s+2.6);}
  }
  step();setInterval(step,9000);
}
function sfx(kind){
  const c=AU.ctx;if(!c||!AU.on)return;const t=c.currentTime;
  const tone=(f,d,type,vol,f2,at)=>{const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t+(at||0));if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+(at||0)+d);
    g.gain.setValueAtTime(0,t+(at||0));g.gain.linearRampToValueAtTime(vol||.08,t+(at||0)+.01);g.gain.exponentialRampToValueAtTime(.0001,t+(at||0)+d);o.connect(g);g.connect(AU.master);o.start(t+(at||0));o.stop(t+(at||0)+d+.05);};
  if(kind==='tap')tone(880,.08,'sine',.05,1200);
  else if(kind==='ok'){tone(660,.12,'sine',.06);tone(990,.18,'sine',.05,null,.08);}
  else if(kind==='bad')tone(300,.25,'triangle',.06,180);
  else if(kind==='warp'){tone(120,1.4,'sawtooth',.03,900);tone(240,1.4,'sine',.05,1800);}
  else if(kind==='scan'){for(let i=0;i<4;i++)tone(1200+i*200,.09,'sine',.04,null,i*.12);}
  else if(kind==='alert'){tone(520,.3,'triangle',.06,440);tone(520,.3,'triangle',.06,440,.4);}
  else if(kind==='fire'){tone(1400,.35,'sawtooth',.04,200);}
  else if(kind==='coin'){tone(1320,.08,'square',.025);tone(1760,.12,'square',.025,null,.07);}
}
function setSound(on){AU.on=on;localStorage.setItem('sbe.mute',on?'0':'1');if(AU.master)AU.master.gain.value=on?1:0;}

/* ---------------- images ---------------- */
const IMG={};
function loadPortrait(key,rc){const im=new Image();im.src=rc.img;IMG[key]=im;im.onload=()=>{
  // sample eyelid colors (skin just above each eye) for blinking
  try{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);
    im._lid=rc.eyes.map(([ex,ey])=>{const d=x.getImageData(Math.round(ex*c.width),Math.round((ey-rc.eyeR*1.6)*c.height),1,1).data;return 'rgb('+d[0]+','+d[1]+','+d[2]+')';});}catch(e){im._lid=null;}
};}
SB_RACES.forEach(rc=>{loadPortrait(rc.id,rc);if(rc.alt){loadPortrait(rc.id+'#alt',rc.alt);rc._speaker=rc.speaker;Object.defineProperty(rc,'speaker',{get(){return (typeof G!=='undefined'&&G&&G.visit&&G.visit.alt===rc.id)?rc.alt.speaker:rc._speaker;},configurable:true});}});

/* ---------------- planet renderer (spherical texture mapping) ---------------- */
const PAL={terran:[[30,70,140],[40,110,60],[120,140,70],[230,230,240]],desert:[[150,90,40],[200,140,70],[230,190,120],[170,100,60]],
  ice:[[150,190,220],[210,230,245],[120,160,200],[245,250,255]],ocean:[[10,40,110],[20,80,160],[40,130,190],[230,240,255]],
  lava:[[30,10,10],[90,20,10],[240,90,20],[255,200,60]],gas:[[180,130,90],[220,180,130],[150,90,70],[240,220,190]],
  jungle:[[20,70,30],[40,120,40],[90,150,50],[30,90,90]],crystal:[[60,40,110],[120,90,200],[80,200,230],[220,200,255]],station:[[60,70,90],[90,100,120],[140,150,170],[200,210,220]]};
const texCache={};
function planetTex(s){
  if(texCache[s.id])return texCache[s.id];
  const W=512,H=256,r=rng(s.tex),pal=PAL[s.type]||PAL.terran;const g=[];
  // value-noise octaves
  const grid=(n)=>{const a=[];for(let i=0;i<n*(n/2+1);i++)a.push(r());return(x,y)=>{const gx=x*n,gy=y*n/2;const x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0;
    const at=(i,j)=>a[((j%(n/2+1))*n)+(((i%n)+n)%n)];const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    return (at(x0,y0)*(1-sx)+at(x0+1,y0)*sx)*(1-sy)+(at(x0,y0+1)*(1-sx)+at(x0+1,y0+1)*sx)*sy;};};
  const o=[grid(8),grid(16),grid(32),grid(64)];
  const data=new Uint8ClampedArray(W*H*3);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const u=x/W,v=y/H;let n=o[0](u,v)*.45+o[1](u,v)*.27+o[2](u,v)*.17+o[3](u,v)*.11;
    if(s.type==='gas')n=.5+.5*Math.sin(v*28+n*6);
    const lat=Math.abs(v-.5)*2;
    const st=[.38,.52,.64,.76];let c;
    if(n<=st[0])c=pal[0];else if(n>=st[3])c=pal[3];else{let k=0;while(n>st[k+1])k++;const f=(n-st[k])/(st[k+1]-st[k]),e=f*f*(3-2*f);c=[0,1,2].map(q=>pal[k][q]+(pal[k+1][q]-pal[k][q])*e);}
    if((s.type==='terran'||s.type==='ocean')&&lat>.82)c=[235,240,250];
    const k=.85+.3*o[3](u*3%1,v);
    const i=(y*W+x)*3;data[i]=c[0]*k;data[i+1]=c[1]*k;data[i+2]=c[2]*k;
  }
  return texCache[s.id]={W,H,data};
}
const PR=128;const pCan=document.createElement('canvas');pCan.width=pCan.height=PR*2;const pCtx=pCan.getContext('2d');const pImg=pCtx.createImageData(PR*2,PR*2);
const pMap=[];// precomputed sphere lookup
for(let y=0;y<PR*2;y++)for(let x=0;x<PR*2;x++){const dx=(x-PR+.5)/PR,dy=(y-PR+.5)/PR,d=dx*dx+dy*dy;if(d<=1){const z=Math.sqrt(1-d);
  const lon=Math.atan2(dx,z)/(Math.PI*2)+.25,lat=Math.asin(dy)/Math.PI+.5;const light=clamp(( -dx*.55-dy*.35+z*.75),0,1);
  pMap.push([(y*PR*2+x)*4,lon,lat,.12+.95*light,Math.min(1,(1-d)*14)]);}}
function renderPlanet(s,t){
  const tx=planetTex(s),D=pImg.data;D.fill(0);const rot=t*.012;
  for(const [i,lon,lat,l,a] of pMap){const u=((lon+rot)%1+1)%1;const xx=Math.floor(u*tx.W),yy=Math.min(tx.H-1,Math.floor(lat*tx.H));const j=(yy*tx.W+xx)*3;
    D[i]=tx.data[j]*l;D[i+1]=tx.data[j+1]*l;D[i+2]=tx.data[j+2]*l;D[i+3]=255*a;}
  pCtx.putImageData(pImg,0,0);return pCan;
}

/* ---------------- canvas: bridge + viewscreen ---------------- */
const cv=$('bg'),cx=cv.getContext('2d');let DPR=1,CW=0,CH=0;
const stars=[];for(let i=0;i<220;i++)stars.push({x:Math.random(),y:Math.random(),z:Math.random(),tw:Math.random()*6});
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);const r=$('app').getBoundingClientRect();CW=r.width;CH=r.height;cv.width=CW*DPR;cv.height=CH*DPR;}
window.addEventListener('resize',resize);
function rr(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();}
function drawBridge(t){
  // hull background
  const g=cx.createLinearGradient(0,0,0,CH);g.addColorStop(0,'#0a1122');g.addColorStop(.5,'#070c1a');g.addColorStop(1,'#04060d');cx.fillStyle=g;cx.fillRect(0,0,CW,CH);
  // bulkhead ribs
  cx.strokeStyle='#14223f';cx.lineWidth=2;
  for(let i=0;i<6;i++){const x=(i+.5)*CW/6;cx.beginPath();cx.moveTo(x,0);cx.lineTo(x+(x-CW/2)*.15,CH);cx.stroke();}
  // console lights (under stations & panel)
  const st=$('stations').getBoundingClientRect(),ap=$('app').getBoundingClientRect();
  const y0=st.top-ap.top;
  cx.fillStyle='#0b1630';rr(4,y0-2,CW-8,st.height+4,14);cx.fill();
  for(let i=0;i<26;i++){const on=(Math.sin(t*1.3+i*1.7)+1)/2>.6;cx.fillStyle=on?['#ffcf6a','#5fd0ff','#ff6a8a','#7fe7a8'][i%4]:'#1a2850';
    cx.fillRect(12+i*(CW-24)/26,y0+st.height+0,(CW-24)/26-3,2);}
}
function vsRect(){const a=$('app').getBoundingClientRect(),v=$('vs').getBoundingClientRect();return{x:v.left-a.left,y:v.top-a.top,w:v.width,h:v.height};}
function drawStars(R,t,speed){
  cx.fillStyle='#01030a';cx.fillRect(R.x,R.y,R.w,R.h);
  for(const s of stars){
    if(speed){const k=(s.z+t*speed*.3)%1;const cxp=R.x+R.w/2,cyp=R.y+R.h/2;const dx=(s.x-.5)*R.w*k*2.2,dy=(s.y-.5)*R.h*k*2.2;
      cx.strokeStyle='rgba(180,220,255,'+k+')';cx.lineWidth=1+k*1.5;cx.beginPath();cx.moveTo(cxp+dx*.8,cyp+dy*.8);cx.lineTo(cxp+dx,cyp+dy);cx.stroke();}
    else{const a=.4+.6*Math.abs(Math.sin(t*.8+s.tw));cx.fillStyle='rgba(220,235,255,'+a*(.3+s.z*.7)+')';const sx=R.x+((s.x+t*.002*s.z)%1)*R.w;cx.fillRect(sx,R.y+s.y*R.h,s.z>.85?2:1,s.z>.85?2:1);}
  }
}
function drawNebula(R,hue){
  const g=cx.createRadialGradient(R.x+R.w*.8,R.y+R.h*.2,10,R.x+R.w*.8,R.y+R.h*.2,R.w*.8);
  g.addColorStop(0,'hsla('+hue+',70%,45%,.25)');g.addColorStop(1,'hsla('+hue+',70%,30%,0)');cx.fillStyle=g;cx.fillRect(R.x,R.y,R.w,R.h);
}
function drawPortrait(R,t,rid){
  let rc=RACE[rid];const ALT=rc.alt&&G.visit&&G.visit.alt===rid;const im=ALT?IMG[rid+'#alt']:IMG[rid];if(ALT)rc=Object.assign({},rc,{eyes:rc.alt.eyes,eyeR:rc.alt.eyeR,blink:rc.alt.blink});
  cx.fillStyle='#000';cx.fillRect(R.x,R.y,R.w,R.h);
  if(!im||!im.complete||!im.naturalWidth)return;
  const talking=V.talkUntil>performance.now();
  const breathe=1+.012*Math.sin(t*1.6);const bob=talking?Math.sin(t*13)*1.6+Math.sin(t*7.3)*1:0;
  const w=R.w*1.04*breathe,h=w*im.naturalHeight/im.naturalWidth;
  const x=R.x+(R.w-w)/2,y=R.y+R.h*.42-h*.37+bob-(h*(breathe-1))*.5+Math.sin(t*.9)*1.2;
  cx.drawImage(im,x,y,w,h);
  // blink / eye glow
  const bt=(t+rid.length*1.3)%4.3;
  rc.eyes.forEach(([ex,ey],i)=>{const px=x+ex*w,py=y+ey*h,rad=rc.eyeR*w;
    if(rc.blink&&bt<.14&&im._lid){const k=Math.sin(bt/.14*Math.PI);cx.fillStyle=im._lid[i];cx.beginPath();cx.ellipse(px,py-rad*(1-k)*.9,rad*1.25,rad*1.05*k+.5,0,0,Math.PI*2);cx.fill();}
    if(rc.glow){const a=.18+.14*Math.sin(t*2.2+i);const gg=cx.createRadialGradient(px,py,0,px,py,rad*2.2);gg.addColorStop(0,rc.glow);gg.addColorStop(1,'rgba(0,0,0,0)');cx.globalAlpha=a;cx.fillStyle=gg;cx.fillRect(px-rad*3,py-rad*3,rad*6,rad*6);cx.globalAlpha=1;}
  });
  // comm-link scanlines
  cx.fillStyle='rgba(120,200,255,.05)';for(let yy=R.y+(t*30)%4;yy<R.y+R.h;yy+=4)cx.fillRect(R.x,yy,R.w,1);
}
function drawShip(R,t,enc){
  const col=(RACE[enc.race]||SB_PIRATES).color;const cxp=R.x+R.w*.5+Math.sin(t*.7)*R.w*.08,cyp=R.y+R.h*.45+Math.sin(t*1.1)*6;const s=Math.min(R.w,R.h)/220*(enc.state==='fled'?.4:1);
  cx.save();cx.translate(cxp,cyp);cx.scale(s,s);
  if(enc.state==='disabled'){cx.rotate(Math.sin(t*.4)*.15);}
  // engines
  if(enc.state!=='disabled'){[[-46,22],[46,22]].forEach(([ex,ey])=>{const gg=cx.createRadialGradient(ex,ey,0,ex,ey,26);gg.addColorStop(0,'#fff');gg.addColorStop(.3,col);gg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=gg;cx.fillRect(ex-30,ey-30,60,60);});}
  const hg=cx.createLinearGradient(0,-60,0,40);hg.addColorStop(0,'#5a6478');hg.addColorStop(1,'#1c2130');cx.fillStyle=hg;cx.strokeStyle=col;cx.lineWidth=2;
  cx.beginPath();cx.moveTo(0,-62);cx.lineTo(22,-10);cx.lineTo(80,14);cx.lineTo(70,30);cx.lineTo(18,22);cx.lineTo(0,36);cx.lineTo(-18,22);cx.lineTo(-70,30);cx.lineTo(-80,14);cx.lineTo(-22,-10);cx.closePath();cx.fill();cx.stroke();
  cx.fillStyle=col;cx.globalAlpha=.8;cx.fillRect(-4,-40,8,46);cx.globalAlpha=1;
  for(let i=-3;i<=3;i++){cx.fillStyle=(Math.sin(t*3+i)>0)?'#ffe9a0':'#334';cx.fillRect(i*9-2,0,4,3);}
  if(enc.state==='disabled'){for(let i=0;i<5;i++){const a=(t*2+i)%1;cx.fillStyle='rgba(255,'+(150+i*20)+',60,'+(1-a)+')';cx.beginPath();cx.arc(-30+i*14,-5-a*30,3+a*6,0,7);cx.fill();}}
  cx.restore();
  if(V.fireUntil>performance.now()){const k=(V.fireUntil-performance.now())/600;cx.strokeStyle='rgba(255,180,90,'+k+')';cx.lineWidth=4*k+1;cx.beginPath();cx.moveTo(R.x+R.w*.15,R.y+R.h);cx.lineTo(cxp,cyp);cx.moveTo(R.x+R.w*.85,R.y+R.h);cx.lineTo(cxp,cyp);cx.stroke();}
  // our shield shimmer
  cx.strokeStyle='rgba(120,200,255,'+(.15+.1*Math.sin(t*3))+')';cx.lineWidth=3;cx.beginPath();cx.ellipse(R.x+R.w/2,R.y+R.h*1.25,R.w*.7,R.h*.5,0,Math.PI*1.1,Math.PI*1.9);cx.stroke();
}
function frameVS(R,t){
  // bezel
  cx.save();rr(R.x-6,R.y-6,R.w+12,R.h+12,18);const bg=cx.createLinearGradient(0,R.y,0,R.y+R.h);bg.addColorStop(0,'#2a3b5e');bg.addColorStop(1,'#0e1730');cx.fillStyle=bg;cx.fill();cx.restore();
  cx.save();rr(R.x,R.y,R.w,R.h,12);cx.clip();
}
function frameEnd(R,t){
  const gl=cx.createLinearGradient(R.x,R.y,R.x+R.w,R.y+R.h);gl.addColorStop(0,'rgba(255,255,255,.07)');gl.addColorStop(.4,'rgba(255,255,255,0)');cx.fillStyle=gl;cx.fillRect(R.x,R.y,R.w,R.h);
  cx.restore();
  cx.strokeStyle='#5f8fd0';cx.lineWidth=1.5;rr(R.x,R.y,R.w,R.h,12);cx.stroke();
  // corner brackets
  cx.strokeStyle='#ffcf6a';cx.lineWidth=2;[[0,0,1,1],[1,0,-1,1],[0,1,1,-1],[1,1,-1,-1]].forEach(([a,b,sx,sy])=>{const x=R.x+a*R.w,y=R.y+b*R.h;cx.beginPath();cx.moveTo(x+sx*4,y+sy*18);cx.lineTo(x+sx*4,y+sy*4);cx.lineTo(x+sx*18,y+sy*4);cx.stroke();});
}
let T0=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  if(!CW)resize();
  const t=(now-T0)/1000;
  cx.setTransform(DPR,0,0,DPR,0,0);
  drawBridge(t);
  const R=vsRect();if(R.h<4)return;cx.save();cx.globalAlpha=Math.min(1,R.h/120);
  frameVS(R,t);
  const mode=vsMode();
  if(mode==='warp'){drawStars(R,t,2.4);}
  else if(mode==='portrait'){drawPortrait(R,t,V.dlg.rid);}
  else{
    const s=G?here():{id:-1,type:'ocean',tex:7};
    drawStars(R,t,0);drawNebula(R,G?(s.tex%360):220);
    if(mode==='ship'){drawShip(R,t,G.enc);}
    else{
      const img=renderPlanet(s.id<0?{id:'title',type:'ocean',tex:4242}:s,t);const D=Math.min(R.w,R.h)*(SB.state==='title'?.95:.78);
      const px=R.x+R.w*.5-D/2+(SB.state==='title'?0:R.w*.12),py=R.y+R.h*.5-D/2;
      // atmosphere glow
      const ag=cx.createRadialGradient(px+D/2,py+D/2,D*.45,px+D/2,py+D/2,D*.58);ag.addColorStop(0,'rgba(120,190,255,.35)');ag.addColorStop(1,'rgba(120,190,255,0)');cx.fillStyle=ag;cx.fillRect(px-D*.2,py-D*.2,D*1.4,D*1.4);
      cx.drawImage(img,px,py,D,D);
      if(s.port&&G){drawStation(px+D*.2,py+D*.25,t);}
      if(V.scanUntil>performance.now()){const k=1-(V.scanUntil-performance.now())/1500;cx.strokeStyle='rgba(120,255,200,.7)';cx.lineWidth=2;const yy=py+D*k;cx.beginPath();cx.moveTo(px,yy);cx.lineTo(px+D,yy);cx.stroke();cx.fillStyle='rgba(120,255,200,.08)';cx.fillRect(px,py,D,D*k);}
    }
  }
  frameEnd(R,t);cx.restore();
}
function drawStation(x,y,t){cx.save();cx.translate(x,y);cx.rotate(t*.2);cx.strokeStyle='#cfd8ef';cx.lineWidth=3;cx.beginPath();cx.ellipse(0,0,26,26,0,0,7);cx.stroke();
  for(let i=0;i<4;i++){cx.rotate(Math.PI/2);cx.beginPath();cx.moveTo(0,0);cx.lineTo(26,0);cx.stroke();}cx.fillStyle='#ffcf6a';cx.fillRect(-5,-5,10,10);cx.restore();}
function vsMode(){
  if(SB.state==='title'||!G)return'title';
  if(V.warpT>performance.now())return'warp';
  if(V.view==='comms'&&V.dlg&&V.dlg.rid)return'portrait';
  if(G.enc&&(V.view==='tactical'||G.enc.state==='active'))return'ship';
  return'space';
}

/* ---------------- UI helpers ---------------- */
function toast(msg,kind){const el=document.createElement('div');el.className='toast '+(kind||'');el.textContent=msg;const box=$('toasts');box.appendChild(el);
  while(box.children.length>4)box.removeChild(box.firstChild);setTimeout(()=>el.remove(),3600);}
function cargoUsed(){return Object.values(G.cargo).reduce((a,b)=>a+b,0)+(G.favors?G.favors.filter(f=>f.state==='open').length:0);}
function commit(){ achCheck(); save(); renderAll(); }
/* v3.3 achievements (cosmetic) and travel events */
function st(){return G.stats=G.stats||{vis:{},goods:{},tr:0,ev:0,help:0,tow:0,whale:0,anom:0};}
function metIds(){return SB_RACES.filter(r=>G.kn[r.id]&&G.kn[r.id].portrait).map(r=>r.id);}
const ACH=[['m10','Friendly Faces','Meet 10 races',()=>foundCount()/10],['m25','Social Butterfly','Meet 25 races',()=>foundCount()/25],['m50','Ambassador','Meet 50 races',()=>foundCount()/50],['m88','Every Voice','Meet all 88 races',()=>foundCount()/88],
['v5','Wanderer','Visit 5 systems',()=>Object.keys(st().vis).length/5],['v20','Pathfinder','Visit 20 systems',()=>Object.keys(st().vis).length/20],['v50','Star Cartographer','Visit 50 systems',()=>Object.keys(st().vis).length/50],
['t10','Small Trader','Trade 10 goods',()=>st().tr/10],['t100','Merchant Prince','Trade 100 goods',()=>st().tr/100],['g','Collector','Handle every type of good',()=>Object.keys(st().goods).length/Object.keys(RES).length],
['sc','First Look','Scan a planet',()=>+G.systems.some(s=>s.scan>0)],['hk','Quiet Fingers','Hack a ship\'s records',()=>+Object.values(G.ships||{}).some(o=>Object.values(o).some(x=>/^Hacked/.test(x.how)))],
['rs','Good Samaritan','Rescue someone',()=>+(G.systems.some(s=>s.distress)||favs().some(f=>f.rescue&&f.state==='done'))],['an','Face the Unknown','Confront an anomaly',()=>st().anom],
['tw','Towed Home','Survive a tow',()=>st().tow],['e1','Something Out There','Have a travel event',()=>st().ev],['e10','Seasoned Traveler','Have 10 travel events',()=>st().ev/10],
['hp','Helping Hand','Answer 3 distress calls',()=>st().help/3],['wh','Song of the Deep','See a space whale',()=>st().whale],['nt','Diarist','Write a note in your Log',()=>+Object.values(G.pnotes||{}).some(x=>x.trim())],
['c1k','Comfortable','Hold ¢1000',()=>G.credits/1000]];
function achCheck(){if(!G||!G.kn)return;const A=(G.ach=G.ach||{});ACH.forEach(([id,n,,f])=>{if(!A[id]&&f()>=1){A[id]=G.turn;toast('🏅 Achievement: '+n,'g');}});}
const EVTS=[
 {id:'distress',t:'A faint distress call: a small ship with a blown coupling.',c:[['Help them (−5 fuel, +¢40, +rep)',r=>{G.fuel=Math.max(0,G.fuel-5);G.credits+=40;st().help++;if(r)addRep(r,3,'answered a distress call');return'They thank you warmly and press a few credits on you.';}],['Pass by and log it for port patrols',()=>'You relay their position. Someone else will get there soon.']]},
 {id:'wreck',t:'A drifting derelict, long abandoned.',c:[['Salvage it (+¢30–80)',()=>{const c=30+Math.floor(Math.random()*51);G.credits+=c;return'You recover parts worth ¢'+c+'.';}],['Leave it in peace',()=>'You mark it on your charts and move on.']]},
 {id:'whale',t:'A space whale glides past, singing in radio static.',c:[['Watch a while (+10 morale)',()=>{st().whale=1;G.morale=Math.min(100,(G.morale||80)+10);return'The crew falls quiet. Morale rises.';}]]},
 {id:'pod',t:'A lost cargo pod tumbles nearby, unclaimed.',c:[['Bring it aboard (+1 good)',()=>{if(cargoUsed()>=G.cargoMax){G.credits+=20;return'Hold full. You sell the pod\'s beacon for ¢20.';}const k=pick(Math.random,Object.keys(RES));G.cargo[k]=(G.cargo[k]||0)+1;st().goods[k]=1;return'Inside: 1 '+RES[k].name+'.';}],['Leave it',()=>'Maybe its owner will find it.']]},
 {id:'trader',t:'A stranded trader needs fuel and offers credits for it.',c:[['Sell 10 fuel for ¢60',()=>{if(G.fuel<15)return'You can\'t spare it right now. They understand.';G.fuel-=10;G.credits+=60;return'Deal. They wave as they fly off.';}],['Decline politely',()=>'They nod. Another ship is already on its way.']]},
 {id:'ion',t:'An ion storm lies ahead.',c:[['Detour around it (−3 fuel)',()=>{G.fuel=Math.max(0,G.fuel-3);return'A short detour. Everyone stays comfortable.';}]]},
 {id:'probe',t:'A lost survey probe pings your ship.',c:[['Read its data (a rumor)',r=>{if(!r)return'Its logs hold star charts you already have.';const z=pick(Math.random,metIds());know(z,'wants');return'The probe recorded what the '+RACE[z].short+' want in trade. Logged.';}],['Send it home',()=>'It beeps gratefully and drifts off.']]},
 {id:'convoy',t:'A friendly pilgrim convoy shares the lane with you.',c:[['Share a meal (+5 morale, +5 life support)',()=>{G.morale=Math.min(100,(G.morale||80)+5);G.ls=Math.min(100,(G.ls||100)+5);return'Songs, stories and tea. A lovely evening.';}],['Wave and fly on',()=>'They flash their lights in greeting.']]},
 {id:'comet',t:'A bright comet streaks past, trailing ice.',c:[['Skim some ice (+8 fuel)',()=>{G.fuel=Math.min(G.fuelMax,G.fuel+8);return'Ice melted into fuel. +8.';}]]},
 {id:'beacon',t:'An old beacon plays a welcome message in many languages.',c:[['Listen',()=>{G.morale=Math.min(100,(G.morale||80)+3);return'A message of peace from long ago. Nice.';}]]}];
function travelEvent(force){if(G.enc||SB.state!=='play')return;if(!force&&Math.random()>=.17)return;const e=force?EVTS.find(x=>x.id===force):pick(Math.random,EVTS);const m=metIds(),r=m.length?pick(Math.random,m):null;
  st().ev++;modal('<h3>On the way…</h3><p>'+esc(e.t)+'</p>'+e.c.map((c,i)=>'<button class="btn" data-ev="'+i+'">'+esc(c[0])+'</button>').join(''));
  $('modal').onclick=ev=>{const b=ev.target.closest('button');if(!b||b.dataset.ev==null)return;const msg=e.c[+b.dataset.ev][1](r);$('modal').classList.add('hide');toast(msg,'g');commit();};}
const STATIONS=[['helm','Helm','✦'],['science','Science','◎'],['comms','Comms','☏'],['trade','Trade','⇄'],['market','Market','¢'],['tactical','Tactical','⚔'],['status','Status','⚙'],['missions','Missions','☰'],['log','Log','▤']];
function renderStations(){
  $('stations').innerHTML=STATIONS.map(([id,l,i])=>'<button class="sb'+(V.view===id?' on':'')+(id==='tactical'&&G.enc&&G.enc.state==='active'?' alert':'')+'" data-st="'+id+'"><i>'+i+'</i>'+l+(id==='missions'&&missionBadgeCount()?'<em class="sbb">'+missionBadgeCount()+'</em>':'')+'</button>').join('');
}
function renderHud(){
  const s=here();$('hLoc').textContent=s.name+(s.port?' (port)':'');
  $('hFuel').textContent='⛽'+Math.round(G.fuel)+' ⛨'+(G.hull==null?100:G.hull);$('hCr').textContent='¢'+G.credits;$('hCargo').textContent='📦'+cargoUsed()+'/'+G.cargoMax;
  const o=s.owner&&kn(s.owner).loc&&!kn(s.owner).loc.r?RACE[s.owner].short+' space':(s.port?'Free port':'Uncharted');
  $('cap').textContent=vsMode()==='portrait'?RACE[V.dlg.rid].speaker+' · '+RACE[V.dlg.rid].name:vsMode()==='ship'?(G.enc.name+' · '+G.enc.state):(s.name+' · '+o);
}
const TIPS={helm:'Tap any star to plot a course. The route shows distance and fuel before you jump.',science:'Survey scans are free. Deep scans cost fuel and credits but reveal much more. During an encounter, scan the ship here.',comms:'Hail to talk. Your opening tone matters: each race likes different approaches.',trade:'Buy low, sell where it is wanted. Prices you see are saved in Market Research.',market:'Only prices you have seen are listed, with how old they are.',tactical:'Encounters are never a game over. Talking first often works best.',status:'Tap a cargo item to look it up in Market Research.',missions:'Favors and quests you accept appear here.',log:'Everything you learn about each species is filed here. Add your own notes too.'};
function prefs(){try{return JSON.parse(localStorage.getItem('sbe.prefs')||'{}');}catch(e){return{};}}
function setPref(k,v){const p=prefs();p[k]=v;localStorage.setItem('sbe.prefs',JSON.stringify(p));}
function tipHtml(v){const p=prefs();if(p.tipsOff||!TIPS[v]||(p.seen||{})[v]||!G.slot&&!V.tipsTest)return'';const s=p.seen||{};s[v]=1;setPref('seen',s);return'<div class="tip"><b>Tip</b> '+esc(TIPS[v])+'<button data-a="tipx" aria-label="Dismiss">Got it</button></div>';}
function applyTextSize(){const z={n:1,l:1.15,xl:1.3}[prefs().ts||'n']||1;document.documentElement.style.setProperty('--tz',z);document.body.dataset.ts=prefs().ts||'n';}
function noteBox(key){const t=(G.pnotes||{})[key]||'';return'<h3 class="cxh">MY NOTES</h3><textarea class="pnote" data-note="'+esc(key)+'" rows="3" maxlength="600" placeholder="Write your own notes here. Saved automatically.">'+esc(t)+'</textarea>';}
function renderAll(){ if(!G)return; renderHud(); document.body.classList.toggle('vsoff',!(V.view==='helm'||V.view==='science'||(V.view==='comms'&&V.dlg&&V.dlg.rid))); if(V.markSeen&&V.view!=='missions'){V.markSeen.forEach(([k,v])=>{(G.mseen=G.mseen||{})[k]=v;});V.markSeen=null;} renderStations(); const fn=VIEWS[V.view]; $('panel').innerHTML=tipHtml(V.view)+fn(); $('panel').scrollTop=V.keepScroll?$('panel').scrollTop:0; afterRender(); }
function afterRender(){ if(V.view==='helm'){drawMap();const c=$('map'),pn=$('panel');if(c&&pn&&(V.mapAt!==G.loc||V.mapFocus!=null)){V.mapAt=G.loc;const fy=V.mapFocus!=null?sys(V.mapFocus).y:here().y;V.mapFocus=null;const y=12+fy*(c.clientHeight-24);const cr=c.getBoundingClientRect(),pr=pn.getBoundingClientRect();pn.scrollTop=Math.max(0,pn.scrollTop+cr.top-pr.top+y-pn.clientHeight/2);}} const c=$('chat');if(c)c.scrollTop=c.scrollHeight; }
function raceName(rid){const k=kn(rid);return k.name?RACE[rid].short+(k.name.r?' (rumored)':''):'Unknown species';}
function fieldHtml(rid,f,fmt){const k=kn(rid)[f];if(!k)return UNK;return esc(fmt(k.v))+(k.r?'<span class="tag">rumored</span>':'');}
const resList=a=>a.map(x=>RES[x].icon+' '+RES[x].name).join(', ');
const raceList=a=>a.length?a.map(x=>kn(x).name?RACE[x].short:'an unknown species').join(', '):'None known';

/* ---------------- views ---------------- */
const VIEWS={};
VIEWS.status=statusView;VIEWS.market=marketView;VIEWS.missions=missionView;
VIEWS.helm=()=>{
  const s=V.sel!=null?sys(V.sel):null;let h='<h2>HELM · GALAXY MAP</h2><canvas class="map" id="map"></canvas>';
  if(s&&s.id!==G.loc){const d=dist(G.loc,s.id),cost=fuelCost(d);
    h+='<p><b>'+esc(s.name)+'</b> · '+sysLabel(s)+'<br><span class="small">Distance '+(d*10).toFixed(1)+' ly · fuel '+cost+' of '+Math.round(G.fuel)+'</span></p>';
    if(cost<=G.fuel)h+='<button class="btn pri" data-a="warp">Engage warp to '+esc(s.name)+' (⛽ '+cost+' fuel)</button>';
    else h+='<p class="small">Not enough fuel for that jump. No problem: the ship can limp to the nearest port, where you can top up for a few credits (or free if you are broke).</p><button class="btn pri" data-a="limp">Limp to nearest port</button>';
  } else h+='<p class="small">Tap a star system to plot a course. Refuel free at Haven Station, or for about ¢1 per unit elsewhere; there is no clock, so explore at your own pace.</p>';
  if(!(s&&s.id!==G.loc))h+=refuelBtn()+yardHtml();
  return h;
};
VIEWS.science=()=>{
  const s=here();let h='<h2>SCIENCE · '+esc(s.name.toUpperCase())+'</h2>'+encScienceHtml();
  if(s.scan<1){h+='<p>Planetary sensors ready. A survey scan reveals the world, its inhabitants and its richest resources.</p><button class="btn pri" data-a="scan1">Run survey scan</button>';return h;}
  h+='<div class="kv"><b>World type</b><span>'+cap(s.type)+'</span><b>Rich in</b><span>'+resList(s.rich)+'</span>';
  if(s.owner)residents(s).forEach(o=>{const st=G.races[o];h+='<b>Inhabitants</b><span>'+esc(RACE[o].name)+'</span><b>Tech level</b><span>'+TECH_NAMES[st.tech]+' ('+st.tech+'/5) — '+techCompare(st.tech)+'</span>';});
  else if(!s.port)h+='<b>Inhabitants</b><span>None. '+(s.scan>=2?(s.looted?'Salvage recovered.':'Deep scan complete.'):'A deep scan may find ruins, derelicts or old signals.')+'</span>';
  else if(s.port)h+='<b>Inhabitants</b><span>Mixed traders, free port</span>';
  else h+='<b>Inhabitants</b><span>None detected</span>';
  h+='</div>'+noteBox('p:'+s.id);
  if(s.scan<2){h+='<p class="small">A deep scan sweeps subspace chatter, buried ruins and encrypted traffic: true stock, defenses, distress calls, salvage and coordinates (3 fuel + ¢'+(G.up&&G.up.scanner?SCAN_CR/2:SCAN_CR)+' in probe drones).</p><button class="btn pri" data-a="scan2">Run deep scan</button>';}
  else h+='<p class="small">Deep scan complete. Findings are in your Computer Log.</p>'+(V.lastScan?'<div class="say">'+V.lastScan.map(esc).join('<br>')+'</div>':'');
  return h;
};
VIEWS.comms=()=>{
  const s=here();const D=V.dlg;
  if(G.enc&&G.enc.state==='active'&&!D)return'<h2>COMMS</h2><p>An armed vessel, the <b>'+esc(G.enc.name)+'</b>, is on an intercept course.</p>'+(RACE[G.enc.race]?'<button class="btn pri" data-a="hail-enc">Hail the '+esc(G.enc.name)+'</button><button class="btn" data-a="go-tactical">Go to Tactical</button>':'<button class="btn pri" data-a="go-tactical">Go to Tactical</button>');
  if(!D){
    if(!s.owner)return'<h2>COMMS</h2><p>'+(s.port?'Port control waves you through: "Welcome to '+esc(s.name)+', Captain. Trade and fuel are open."':'Only static and distant pulsar chirps. Nobody here to hail.')+'</p>'+(s.port?''+(G.visit.drink?'<p class="small">Bartender: "Easy there, spacer, one\'s your limit till next shore leave."</p><button class="btn" data-a="port-rumor" aria-disabled="true" style="opacity:.45">Drink bought this visit</button>':'<button class="btn" data-a="port-rumor">Buy a drink and listen for rumors (¢10)</button>'):'');
    if(s.co)return'<h2>COMMS</h2><p>A shared world: two peoples answer on this planet\'s channels.</p>'+residents(s).map((o,i)=>'<button class="btn'+(i?'':' pri')+'" data-a="hail" data-v="'+o+'">Hail '+(kn(o).name?'the <b>'+esc(RACE[o].short)+'</b>':'channel '+(i+1))+'</button>').join('');
    return'<h2>COMMS</h2><p>A planetary channel is available'+(kn(s.owner).name?' to the <b>'+esc(RACE[s.owner].name)+'</b>':'')+'.</p><button class="btn pri" data-a="hail">Open hailing frequencies</button>';
  }
  const rc=RACE[D.rid];let h='<h2 class="ch">COMMS · '+esc(rc.short.toUpperCase())+'<button class="hlog" data-a="dlgmis">☰</button><button class="hlog" data-a="dlgstat">⚙</button><button class="hlog" data-a="dlglog">▤ Log</button></h2>';
  h+='<div id="chat">'+D.lines.map(l=>l.me?'<div class="bub me">'+(l.tone?'<span class="tone">'+esc(l.tone)+'</span>':'')+esc(l.text)+'</div>':
    l.who?'<div class="bub them"><span class="who">'+esc(l.who)+'</span>'+esc(trx(l.text))+'</div>':'<div class="bub note">'+esc(l.text)+'</div>').join('')+'</div>';
  if(D.stage==='enc'){const E=G.enc;
    if(E&&E.state==='active'){(E.race==='glb'?[['brush','Gentle','Nudge them aside with a tractor beam'],['swat','Swat','Flick them away with a shield pulse'],['ignore','Calm','Ignore them and sip your tea']]:[['scare','Firm','"Please move along, friends."'],['spare','Mercy','Disable their weapons, then let them go'],['loot','Bully','Disable their engines and loot the hold'],['ignore','Calm','Ignore them']]).forEach(([v,t,l])=>{h+='<button class="btn'+(v==='loot'?' warn':'')+'" data-a="enc-tac" data-v="'+v+'"><span class="tone">'+t+'</span>'+esc(l)+'</button>';});
      if(D.rescue)h+='<button class="btn pri" data-a="press"><span class="tone">Demand</span>"Release them to us. Now."</button>';
      else if(anomFound(E)&&!E.confronted)h+='<button class="btn pri" data-a="confront"><span class="tone">Confront</span>'+esc(confrontLabel(E))+(anomFound(E)==='hack'?' <span class="small">· reveals your hack</span>':'')+'</button>';}
    else h+='<button class="btn pri" data-a="enc-close">Close channel</button>';
    return h;}
  if(D.stage==='tone'){toneSet(D.rid).forEach(tn=>{h+='<button class="btn" data-a="tone" data-v="'+tn.id+'"><span class="tone">'+tn.label+'</span>'+esc(tn.line)+'</button>';});}
  else if(false){h+='<p class="small">Reward: '+favorRewardText(D.offer)+' · takes 1 hold slot · no time limit</p><button class="btn pri" data-a="fav-yes">"Happy to help."</button><button class="btn" data-a="fav-no">"Not this time."</button>';}
  else if(D.stage==='special'){rc.special.options.forEach((o,i)=>{const u=(G.visit.spec||{})[i];h+='<button class="btn" data-a="spec" data-v="'+i+'"'+(u?' disabled style="opacity:.45"':'')+'>'+esc(o.t)+(u?' <span class="small">· done this visit</span>':'')+'</button>';});}
  else{
    const T=G.visit.topics;
    {const nq=((G.visit.news||{})[D.rid]||[]).length;h+='<button class="btn" data-a="topic" data-v="news">"Any news?"'+(nq?' <span class="tone">'+nq+' new</span>':'')+'</button>';}
    h+=btopicHtml(D.rid);
    genericSet(D.rid).forEach(k=>{if(!T[k])h+='<button class="btn" data-a="topic" data-v="'+k+'">'+esc(genericLine(D.rid,k))+'</button>';});
    if(rc.nemesis&&rc.intel&&kn(rc.nemesis).name){const t=rc.nemesis,d=intelScore(t)-intelSold(D.rid);
      if(!T.askintel)h+='<button class="btn" data-a="topic" data-v="askintel"><span class="tone">Ask</span>"What do you know about the '+esc(RACE[t].short)+'?"'+(askIntelCost(D.rid)?' · they may ask ¢'+askIntelCost(D.rid):'')+'</button>';
      if(!T.intel)h+='<button class="btn pri" data-a="topic" data-v="intel"><span class="tone">Offer</span>Share my intel on the '+esc(RACE[t].short)+' (sell) · '+(d>0?'about ¢'+(30+d*25):'nothing new')+'</button>';}
    if(!G.visit.bribed&&G.credits>=bribeCost(D.rid))h+='<button class="btn" data-a="topic" data-v="bribe">Offer a goodwill payment · ¢'+bribeCost(D.rid)+'</button>';
    const gift=giftable(D.rid);if(gift&&!T.gift)h+='<button class="btn" data-a="topic" data-v="gift">Offer a gift of '+esc(RES[gift].name)+'</button>';
    if(D.offer)h+='<p class="small">Favor reward: '+favorRewardText(D.offer)+' · takes 1 hold slot · no time limit</p><button class="btn pri" data-a="fav-yes"><span class="tone">Favor</span>"Happy to help."</button><button class="btn" data-a="fav-no">"Not this time."</button>';
    favs().filter(f=>f.state==='open').forEach(f=>{const ok=f.to===D.rid,K=FAV_KIND[f.kind];if(f.from===D.rid)return;
      h+='<button class="btn'+(ok?' pri':' warn')+'" data-a="fav-give" data-v="'+f.id+'">'+(ok?'<span class="tone">Favor</span>Deliver the ':'<span class="tone">Off-book</span>Hand over the ')+esc(RACE[f.from].short)+' '+esc(K.item.toLowerCase())+(ok?'':' (meant for the '+esc(RACE[f.to].short)+')')+'</button>';});
    if(rc.liar&&G.visit.lied&&G.visit.lied[D.rid]&&!T.callout&&!contraSource(D.rid)){const pf=lieProof(D.rid);h+='<button class="btn'+(pf?' pri':' warn')+'" data-a="topic" data-v="callout"><span class="tone">'+(pf?'Proof':'Bluff')+'</span>"That\'s a lie, and I can prove it."</button>';}
    {const la=leverTarget(D.rid);if(la&&!T.leverage)h+='<button class="btn" data-a="topic" data-v="leverage"><span class="tone">Ally</span>"The '+esc(RACE[la].short)+' will vouch for me."</button>';
     const cs=contraSource(D.rid);if(cs&&!T.callout)h+='<button class="btn pri" data-a="topic" data-v="contradict"><span class="tone">Proof</span>"The '+esc(RACE[cs].short)+' told me otherwise."</button>';
     const tp=tipTarget(D.rid);if(tp&&!T.tip)h+='<button class="btn" data-a="topic" data-v="tip"><span class="tone">Intel</span>"I know where the '+esc(RACE[tp].short)+' live."</button>';}
    if(!T.press)h+='<button class="btn warn" data-a="topic" data-v="press"><span class="tone">Threat</span>"Hand over your best cargo, or else."</button>';
    h+='<button class="btn pri" data-a="go-trade">Open trade channel</button><button class="btn" data-a="close">Close channel</button>';
    {const o=residents(here()).find(x=>x!==D.rid);if(o)h+='<button class="btn" data-a="hail" data-v="'+o+'">Switch channel: '+(kn(o).name?esc(RACE[o].short):'other species')+'</button>';}
  }
  return h;
};
VIEWS.trade=()=>{
  const s=here();let h='<h2>CARGO · TRADE</h2>';
  const m=market();mObserve(s,m);
  if(m.refuse)return h+'<p>'+esc(m.refuse)+'</p>'+cargoTable(null);
  h+='<p class="small">'+esc(m.note)+'</p>';
  h+=refuelBtn();
  h+='<div class="row small"><span class="n">Good</span><span class="q">Hold</span><span style="width:58px;text-align:center">Buy</span><span style="width:58px;text-align:center">Sell</span></div>';
  m.items.forEach(it=>{const have=G.cargo[it.id]||0;const r=RES[it.id];
    h+='<div class="row"><span class="n">'+r.icon+' '+esc(r.name)+(it.tag?'<span class="tag '+(it.tag==='wanted'?'w':'')+'">'+it.tag+'</span>':'')+(it.dem!=null&&it.tag==='wanted'?'<span class="dl'+(it.full?' sat':'')+'">'+demLabel(it.dem)+'</span>':'')+'</span><span class="q">'+have+'</span>'+
    '<button data-a="buy" data-v="'+it.id+'" '+(it.buy==null||G.credits<it.buy||cargoUsed()>=G.cargoMax?'disabled':'')+'>'+(it.buy==null?'—':'¢'+it.buy)+'</button>'+
    '<button data-a="sell" data-v="'+it.id+'" '+(!have?'disabled':'')+'>'+(it.full?'Full':'¢'+it.sell)+'</button></div>';});
  if(Object.values(G.cargo).some(q=>q>0))h+='<button class="btn" data-a="sellbest">Sell all where it\'s best here <span class="small">(this station\'s prices now)</span></button>';
  if(favorCount())h+=cargoTable();
  if(m.items.some(x=>x.full))h+='<p class="small">'+esc(FULL_LINE[act(here())]||'')+'</p>';
  h+='<p class="small">Wanted goods fetch less as a market fills up; demand recovers a little with every warp jump.</p>';
  return h;
};
/* v3.3 Trade Helper: best observed buyer vs what you paid */
function thBest(k){const b=mListings(k).buy[0];if(!b)return null;const P=G.paid&&G.paid[k],cost=P&&P.q?P.c/P.q:null;return{b,m:cost==null?null:Math.round(b.price-cost)};}
function thTag(k){const t=thBest(k);if(!t)return'<span class="th none">no buyer seen yet</span>';const nm=G.systems[t.b.sid].name,age=t.b.age<=0?'seen this turn':'seen '+t.b.age+' turn'+(t.b.age>1?'s':'')+' ago';
  return'<span class="th'+(t.m!=null&&t.m<0?' neg':'')+'">'+(t.m==null?'sells ¢'+t.b.price:'sells '+(t.m>=0?'+':'−')+'¢'+Math.abs(t.m))+' at '+esc(nm)+' ('+age+(t.b.age>=3?', may be outdated':'')+')</span>';}
function sellBestHere(){const s=here(),m=market();if(!m||m.refuse)return;let n=0,c0=G.credits;
  Object.keys(G.cargo).filter(k=>G.cargo[k]>0).forEach(k=>{const it=m.items.find(x=>x.id===k);if(!it||it.full||it.sell==null)return;
    const other=mListings(k).buy.filter(x=>x.sid!==s.id)[0];if(other&&other.price>it.sell)return;
    let guard=99;while(G.cargo[k]>0&&guard--){const q=G.cargo[k];const m2=market(),i2=m2.items.find(x=>x.id===k);if(!i2||i2.full)break;trade('sell',k);if(G.cargo[k]===q)break;n++;}});
  toast(n?'Sold '+n+' unit'+(n>1?'s':'')+' here for ¢'+(G.credits-c0)+' at today\'s prices.':'Nothing in your hold sells best here.',n?'g':'');V.keepScroll=true;renderAll();V.keepScroll=false;}
VIEWS.ach=()=>{const A=G.ach||{};let h='<h2>ACHIEVEMENTS · '+Object.keys(A).length+'/'+ACH.length+'</h2><p class="small">Just for fun, no effect on play.</p>';
  ACH.forEach(([id,n,d,f])=>{const p=Math.min(1,f()||0);h+='<div class="ach'+(A[id]?' got':'')+'"><b>'+(A[id]?'🏅 ':'○ ')+esc(n)+'</b><span class="small">'+esc(d)+(A[id]?' · turn '+A[id]:' · '+Math.floor(p*100)+'%')+'</span></div>';});
  return h+'<button class="btn" data-a="achback">Back to Log</button>';};
/* v3.2 Market Research: only what the player has observed or heard */
function mObserve(s,m){if(!m||m.refuse||!m.items)return;const O=(G.mobs=G.mobs||{});const rid=s.port?null:act(s);const it={};m.items.forEach(x=>{it[x.id]={buy:x.buy,sell:x.full?null:x.sell};});O[s.id]={turn:G.turn,rid,items:it};}
function mLeads(){const out=[];(G.leads||[]).forEach(l=>{Object.keys(RES).forEach(id=>{if(l.text.toLowerCase().replace(/[^a-z]/g,'').includes(RES[id].name.toLowerCase().replace(/[^a-z]/g,'')))out.push({id,rid:l.rid,turn:l.turn,text:l.text});});});
  Object.keys(G.kn||{}).forEach(rid=>{const w=kn(rid).wants;if(w&&Array.isArray(w.v))w.v.forEach(id=>{if(RES[id])out.push({id,rid,turn:null,text:(w.r?'Rumored: ':'')+'the '+RACE[rid].short+' want '+RES[id].name});});});return out;}
function mSeen(){const S=new Set(Object.keys(G.cargo||{}).filter(k=>G.cargo[k]>0));Object.values(G.mobs||{}).forEach(o=>Object.keys(o.items).forEach(k=>S.add(k)));mLeads().forEach(l=>S.add(l.id));return [...S].filter(k=>RES[k]).sort((a,b)=>RES[a].name.localeCompare(RES[b].name));}
function mListings(id){const sel=[],buy=[];Object.entries(G.mobs||{}).forEach(([sid,o])=>{const p=o.items[id];if(!p)return;const x={sid:+sid,rid:o.rid,age:G.turn-o.turn,d:Math.round(dist(G.loc,+sid))};if(p.buy!=null)sel.push({...x,price:p.buy});if(p.sell!=null)buy.push({...x,price:p.sell});});
  sel.sort((a,b)=>a.price-b.price);buy.sort((a,b)=>b.price-a.price);const seen=new Set(buy.map(b=>b.rid));return{sel,buy,leads:mLeads().filter(l=>l.id===id&&!seen.has(l.rid))};}
function mBest(){let best=null;Object.keys(G.cargo||{}).filter(k=>G.cargo[k]>0).forEach(k=>{const L=mListings(k),b=L.buy[0];if(!b)return;const P=G.paid&&G.paid[k],cost=P&&P.q?P.c/P.q:(L.sel[0]?L.sel[0].price:RES[k].base);const m=Math.round(b.price-cost);if(!best||m>best.m)best={k,m,b};});return best;}
function mWho(x){return x.rid?(kn(x.rid).name?RACE[x.rid].short:'Unknown locals'):'Free port';}
function mAge(a){return a<=0?'this turn':'as of '+a+' turn'+(a>1?'s':'')+' ago'+(a>=3?' · prices may have changed':'');}
function marketView(){let h='<h2>MARKET RESEARCH</h2>';if(V.dlg&&V.dlg.rid)h+='<button class="btn" data-st-back="1" data-a="mback">← Back to comms</button>';
  const all=mSeen();if(!all.length)return h+'<p class="small">No market data yet. Open a trade channel or listen for rumors to start building your picture of the lanes.</p>';
  const bt=mBest();if(bt)h+='<div class="mtip"><b>Best trade from here:</b> '+esc(RES[bt.k].name)+' → '+esc(sys(bt.b.sid).name)+' ('+esc(mWho(bt.b))+') ¢'+bt.b.price+' · '+(bt.m>=0?'+':'')+'¢'+bt.m+' per unit vs what you paid · '+esc(mAge(bt.b.age))+'</div>';
  const q=(V.mq||'').toLowerCase(),f=V.mf||'all',hold=k=>(G.cargo[k]||0)>0;
  h+='<input id="mq" class="mq" placeholder="Search goods" value="'+esc(V.mq||'')+'"><div class="mfl">'+[['all','All'],['hold','In hold'],['priced','Priced']].map(([k,l])=>'<button class="mf'+(f===k?' on':'')+'" data-a="mf" data-v="'+k+'">'+l+'</button>').join('')+'</div>';
  const list=all.filter(k=>(!q||RES[k].name.toLowerCase().includes(q))&&(f!=='hold'||hold(k))&&(f!=='priced'||mListings(k).sel.length+mListings(k).buy.length));
  if(!V.mSel||!list.includes(V.mSel))V.mSel=null;
  h+='<div class="mlist">'+list.map(k=>'<button class="mg'+(V.mSel===k?' on':'')+'" data-a="mkt" data-v="'+k+'">'+RES[k].icon+' '+esc(RES[k].name)+(hold(k)?' <em>×'+G.cargo[k]+'</em>':'')+'</button>').join('')+(list.length?'':'<p class="small">No goods match.</p>')+'</div>';
  if(V.mSel){const k=V.mSel,L=mListings(k);const row=(x)=>'<button class="ml" data-a="mapgo" data-v="'+x.sid+'"><span>'+esc(sys(x.sid).name)+' · '+esc(mWho(x))+'</span><b>¢'+x.price+'</b><small>'+x.d+' ly · '+esc(mAge(x.age))+'</small></button>';
    h+='<h3>'+RES[k].icon+' '+esc(RES[k].name)+'</h3><div class="cxh">Sellers (cheapest first)</div>'+(L.sel.map(row).join('')||'<p class="small">No sellers observed.</p>');
    h+='<div class="cxh">Buyers (best price first)</div>'+(L.buy.map(row).join('')||'<p class="small">No buyers observed.</p>');
    if(L.leads.length)h+='<div class="cxh">Leads (no price yet)</div>'+L.leads.map(l=>'<button class="ml lead" data-a="mlog" data-v="'+l.rid+'"><span>'+esc(kn(l.rid).name?RACE[l.rid].short:'Unknown')+'</span><small>'+esc(l.text)+'</small></button>').join('');
    h+='<p class="small">Prices are the last ones you saw. Tap a listing to see it on the map, or a lead to open that race\'s log page.</p>';}
  return h;}
function cargoTable(){const ids=Object.keys(G.cargo).filter(k=>G.cargo[k]>0);const fv=favs().filter(f=>f.state==='open').map(f=>FAV_KIND[f.kind].icon+' '+FAV_KIND[f.kind].item+' (favor)');const all=ids.map(k=>RES[k].icon+' '+RES[k].name+' ×'+G.cargo[k]).concat(fv);return'<p class="small">Hold: '+(all.length?all.join(', '):'empty')+'</p>';}
VIEWS.tactical=()=>{
  const E=G.enc;let h='<h2>TACTICAL</h2>';
  if(!E)return h+'<p>Shields up, weapons cold. No threats on sensors.</p><p class="small">Your ship outclasses anything in this sector. When hostiles appear, how you handle them is a political choice: other races are watching.</p>';
  const who=RACE[E.race]?RACE[E.race].name:SB_PIRATES.short;
  if(E.state==='active'&&E.race==='glb'){
    h+='<p><b>'+esc(E.name)+'</b> (Glubbari) is firing at you. Each shot is roughly a penny thrown at a mountain. Shields: unbothered.</p><div class="say">"SURRENDER, LAND-BLOB! BOW BEFORE THE BOWL!"</div>';
    h+='<button class="btn" data-a="tac" data-v="brush"><span class="tone">Gentle</span>Nudge them aside with a tractor beam</button>';
    h+='<button class="btn" data-a="tac" data-v="swat"><span class="tone">Swat</span>Flick them away with a shield pulse</button>';
    h+='<button class="btn" data-a="tac" data-v="ignore"><span class="tone">Calm</span>Ignore them and sip your tea</button>';
  } else if(E.state==='active'){
    h+='<p><b>'+esc(E.name)+'</b> ('+esc(who)+') is posturing nearby. Their weapons can\'t breach your shields.</p>';
    h+='<button class="btn" data-a="tac" data-v="scare"><span class="tone">Firm</span>Hail: "Please move along, friends."</button>';
    h+='<button class="btn warn" data-a="tac" data-v="loot"><span class="tone">Bully</span>Disable their engines and loot the hold</button>';
    h+='<button class="btn" data-a="tac" data-v="spare"><span class="tone">Mercy</span>Disable their weapons, then spare them</button>';
    h+='<button class="btn" data-a="tac" data-v="ignore"><span class="tone">Calm</span>Ignore them and hold position</button>';
  } else h+='<p>'+esc(E.result||'')+'</p><button class="btn pri" data-a="tac-done">Carry on</button>';
  return h;
};
VIEWS.log=()=>{
  let h='<h2>COMPUTER LOG</h2>';
  if(V.logSel)return h+logEntry(V.logSel);
  if(V.logFrom)h+='<button class="btn pri" data-a="logret">‹ Back to conversation</button>';
  h+='<button class="btn" data-a="achopen">🏅 Achievements · '+Object.keys(G.ach||{}).length+'/'+ACH.length+'</button>';
  h+='<div class="cxh">YOUR PROFILE</div><p class="small"><b>Envoy of the Terran Concord</b> · humans of Earth · Turn '+G.turn+' · ¢'+G.credits+' · Hull '+(G.hull==null?100:G.hull)+'%'+(G.miles&&Object.keys(G.miles).length?' · Title: '+MILES.filter(m=>G.miles[m[0]]).pop()[2]:'')+'</p>';
  h+=questsHtml();
  const n=foundCount(),T=SB_RACES.length;G.miles=G.miles||{};
  h+='<div class="cxh">COMPENDIUM · Found '+n+'/'+T+'</div><div class="mbar"><i style="width:'+(n*100/T).toFixed(1)+'%"></i></div><p class="small">Milestones: '+MILES.map(([m,cr,t])=>(G.miles[m]?'✓ ':'')+m+' (¢'+cr+')').join(' · ')+'</p>';
  const ord=SB_RACES.map(r=>r.id).sort((a,b)=>{const g=x=>kn(x).portrait?0:G.kn[x]?1:2;return g(a)-g(b);});
  ord.forEach(id=>{const k=G.kn[id]?kn(id):{},rc=RACE[id];
    if(k.portrait){const hm=homeOf(id),kl=k.loc&&!k.loc.r;h+='<div class="lrw"><button class="lr" data-a="logsel" data-v="'+id+'"><img src="'+rc.img+'" alt=""><div><strong>'+esc(raceName(id))+'</strong>'+esc(rc.kind)+'<br>'+cap(tier(id))+' ('+Math.round(G.races[id].rep)+') · Home: '+(kl?esc(hm.name)+(hm.co?' (shared)':''):'???')+'</div></button>'+(kl?'<button class="cx mapgo" data-a="mapgo" data-v="'+hm.id+'">◎ Map</button>':'')+'</div>';}
    else if(G.kn[id]&&(k.name||k.loc)){const src=(G.rsrc&&G.rsrc[id])||'Unknown source';h+='<button class="lr rum" data-a="logsel" data-v="'+id+'"><span class="pt sil">?</span><div><strong>'+(k.name?esc(raceName(id)):'Unnamed signal')+' <span class="tag">Rumored</span></strong>Source: '+esc(src)+'<br>Location hint: '+(k.loc?esc(k.loc.v)+(k.loc.r?' (unconfirmed)':''):'somewhere in the dark')+'</div></button>';}
    else h+='<div class="lr unk0"><span class="pt sil">?</span><div><strong>???</strong><span class="unk">Undiscovered species</span></div></div>';});
  return h;
};
const UNK='<span class="unk">???</span>';
function spark(vals,w,h,col){if(vals.length<2)return'';const mn=Math.min(...vals),mx=Math.max(...vals),r=mx-mn||1;
  const pts=vals.map((v,i)=>(i*(w-4)/(vals.length-1)+2).toFixed(1)+','+(h-2-(v-mn)*(h-4)/r).toFixed(1)).join(' ');
  return'<svg class="spk" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><polyline fill="none" stroke="'+(col||'#7fd0ff')+'" stroke-width="1.6" points="'+pts+'"/></svg>';}
function relRows(id,f){const k=kn(id)[f];if(!k)return UNK;if(!k.v.length)return'<span class="small">None known</span>'+(k.r?'<span class="tag">rumored</span>':'');
  return k.v.map(x=>{const kx=kn(x);const nm=kx.name?RACE[x].short:'???';const rp=kx.portrait?tier(x)+' '+Math.round(G.races[x].rep):'???';
    return'<button class="cx" data-a="logsel" data-v="'+x+'"><b>'+esc(nm)+'</b><span>'+esc(rp)+'</span></button>';}).join('')+(k.r?'<span class="tag">rumored</span>':'');}
function loreRows(id){const rc=RACE[id],k=kn(id),m=(G.mem||{})[id]||{},home=homeOf(id),T=(G.trades||{})[id]||[];
  const L=[['Leader',(rc._speaker||rc.speaker)+(rc.alt?' · also: '+rc.alt.speaker:''),!!k.portrait||!!(G.hackLore||{})[id]],['Nature',rc.kind,!!k.portrait],['Temperament',rc.hint,m.n>=1],
    ['Voice',{sly:'Silver-tongued; may bend the truth.',martial:'Blunt; respects strength.',gentle:'Soft-spoken; feels harm deeply.',formal:'Measured and protocol-minded.'}[voice(rc)],m.n>=2||!!(k.allies&&!k.allies.r)],
    ['Known ships',knownShips(id).map(([n,o])=>n+' ('+o.how+')').join('; '),knownShips(id).length>0],
    ['Sworn rival',rc.nemesis&&RACE[rc.nemesis]?RACE[rc.nemesis].short:'None',!!(rc.nemesis&&(k.enemies||G.intelSold&&G.intelSold[id]!=null))||(!rc.nemesis&&!!k.enemies)],
    ['Honesty',rc.liar?'Known to lie to outsiders.':'No record of deceit.',!!m.caught||(G.notes&&(G.notes[id]||[]).length>=2)],
    ['Commerce',T.length?T.length+' trade entries on file.':'',T.length>0]];
  return L.map(([a,b,ok])=>'<b>'+a+'</b><span>'+(ok&&b?esc(b):UNK)+'</span>').join('');}
function logEntry(id){
  const k=kn(id),rc=RACE[id],st=G.races[id];
  let h=(V.logFrom?'<button class="btn pri" data-a="logret">‹ Back to conversation</button>':'')+'<button class="btn" data-a="logback">‹ All species</button>';
  h+=k.portrait&&rc.alt?'<div style="display:flex;gap:6px"><figure style="flex:1;margin:0"><img class="big" data-a="pzoom" src="'+rc.img+'" alt="'+esc(rc._speaker)+'"><figcaption class="small">'+esc(rc._speaker)+'</figcaption></figure><figure style="flex:1;margin:0"><img class="big" data-a="pzoom" src="'+rc.alt.img+'" alt="'+esc(rc.alt.speaker)+'"><figcaption class="small">'+esc(rc.alt.speaker)+'</figcaption></figure></div>':k.portrait?'<img class="big" data-a="pzoom" src="'+rc.img+'" alt="'+esc(rc.short)+'">':'<div class="pt" style="width:100%;height:120px">?</div>';
  h+='<h2 style="margin-top:8px">'+esc(raceName(id))+'</h2>';
  // reputation
  const RL=(G.repLog||{})[id]||[];
  h+='<h3 class="cxh">REPUTATION</h3><div class="kv"><b>Standing</b><span>'+(k.portrait?cap(tier(id))+' ('+Math.round(st.rep)+')':UNK)+'</span>';
  h+='<b>History</b><span>'+(k.portrait&&RL.length?spark(RL.map(x=>x[1]),150,28,'#ffcf6a')+'<br><span class="small">'+RL.slice(-6).map(x=>'T'+x[0]+': '+x[1]).join(' · ')+'</span>':UNK)+'</span></div>';
  // home
  const hs=homeOf(id),co=hs.owner===id?hs.co:hs.owner;
  h+='<h3 class="cxh">HOME</h3><div class="kv"><b>'+(rc.nomad?'Last seen':'Homeworld')+'</b><span>'+(kn(id).loc?fieldHtml(id,'loc',v=>v):UNK)+'</span>';
  h+='<b>Shares it with</b><span>'+(co?(kn(id).loc&&!kn(id).loc.r?'<button class="cx" data-a="logsel" data-v="'+co+'"><b>'+esc(kn(co).name?RACE[co].short:'???')+'</b><span>'+(kn(co).portrait?tier(co)+' '+Math.round(G.races[co].rep):'???')+'</span></button>':UNK):(kn(id).loc?'No one':UNK))+'</span></div>';
  // facts
  h+='<h3 class="cxh">FACTS</h3><div class="kv">';
  h+='<b>Tech level</b><span>'+fieldHtml(id,'tech',v=>TECH_NAMES[v]+' ('+v+'/5), '+techCompare(v))+'</span>';
  h+='<b>Wants</b><span>'+fieldHtml(id,'wants',resList)+'</span>';
  h+='<b>Planet has</b><span>'+fieldHtml(id,'rich',resList)+'</span>';
  h+='<b>Hidden want</b><span>'+fieldHtml(id,'secret',v=>RES[v].icon+' '+RES[v].name)+'</span>';
  h+='<b>Taboo good</b><span>'+fieldHtml(id,'taboo',v=>RES[v].icon+' '+RES[v].name)+'</span></div>';
  h+=noteBox('r:'+id);
  h+='<h3 class="cxh">LORE</h3><div class="kv">'+loreRows(id)+'</div>';
  h+='<h3 class="cxh">ALLIES</h3><div class="cxl">'+relRows(id,'allies')+'</div><h3 class="cxh">ENEMIES</h3><div class="cxl">'+relRows(id,'enemies')+'</div>';
  // notes
  const N=(G.notes||{})[id]||[];
  h+='<h3 class="cxh">KEY NOTES</h3>'+(N.length?N.slice().reverse().map(n=>'<div class="hist'+(n.bad?' bad':'')+'">T'+n.t+': '+esc(n.text)+'<br><span class="small">Source: '+esc(n.src||'?')+(n.bad?' · <b class="lie">DISPROVEN</b> by '+esc(n.by):n.claim?' · unverified':'')+'</span></div>').join(''):'<p class="small">???</p>');
  // trades
  const T=(G.trades||{})[id]||[];
  h+='<h3 class="cxh">TRADES</h3>';
  if(!T.length)h+='<p class="small">???</p>';
  else{const goods={};T.forEach(t=>{(goods[t.id]=goods[t.id]||[]).push(t);});
    h+='<table class="cxt"><tr><th>Good</th><th>Prices</th><th>Trend</th></tr>'+Object.entries(goods).map(([g,a])=>'<tr><td>'+RES[g].icon+' '+esc(RES[g].name)+'</td><td>'+a.slice(-4).map(t=>(t.k==='buy'?'B':'S')+t.p).join(' ')+'</td><td>'+spark(a.map(t=>t.p),60,18)+'</td></tr>').join('')+'</table>';
    h+='<table class="cxt"><tr><th>Turn</th><th>Deal</th><th>Qty</th><th>Price</th></tr>'+T.slice(-30).reverse().map(t=>'<tr><td>T'+t.t+'</td><td>'+(t.k==='buy'?'Bought ':'Sold ')+esc(RES[t.id].name)+'</td><td>'+t.q+'</td><td>¢'+t.p+'</td></tr>').join('')+'</table>';}
  h+='<h3 class="cxh">DEALINGS</h3>';
  const H=G.hist[id]||[];h+=H.length?H.slice().reverse().map(x=>'<div class="hist">'+esc(x)+'</div>').join(''):'<p class="small">No dealings yet.</p>';
  return h;
}
const cap=s=>s[0].toUpperCase()+s.slice(1);
function techCompare(v){const known=SB_RACES.map(r=>kn(r.id).tech).filter(Boolean).map(x=>x.v);const avg=known.length?known.reduce((a,b)=>a+b,0)/known.length:3;
  return v>avg+.4?'more advanced than most known races':v<avg-.4?'less advanced than most known races':'about average among known races';}
function sysLabel(s){if(s.port)return'Free port';if(s.owner){const k=kn(s.owner).loc;if(k&&k.v===s.name)return (s.co&&kn(s.co).loc&&!kn(s.co).loc.r?RACE[s.owner].short+' & '+RACE[s.co].short+' shared world':RACE[s.owner].short+' homeworld'+(k.r?' (rumored)':''));}
  const rum=SB_RACES.find(r=>{const k=kn(r.id).loc;return k&&k.r&&k.v===s.name;});if(rum)return rum.short+' homeworld (rumored)';
  return s.scan?(s.owner?'Inhabited':'Uninhabited'):'Unexplored';}

/* ---------------- helm ---------------- */
function dist(a,b){return Math.hypot(sys(a).x-sys(b).x,sys(a).y-sys(b).y);}
function fuelCost(d){return Math.max(4,Math.round(d*42*(G&&G.up&&G.up.engines?.75:1)*(G&&G.hull!=null&&G.hull<50?1.15:1)));}
function organicLayout(N){const r=rng(0x5B320),W=364,H=Math.round(388*Math.max(2.3,Math.ceil(N/3)*.165))-24,P=[],MIN=48;
  const ok=(x,y,m)=>x>8&&x<W-70&&y>14&&y<H-24&&P.every(p=>Math.hypot(p.x-x,p.y-y)>=m&&(Math.abs(p.y-y)>=24||Math.abs(p.x-x)>=112));
  const voids=[];for(let i=0;i<7;i++)voids.push({x:60+r()*(W-120),y:H*(.07+i*.14)+(r()-.5)*50,r:62+r()*30});
  const inVoid=(x,y)=>voids.some(v=>Math.hypot(v.x-x,v.y-y)<v.r);
  P.push({x:W*.45,y:H*.5});
  let guard=0;while(P.length<N&&guard++<5000){const cx=20+r()*(W-100),cy=20+r()*(H-50);if(inVoid(cx,cy)||!ok(cx,cy,MIN*2.6))continue;
    const k=Math.min(N-P.length,3+Math.floor(r()*4));let placed=0;for(let t=0;t<60&&placed<k;t++){const a=r()*6.283,d=placed?MIN+r()*10:0,x=cx+Math.cos(a)*d*1.15,y=cy+Math.sin(a)*d*.75;if(!inVoid(x,y)&&ok(x,y,MIN)){P.push({x,y});placed++;}}}
  for(let m=MIN;P.length<N;m-=2){for(let t=0;t<4000&&P.length<N;t++){const x=r()*W,y=r()*H;if((m<36||!inVoid(x,y))&&ok(x,y,m))P.push({x,y});}}
  organicLayout.voids=voids.map(v=>({x:v.x/W,y:v.y/H,r:v.r}));return P.map(p=>({x:p.x/W,y:p.y/H}));}
function galaxyFeatures(P,w,h){const N=G.systems.length;if(!organicLayout.voids||organicLayout.n!==N){organicLayout(N);organicLayout.n=N;}
  const r=rng(0xA57E5),F=[];const pal=[[120,90,200],[60,140,200],[200,90,150],[70,170,150],[210,140,80]];
  organicLayout.voids.forEach((v,i)=>{const cx=12+v.x*(w-24),cy=12+v.y*(h-24);let rad=v.r;G.systems.forEach(s=>{const[px,py]=P(s);rad=Math.min(rad,Math.hypot(px-cx,py-cy)-22);});if(rad<28)return;
    const kind=i%2?'rocks':'neb';const f={kind,x:cx,y:cy,r:rad,c:pal[i%pal.length],rocks:[]};
    if(kind==='rocks')for(let k=0;k<44;k++){const a=r()*6.283,d=Math.sqrt(r())*rad*.85;f.rocks.push([cx+Math.cos(a)*d*1.1,cy+Math.sin(a)*d*.75,1.4+r()*r()*4.5,r()*6.283]);}
    else for(let k=0;k<4;k++)f.rocks.push([cx+(r()-.5)*rad*.9,cy+(r()-.5)*rad*.7,rad*(.45+r()*.4)]);
    F.push(f);});return F;}
function drawFeatures(x,F){F.forEach(f=>{if(f.kind==='neb'){f.rocks.forEach(([px,py,rr])=>{const gr=x.createRadialGradient(px,py,0,px,py,rr);gr.addColorStop(0,'rgba('+f.c.join(',')+',.3)');gr.addColorStop(1,'rgba('+f.c.join(',')+',0)');x.fillStyle=gr;x.beginPath();x.arc(px,py,rr,0,7);x.fill();});}
  else{x.fillStyle='#6d7286';f.rocks.forEach(([px,py,s,a])=>{x.save();x.translate(px,py);x.rotate(a);x.beginPath();x.moveTo(-s,-s*.4);x.lineTo(-s*.2,-s);x.lineTo(s,-s*.3);x.lineTo(s*.6,s*.8);x.lineTo(-s*.7,s*.6);x.closePath();x.fill();x.restore();});}});}
function routeCtrl(a,b,F){let cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
  for(const f of F){const t=Math.max(0,Math.min(1,((f.x-a[0])*dx+(f.y-a[1])*dy)/(L*L))),qx=a[0]+dx*t,qy=a[1]+dy*t,d=Math.hypot(f.x-qx,f.y-qy);
    if(d<f.r+6){const side=((f.x-qx)*nx+(f.y-qy)*ny)>0?-1:1,push=Math.min((f.r+14-d)*2,L*.6,170);cx+=nx*side*push;cy+=ny*side*push;}}return[cx,cy];}
function drawMap(){
  const c=$('map');if(!c)return;const w=c.clientWidth,h=Math.round(w*Math.max(2.3,Math.ceil(G.systems.length/3)*.165));c.style.height=h+'px';c.width=w*DPR;c.height=h*DPR;const x=c.getContext('2d');x.setTransform(DPR,0,0,DPR,0,0);
  x.fillStyle='#040814';x.fillRect(0,0,w,h);x.strokeStyle='#10203d';for(let i=1;i<8;i++){x.beginPath();x.moveTo(i*w/8,0);x.lineTo(i*w/8,h);x.stroke();x.beginPath();x.moveTo(0,i*h/8);x.lineTo(w,i*h/8);x.stroke();}
  const P=s=>[12+s.x*(w-24),12+s.y*(h-24)];
  const cur=P(here());const GF=galaxyFeatures(P,w,h);drawFeatures(x,GF);V.mapF=GF;
  if(V.sel!=null&&V.sel!==G.loc){const p=P(sys(V.sel)),q=routeCtrl(cur,p,GF);V.mapRoute=[cur,q,p];x.setLineDash([4,4]);x.strokeStyle='#ffcf6a';x.lineWidth=1.5;x.beginPath();x.moveTo(cur[0],cur[1]);x.quadraticCurveTo(q[0],q[1],p[0],p[1]);x.stroke();x.setLineDash([]);}else V.mapRoute=null;
  x.font='10px system-ui,sans-serif';x.textBaseline='middle';const LR=[];
  G.systems.forEach(s=>{const [px,py]=P(s);const lab=sysLabel(s);const pal=PAL[s.type]||PAL.terran;
    x.fillStyle=s.port?'#ffcf6a':'rgb('+pal[2].join(',')+')';x.beginPath();x.arc(px,py,s.port?5:4,0,7);x.fill();
    if(s.id===G.loc){x.strokeStyle='#7fd0ff';x.lineWidth=2;x.beginPath();x.arc(px,py,9,0,7);x.stroke();}
    if(s.id===V.sel){x.strokeStyle='#ffcf6a';x.lineWidth=1.5;x.beginPath();x.arc(px,py,12,0,7);x.stroke();}
    const two=/homeworld/.test(lab),t2=two?lab.replace(' homeworld',''):'';let tx=s.name;x.font='10px system-ui,sans-serif';
    const W2=()=>Math.max(x.measureText(tx).width,two?x.measureText(t2).width:0);
    const bad=l=>{const ww=W2(),r={l:l-2,r:l+ww+2,t:py-7,b:py+(two?16:5)};if(r.l<1||r.r>w-1)return true;
      if(LR.some(q=>q.l<r.r&&r.l<q.r&&q.t<r.b&&r.t<q.b))return true;
      return G.systems.some(o=>{if(o===s)return false;const[ox,oy]=P(o);return ox>r.l-5&&ox<r.r+5&&oy>r.t-5&&oy<r.b+5;});};
    let lx=px+8;if(bad(lx)){const L2=px-8-W2();if(!bad(L2))lx=L2;else{x.font='9px system-ui,sans-serif';if(!bad(lx));else if(!bad(px-8-W2()))lx=px-8-W2();else while(tx.length>4&&bad(lx)){tx=tx.slice(0,-2)+'…';}}}
    const ww=W2();LR.push({id:s.id,tx,px,py,l:lx-2,r:lx+ww+2,t:py-7,b:py+(two?16:5)});
    x.fillStyle=s.id===G.loc?'#bfe3ff':'#8ea3c8';x.fillText(tx,lx,py-1);
    if(two){x.fillStyle=/rumored/.test(lab)?'#c9a050':'#7fe7a8';x.fillText(t2,lx,py+10);}
  });
  V.mapLR=LR;c.onclick=e=>{const r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let best=null,bd=30;G.systems.forEach(s=>{const [px,py]=P(s);const d=Math.hypot(px-mx,py-my);if(d<bd){bd=d;best=s.id;}});
    if(best!=null){V.sel=best;sfx('tap');renderAll();setTimeout(()=>{const b=document.querySelector('[data-a=warp],[data-a=limp]');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});},50);}};
}
function warpTo(id,limp){
  G.prevLoc=G.loc;
  const d=dist(G.loc,id);G.fuel=Math.max(0,G.fuel-(limp?G.fuel:fuelCost(d)));G.loc=id;G.turn++;V.sel=null;V.dlg=null;G.visit={id:G.turn,topics:{},tradeRep:0};V.lastScan=null;nomadDrift();processGossip();
  lifeTick();V.warpT=performance.now()+1300;sfx('warp');V.view='helm';renderAll();
  setTimeout(()=>{arrive();if(V.towPending||(!here().port&&G.fuel<4)){const w=V.towPending||'tanks empty';V.towPending=null;friendlyTow(w);commit();}},1300);
}
function arrive(){
  let s=here();
  if(s.owner==='kth'&&!((G.q||{}).firstlight&&G.q.firstlight.done)&&!G.translate){damage(5,'Kthrax swarm warning');if(G.prevLoc!=null)G.loc=G.prevLoc;toast('Danger zone: the Kthrax swarm drives you back. You retreat safely. (Their patterns can be learned from the Hoothvale.)','b');s=here();renderAll();return;}
  if(s.port&&G.credits>=DOCK_FEE&&s.name!=='Haven Station'){G.credits-=DOCK_FEE;toast('Docking fee: ¢'+DOCK_FEE+'.');}
  if(!s.port&&Math.random()<(V.forceHazard?1:.15))damage(3+Math.floor(Math.random()*5),pick(Math.random,['micrometeor storm','ion squall','gravity shear','debris field']));
  if(s.port)G.morale=Math.min(100,(G.morale==null?80:G.morale)+10);
  if(s.port){if(G.fuel<G.fuelMax){G.fuel=G.fuelMax;toast('Port tenders top up your fuel. No charge.','g');}}
  if(s.owner&&kn(s.owner).loc&&kn(s.owner).loc.r){ if(kn(s.owner).loc.v===s.name)toast('Rumor confirmed: '+RACE[s.owner].short+' homeworld.','g'); }
  SB_RACES.forEach(r=>{const k=kn(r.id).loc;if(k&&k.r&&k.v===s.name&&!residents(s).includes(r.id)){delete kn(r.id).loc;toast('Rumor about the '+r.short+' homeworld proved false.','b');}});
  if(s.owner&&(kn(s.owner).loc||s.scan))know(s.owner,'loc');
  st().vis[s.id]=1;
  if(!s.port&&Math.random()<.3)spawnEncounter();
  if(!G.enc&&!V.noEvt)travelEvent(V.forceEvt);
  commit();
}
/* ---- ship knowledge, scans, hacks (v3.2.0) ---- */
const SHIP_RANK={Rumored:0,Hacked:1,Encountered:2,Scanned:3};
function shipLearn(r,n,how){if(!RACE[r]||!n)return;const S=(G.ships=G.ships||{})[r]=(G.ships[r]||{});const o=S[n],k=how.split(' ')[0];if(!o||SHIP_RANK[k]>SHIP_RANK[o.how.split(' ')[0]])S[n]={how,t:G.turn};}
function knownShips(r){return Object.entries((G.ships||{})[r]||{});}
function hstr(s){let h=7;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function ourTech(){return Math.min(5,3+(G.up&&G.up.scanner?1:0));}
function hackRisk(rid){const t=G.races[rid].tech;let p=[0,2,5,15,30,45][t]||15;if(G.up&&G.up.scanner)p=Math.max(1,p-8);return p;}
function shipScan(E){const r=E.race,rc=RACE[r]||SB_PIRATES,st=G.races[r],t=st?st.tech:2,f=rng(hstr(E.name+r));
  const cls=r==='glb'?'Fishbowl skiff':['Corvette','Frigate','Courier','Light cruiser','Armed hauler','Raider'][Math.floor(f()*6)];
  const crew=r==='glb'?1+Math.floor(f()*3):6+Math.floor(f()*(10+t*8));
  const life=r==='glb'?crew+' Glubbari (very excited), 1 snail':crew+' '+(RACE[r]?rc.short:'mixed-species')+' life signs'+(f()<.3?', 1 unidentified':'');
  const sh=r==='glb'?3:Math.min(99,25+t*12+Math.floor(f()*12));
  const thr=r==='glb'?'Negligible (bubble cannons)':['Negligible','Low','Moderate','High','Severe'][Math.min(4,Math.max(0,t-1+((rc.respectsStrength||0)>.7?1:0)))];
  const fuel=30+Math.floor(f()*65);
  const C=['sublight drive','warp coil','cargo bay','long-range sensors','cloaking field','tractor beam','point defense','boarding pods','medical bay'];const cap=[];
  for(let i=0;i<2+Math.min(3,t-1);i++){const c=C[Math.floor(f()*C.length)];if(!cap.includes(c))cap.push(c);}
  if(r==='glb')cap.splice(0,cap.length,'paddle wheel','snack locker','very loud horn');
  const A=E.anom,xs=A&&(A.ty==='captive'||A.ty==='stowaway'||A.ty==='human')?'1 '+anomSpecies(A):'';
  const life2=r==='glb'?life:crew+' '+(RACE[r]?rc.short:'mixed-species')+(xs?', '+xs:'');
  return{cls,life:life2,crew,sh,thr,fuel,cap,t,hidden:A&&A.ty==='hidden'};}
function doShipScan(){const E=G.enc;if(!E||E.scan)return;E.scan=shipScan(E);V.scanUntil=performance.now()+1500;sfx('scan');
  if(RACE[E.race]){shipLearn(E.race,E.name,'Scanned');know(E.race,'name');know(E.race,'tech');hist(E.race,'Scanned their ship '+E.name+' ('+E.scan.cls+').');note(E.race,'Ship scan: the '+E.name+' is a '+E.scan.cls.toLowerCase()+', threat '+E.scan.thr.toLowerCase()+'.','Science scan');}
  toast('Scan complete: the '+E.name+'. Log updated.','g');commit();}
function doHack(){const E=G.enc,rid=E&&E.race;if(!E||!E.scan||E.hack||!RACE[rid])return;const rc=RACE[rid],p=hackRisk(rid);
  const caught=Math.random()*100<p;E.hack={caught,p,got:[]};sfx('scan');
  if(caught){addRep(rid,-8,'caught hacking their ship');hist(rid,'Caught hacking their ship '+E.name+'.');
    E.hack.line=(rc._speaker||rc.speaker)+': "'+(rc.id==='glb'?'HEY! That is OUR computer! Rude! RUDE! We are telling everyone!':['You crawl through our systems like vermin? We will remember this, Captain.','Intrusion detected and traced to you. Do not mistake our patience for weakness.','Our firewalls caught your fingers in the till. Keep your hands off our ships.'][hstr(rid)%3])+'"';
    commit();return;}
  const k=kn(rid),G2=E.hack.got;
  rc.ships.filter(n=>n!==E.name&&!((G.ships||{})[rid]||{})[n]).slice(0,2).forEach(n=>{shipLearn(rid,n,'Hacked from the '+E.name);G2.push('Fleet roster: the '+n);});
  ['wants','rich','allies','loc'].filter(f=>!k[f]||k[f].r).slice(0,2).forEach(f=>{know(rid,f);G2.push({wants:'What they want to buy',rich:'What their world sells',allies:'Who their allies are',loc:'Where their home is'}[f]);});
  (G.hackLore=G.hackLore||{})[rid]=1;{const C=shipCargo(E),A=E.anom;E.hack.cargo=C;E.hack.manifest=E.scan.crew+' '+rc.short+' crew listed'+(A?{captive:'; 1 '+anomSpecies(A)+' listed as "cargo"',human:'; 1 Human listed as "passenger, unpaid"',stowaway:'; no record of the '+anomSpecies(A)+' life sign',hidden:'; hold section 7 sealed, unlisted',contraband:'; '+RES[A.good].name+' logged off the books'}[A.ty]:'');}G2.push('Leader file: '+(rc._speaker||rc.speaker));G2.push('Culture notes: '+rc.kind);
  note(rid,'Hacked the '+E.name+': fleet roster, trade data and leader file copied.','Ship computer');hist(rid,'Quietly copied data from their ship '+E.name+'.');commit();}
const ANOM_P={base:.18};
function rollAnom(race,force){const rc=RACE[race];if(!rc)return null;const p=rc.slavers?.6:race==='glb'?.15:.15+(hstr(race)%11)/100;if(!force&&Math.random()>=p)return null;
  const others=SB_RACES.filter(x=>x.id!==race&&x.id!=='glb');const ty=force||(rc.slavers?'captive':pick(Math.random,['captive','stowaway','human','hidden','contraband']));
  const who=ty==='captive'||ty==='stowaway'?pick(Math.random,others).id:null;return{ty,who,good:pick(Math.random,SB_RES).id};}
function anomSpecies(a){return a.ty==='human'?'Human':a.who?RACE[a.who].short:'';}
function shipCargo(E){const f=rng(hstr(E.name+'cargo')),st=G.races[E.race],poor=f()<.25;const H={};const n=poor?1:2+Math.floor(f()*3);
  for(let i=0;i<n;i++){const id=SB_RES[Math.floor(f()*SB_RES.length)].id;H[id]=(H[id]||0)+(poor?1+Math.floor(f()*2):3+Math.floor(f()*(6+(st?st.tech:2)*3)));}
  if(E.anom&&(E.anom.ty==='hidden'||E.anom.ty==='contraband'))H[E.anom.good]=(H[E.anom.good]||0)+4;return{H,poor};}
function anomFound(E){return E&&E.anom&&((E.scan&&E.anom.ty!=='contraband')||(E.hack&&!E.hack.caught))?(E.scan&&E.anom.ty!=='contraband'?'scan':'hack'):null;}
function confrontLabel(E){const a=E.anom,rc=RACE[E.race],n=E.scan?E.scan.crew:'';
  if(anomFound(E)==='scan'){if(a.ty==='hidden')return'"Our scan shows a shielded compartment in your hold. What are you hiding?"';
    return'"Our scan shows '+n+' of your people and one '+anomSpecies(a)+' aboard. What\'s the story?"';}
  if(a.ty==='contraband')return'"Your manifest lists '+RES[a.good].name+' you did not declare. Care to explain?"';
  return'"Your manifest has an extra entry. Who else is aboard?"';}
function confront(){const E=G.enc,rid=E.race,rc=RACE[rid],a=E.anom,src=anomFound(E);if(!a||E.confronted||!src)return;E.confronted=1;st().anom=1;
  me(confrontLabel(E),'Confront');markSpoke(rid);const v=voice(rc),sp=rc.speaker;const out=t=>V.dlg.lines.push({who:sp,text:t});const nar=t=>V.dlg.lines.push({who:'',text:t});
  if(src==='hack'&&(v==='formal'||v==='martial'||rc.hatesBullies>=.6)){addRep(rid,-4,'realized you hacked them');nar('They realize you could only know that from their own computer.');out('"You were inside our systems? That is a violation, Captain."');}
  const S=anomSpecies(a);let res;
  if(a.ty==='captive'||a.ty==='human'){const lie=rc.liar||rc.slavers;
    if(rc.slavers){out('"Cargo. Paid for and ours. Mind your own hold."');res='rescue-demand';}
    else if(v==='martial'){out('"A prisoner of war. Our business, not yours."');addRep(rid,-1,'pressed about a prisoner');res='rescue-demand';}
    else if(lie){out('"Life signs? Your sensors must be faulty. There is no one else here."');nar('Their story does not match the scan.');res='rescue-demand';}
    else{out('"We pulled a '+S+' from a wreck. They are hurt and want to go home. Would you take them?"');res='rescue';}}
  else if(a.ty==='stowaway'){if(v==='sly'){out('"A stowaway? Keep it quiet and here, take this for your trouble."');G.credits+=40;nar('They pay you ¢40 to forget it.');}
    else{out('"A stowaway? We had no idea." A pause. "Ah. They say they have heard things."');nar('Intel from the stowaway: '+favorIntel()+'.');}}
  else{const R=RES[a.good].name;if(v==='sly'){out('"Some '+R+' for you, and we never spoke of it?"');const q=addCargo(a.good,2);nar(q?'They send over '+q+' '+R+'.':'Your hold is full; they shrug.');}
    else if(v==='martial'){out('"Search us and find out what happens."');nar('They will not budge. Nothing else comes of it.');}
    else{out('"Undeclared '+R+'. We were going to trade it quietly. We could sell you some, cheap."');addLead(rid,'We have extra '+R+' to sell, quietly.');nar('A trade lead: the '+rc.short+' have extra '+R+'.');}}
  if(res==='rescue'||res==='rescue-demand'){const to=a.who||null;
    if(res==='rescue-demand'){V.dlg.rescue=1;nar(rc.slavers?'The '+rc.short+' are slavers. You could press them to release the captive.':'You could press them to release the '+S+'.');}
    else freeCaptive(E);}
  hist(rid,'Confronted the '+E.name+' about '+(a.ty==='hidden'||a.ty==='contraband'?'its cargo':'someone aboard')+'.');commit();}
function freeCaptive(E){const a=E.anom,nar=t=>V.dlg.lines.push({who:'',text:t});V.dlg.rescue=0;
  if(a.who){const f={id:'r'+Date.now().toString(36),from:a.who,to:a.who,kind:'prisoner',rescue:1,credits:100,intel:false,state:'open',t:G.turn};favs().push(f);if(!kn(a.who).name)kn(a.who).name={v:true,r:false};
    nar('The '+RACE[a.who].short+' captive comes aboard. Return them to '+sys(G.races[a.who].home).name+' (Missions).');}
  else{G.credits+=60;nar('The lone human comes aboard, grateful, and pays ¢60 from a hidden money belt.');}
  sfx('ok');}
function pressRelease(){const E=G.enc,rid=E.race,rc=RACE[rid];me('"Release them to us. Now."','Demand');V.dlg.rescue=0;
  const ok=rc.respectsStrength>=.4||G.races[rid].tech<=ourTech();
  if(ok){V.dlg.lines.push({who:rc.speaker,text:'"Fine. Take them. They were more trouble than they were worth."'});addRep(rid,-3,'forced to give up a captive');freeCaptive(E);if(E.anom.who)addRep(E.anom.who,3,'you rescued one of theirs');}
  else{V.dlg.lines.push({who:rc.speaker,text:'"No. Leave, Captain, while you still can."'});V.dlg.lines.push({who:'',text:'They refuse. You note their ship in the Log.'});}
  commit();}
function encScienceHtml(){const E=G.enc;if(!E||E.state!=='active')return'';const isR=!!RACE[E.race];let h='<h3 class="cxh">CONTACT · '+esc(E.name.toUpperCase())+'</h3>';
  if(!E.scan)return h+'<p class="small">An unknown vessel is in sensor range. A passive scan reveals its class, crew, defenses and capabilities. Free and undetectable.</p><button class="btn pri" data-a="escan">Scan the '+esc(E.name)+'</button>';
  const S=E.scan;h+='<div class="kv"><b>Ship</b><span>'+esc(E.name)+' · '+esc(S.cls)+'</span><b>Race</b><span>'+(isR?esc(RACE[E.race].name):'Corsairs (no flag)')+'</span><b>Life signs</b><span>'+esc(S.life)+(anomFound(E)==='scan'?' <span class="tag">anomaly</span>':'')+'</span>'+(S.hidden?'<b>Hold</b><span>Shielded compartment detected <span class="tag">anomaly</span></span>':'')+'<b>Shields</b><span>'+S.sh+'%</span><b>Weapons threat</b><span>'+esc(S.thr)+'</span><b>Fuel</b><span>'+S.fuel+'%</span><b>Capabilities</b><span>'+esc(S.cap.join(', '))+'</span></div>';
  if(!isR)return h;
  if(E.hack){if(E.hack.caught)return h+'<div class="say bad"><b>Hack detected.</b> They lost trust in you (−8 relations).<br>'+esc(E.hack.line)+'</div>';
    {const C=E.hack.cargo;h+='<div class="say"><b>Hack succeeded, undetected.</b><br>'+E.hack.got.map(esc).join('<br>')+'</div><h3 class="cxh">CARGO HOLD'+(C.poor?' · NEARLY EMPTY':'')+'</h3><div class="kv">'+Object.entries(C.H).map(([k,q])=>'<b>'+RES[k].icon+' '+esc(RES[k].name)+'</b><span>'+q+'</span>').join('')+'</div><h3 class="cxh">CREW MANIFEST</h3><p class="small">'+esc(E.hack.manifest)+'</p>';}
    return h+(anomFound(E)&&!E.confronted?'<p class="small">Anomaly logged. Hail them to ask about it.</p>':'')+'<p class="small">Saved to the Log.</p>';}
  const p=hackRisk(E.race),t=G.races[E.race].tech;
  if(V.hackAsk)return h+'<div class="say"><b>Hack their computer?</b><br>Their tech '+t+'/5 vs ours '+ourTech()+'/5.<br><b>'+p+'% chance they notice.</b> If caught: −8 relations and an angry hail. No combat.<br><span class="small">One attempt per encounter.</span></div><button class="btn pri" data-a="hackgo">Hack ('+p+'% risk)</button><button class="btn" data-a="hackno">Cancel</button>';
  return h+'<button class="btn" data-a="hackask">Hack Computer… <span class="small">'+p+'% risk</span></button>';}
function spawnEncounter(forceRace){
  if(!forceRace&&G.escort>0){G.escort--;toast('Lanewarden escort: lane cleared. ('+G.escort+' escorts left)','g');return;}
  const pool=SB_RACES.filter(r=>G.races[r.id].rep<30&&!r.neverHostile&&r.id!=='glb');const race=forceRace||(RACE.glb&&Math.random()<.4?'glb':Math.random()<.35||!pool.length?'pir':pick(Math.random,pool).id);
  const src=RACE[race]||SB_PIRATES;G.enc={race,name:pick(Math.random,src.ships),state:'active'};
  if(RACE[race]){G.enc.anom=rollAnom(race);meet(race);shipLearn(race,G.enc.name,'Encountered');(G.saw=G.saw||{})[race]=G.turn;}
  V.view='tactical';V.dlg=null;sfx('alert');toast(race==='glb'?'A tiny bowl-ship, the '+G.enc.name+', is "attacking" you. Adorably.':'Heads up: the '+G.enc.name+' is approaching.');
}

/* ---------------- science ---------------- */
function scan(level){
  const s=here();V.scanUntil=performance.now()+1500;sfx('scan');const out=[];
  if(level===1){s.scan=1;if(s.co){know(s.co,'name');know(s.co,'loc');know(s.co,'tech');out.push('Also detected: the '+RACE[s.co].name+'.');}if(s.owner){know(s.owner,'name');know(s.owner,'loc');know(s.owner,'tech');know(s.owner,'rich');out.push('Identified the '+RACE[s.owner].name+'.');toast('Log updated: '+RACE[s.owner].short,'g');}
  } else {
    const sc=G.up&&G.up.scanner?SCAN_CR/2:SCAN_CR;if(G.credits<sc){toast('Deep scan needs ¢'+sc+' for probe drones.','b');return;}
    G.fuel=Math.max(0,G.fuel-3);G.credits-=sc;s.scan=2;V.src='Deep scan of '+s.name;
    if(s.owner){const o=act(s),st=G.races[o];(G.stock=G.stock||{})[o]=G.turn;
      const W=['shield pylons','orbital lances','drone swarms','mine fields','ion batteries'][st.tech%5],P=['a cooling vent on the north pole','an unshielded supply lane','a sensor blind spot at dawn','an aging reactor'][(o.charCodeAt(0)+o.charCodeAt(1))%4];
      out.push('True stock: '+RES[homeOf(o).rich[0]].name+' warehouses are overfull; your prices here improve 8%.');
      out.push('Defenses: '+W+'. Weak point: '+P+'.');note(o,'Defenses: '+W+'; weak point: '+P+'.','scan');
      const lf=(RACE[o].lore||RACE[o].hint||'');if(lf)note(o,'Archive fragment: '+String(lf).split('. ')[0].slice(0,140)+'.','scan');
      if(Math.random()<(V.forceDistress?1:.25)&&!s.distress){s.distress=1;const c=60+Math.floor(Math.random()*61);G.credits+=c;addRep(o,4,'rescued crew');hist(o,'You answered a distress beacon and rescued a crew.');out.push('Distress signal! A stranded '+RACE[o].short+' shuttle. You pull the crew aboard: +¢'+c+', and they will not forget it.');}
      if(o==='ost'){G.flags=G.flags||{};if(!G.flags.ostEv){G.flags.ostEv=1;out.push('Thermal trace: rows of sealed "staff dormitories" behind the salons, locked from outside. Hundreds of life-signs. These are holding pens.');note('ost','Deep scan found hidden holding pens behind the estates.','scan');}}
      if(o==='lmn'){G.flags=G.flags||{};if(!G.flags.lumEv){G.flags.lumEv=1;out.push('Signal analysis: the Luminae weave a soft persuasion field into every broadcast. Their offers will now show true terms.');note('lmn','Scan revealed a persuasion field: their deals carry hidden costs.','scan');}}
      qEvent('scan',o).forEach(t=>out.push(t));if(s.co)qEvent('scan',s.co).forEach(t=>out.push(t));}
    if(s.owner){know(s.owner,'secret');know(s.owner,'taboo');const f=pick(Math.random,['allies','enemies']);know(s.owner,f);
      out.push('Decrypted trade manifests: the '+RACE[s.owner].short+' quietly crave '+RES[RACE[s.owner].secretWant].name+'.');
      out.push('Cultural archive: they consider '+RES[RACE[s.owner].taboo].name+' taboo.');
      out.push('Military traffic shows they '+describe(s.owner,f,truth(s.owner,f))+'.');}
    else if(s.derelict&&!s.looted){s.looted=true;const q=2+Math.floor(Math.random()*3);addCargo('relics',q);out.push('Found a derelict hulk. Salvaged '+q+' Ancient Relics.');}
    else if(!s.owner&&!s.port){out.push(pick(Math.random,['Ruins of an outpost. A cracked beacon still loops its last log.','Old survey buoys. Their data cores are still readable.','A crashed courier. Its nav log lists recent stops.','Abandoned mining rigs. Graffiti marks who passed through.']));}
    else out.push('Subspace echoes only. No hidden structures.');
    if(s.co){const c=s.co;know(c,'secret');know(c,'taboo');out.push('A second signal: the '+RACE[c].short+' share this world and quietly crave '+RES[RACE[c].secretWant].name+'.');}
    out.push(rumor(s.owner));
    if(s.owner||(G.up&&G.up.scanner)){const t=pick(Math.random,SB_RACES.filter(x=>!kn(x.id).loc&&!kn(x.id).portrait));if(t&&(!s.owner||Math.random()<.5)){know(t.id,'name',true);know(t.id,'loc',undefined,true);out.push('Faint coordinates: something called the "'+t.short+'" near '+homeOf(t.id).name+'.');}}
    if(!s.owner&&!s.port){if(!s.derelict&&!s.salv){s.salv=1;const id=pick(Math.random,['alloy','circuits','data','isotope']),q=addCargo(id,1+Math.floor(Math.random()*2));if(q)out.push('Salvage: '+q+' '+RES[id].name+' from the wreckage.');}
      const t=pick(Math.random,SB_RACES.filter(x=>!kn(x.id).loc));if(t){know(t.id,'loc');out.push('Recovered star charts: the '+t.short+' homeworld is '+homeOf(t.id).name+'.');}}
  }
  V.lastScan=out;commit();
}
function addCargo(id,q){const room=G.cargoMax-cargoUsed();q=Math.min(q,room);if(q>0)G.cargo[id]=(G.cargo[id]||0)+q;return q;}

/* ---------------- v2.1 living dialogue ---------------- */
const TIERS=['hostile','wary','neutral','friendly','trusted'];
function tier(rid){const r=G.races[rid].rep;return r<=-40?'hostile':r<-10?'wary':r<15?'neutral':r<40?'friendly':'trusted';}
function voice(rc){return rc.liar?'sly':rc.respectsStrength>=.6?'martial':(rc.empath||(rc.hatesBullies>=.7&&rc.respectsStrength<.3))?'gentle':'formal';}
function tget(o,rid,sub){if(o==null)return null;if(typeof o==='string'||Array.isArray(o))return o;return sub&&o[sub]!=null?o[sub]:null;}
function tline(rid,key,vars,sub){const rc=RACE[rid],hk=(rc.talk||(typeof SB_TALK_HOOKS!=='undefined'&&SB_TALK_HOOKS[rid])||{})[key];
  let t=hk!=null?tget(hk,rid,sub):null;
  if(t==null){const T=SB_TALK[key];if(!T)return'';let v=(sub&&T[sub]&&typeof T[sub]==='object'&&!Array.isArray(T[sub])&&!T[voice(rc)])?T[sub]:(T[voice(rc)]||T.formal);if(v===T[sub]){v=v[voice(rc)]||v.formal;sub=null;}if(sub&&v&&typeof v==='object'&&!Array.isArray(v))v=v[sub];t=v;}
  if(Array.isArray(t))t=pick(Math.random,t);vars=vars||{};
  return t?String(t).replace(/\{(\w+)\}/g,(_,k)=>vars[k]!=null?vars[k]:''):'';}
function xv(x,extra){return Object.assign({X:RACE[x].short,XL:RACE[x].speaker},extra||{});}
function mem(rid){const M=G.mem=G.mem||{};return M[rid]=M[rid]||{n:0};}
function greetFor(rid){const rc=RACE[rid],t=tier(rid);
  if(t==='hostile'||t==='trusted')return tline(rid,'greet',{},t)||(t==='trusted'?rc.greet.hi:rc.greet.lo);
  return t==='friendly'?rc.greet.hi:t==='wary'?rc.greet.lo:rc.greet.mid;}
function spoke(r){return !!(G.spoke&&G.spoke[r]);}
function markSpoke(r){(G.spoke=G.spoke||{})[r]=G.turn;}
// only races you have actually completed a comms conversation with
function metRaces(rid){return SB_RACES.filter(o=>o.id!==rid&&spoke(o.id)).map(o=>o.id);}
function sawRaces(rid){return SB_RACES.filter(o=>o.id!==rid&&G.saw&&G.saw[o.id]&&!spoke(o.id)).map(o=>o.id);}
// up to 3 reactive lines: gossip heard, memory of you, your ties to their friends/foes, who else you've met
function reactLines(rid){const out=[],m=mem(rid),H=(G.heard=G.heard||{});
  if(H[rid]&&H[rid].length){const g=H[rid].shift();out.push(tline(rid,g.good?'gossipGood':'gossip',xv(g.v,{deed:SB_DEEDS[g.k]||g.k})));}
  if(m.n>0){const k=m.caught?'caught':m.extorted?'extorted':m.gift?'gift':m.tone==='threat'?'threat':'warm';out.push(tline(rid,'memory',{n:m.n+1},k));}
  const en=truth(rid,'enemies').filter(x=>G.races[x].rep>=30&&spoke(x)),al=truth(rid,'allies').filter(x=>G.races[x].rep>=30&&spoke(x));
  const V0=G.visit.cozy=G.visit.cozy||{};
  if(en.length){out.push(tline(rid,'enemyCozy',xv(en[0])));if(!V0[rid]){V0[rid]=1;addRep(rid,-2,'cozy with the '+RACE[en[0]].short);}}
  else if(al.length){out.push(tline(rid,'allyCozy',xv(al[0])));if(!V0[rid]){V0[rid]=1;addRep(rid,2,'friend of the '+RACE[al[0]].short);}}
  else{const met=metRaces(rid);if(met.length){const e=met.find(x=>relOf(rid,x)===-1),a=met.find(x=>relOf(rid,x)===1);
    out.push(e?tline(rid,'metEnemy',xv(e)):a?tline(rid,'metAlly',xv(a)):tline(rid,'metOther',xv(met[met.length-1])));}
    else{const sw=sawRaces(rid);if(sw.length&&Math.random()<.4)out.push('"Our sensors logged you crossing paths with a '+RACE[sw[sw.length-1]].short+' ship. Busy lanes out there."');}}
  if(rid!=='glb'&&RACE.glb&&G.kn.glb&&G.kn.glb.portrait&&typeof SB_GLUB_MOCK!=='undefined'&&out.length<3&&(V.forceMock||Math.random()<.25)){const M=SB_GLUB_MOCK[voice(RACE[rid])]||SB_GLUB_MOCK.formal;out.push(pick(Math.random,M));}
  return out.filter(Boolean).slice(0,3);}
// gossip: deeds reach the victim's allies a few turns later
function gossip(victim,kind,good){if(!RACE[victim])return;(G.gossip=G.gossip||[]).push({v:victim,k:kind,good:!!good,t:G.turn+3});}
function processGossip(){const Q=G.gossip||[];const keep=[];
  Q.forEach(g=>{if(G.turn<g.t){keep.push(g);return;}
    truth(g.v,'allies').forEach(a=>{(G.heard=G.heard||{})[a]=(G.heard[a]||[]).concat({v:g.v,k:g.k,good:g.good});
      addRep(a,g.good?2:-2,(g.good?'heard you ':'heard you ')+(SB_DEEDS[g.k]||g.k)+' the '+RACE[g.v].short,true);
      hist(a,'Gossip reached them: you '+(SB_DEEDS[g.k]||g.k)+' the '+RACE[g.v].short+'.');
      note(a,'Heard via gossip that you '+(SB_DEEDS[g.k]||g.k)+' the '+RACE[g.v].short+'.',RACE[g.v].short+' allies');});});
  G.gossip=keep;}
// leverage: name an ally you believe they have
function leverTarget(rid){const k=kn(rid).allies;const list=k?k.v:[];return list.find(a=>RACE[a]&&G.races[a].rep>=25&&spoke(a))||null;}
function leverage(rid){const a=leverTarget(rid);if(!a)return;me('"The '+RACE[a].short+' will vouch for me."');
  if(relOf(rid,a)===1){addRep(rid,6,'vouched for by the '+RACE[a].short);say(tline(rid,'leverOk',xv(a)));hist(rid,'Leveraged your friendship with the '+RACE[a].short+' (+6).');}
  else{addRep(rid,-4,'false claim of friendship');say(tline(rid,'leverBad',xv(a)));hist(rid,'Claimed the '+RACE[a].short+' as their ally. They are not (-4).');
    const k=kn(rid).allies;if(k&&k.r){delete kn(rid).allies;know(rid,'allies');}}}
// contradiction check: a confirmed statement from another race contradicts this race's claim
function contraSource(rid){if(!(G.visit.lied&&G.visit.lied[rid]))return null;const ka=kn(rid).allies,ke=kn(rid).enemies;
  return SB_RACES.map(o=>o.id).find(o=>{if(o===rid||!spoke(o))return false;const k=kn(o);
    return (k.enemies&&!k.enemies.r&&k.enemies.v.includes(rid)&&ka&&ka.v.includes(o))||(k.allies&&!k.allies.r&&k.allies.v.includes(rid)&&ke&&ke.v.includes(o));})||null;}
function contradict(rid){const s=contraSource(rid),rc=RACE[rid];if(!s)return;me('"The '+RACE[s].short+' told me otherwise."','Proof');
  addRep(rid,rc.liar?rc.liar.caught[0]:2,'caught in a contradiction');say(tline(rid,'contraOk',xv(s)));
  disprove(rid,RACE[s].short);['wants','allies','enemies'].forEach(f=>{const k=kn(rid)[f];if(k&&k.r)delete kn(rid)[f];know(rid,f);});
  say('"We '+describe(rid,'allies',truth(rid,'allies'))+'; we '+describe(rid,'enemies',truth(rid,'enemies'))+'."');mem(rid).caught=1;G.visit.topics.callout=1;
  hist(rid,'Exposed a lie using what the '+RACE[s].short+' told you.');sfx('ok');}
// tip: a confirmed homeworld of one of their enemies is worth something
function tipTarget(rid){const T=G.tips=G.tips||{};return truth(rid,'enemies').find(e=>kn(e).loc&&!kn(e).loc.r&&!T[rid+e]&&kn(rid).enemies&&kn(rid).enemies.v.includes(e))||null;}
function tip(rid){const e=tipTarget(rid);if(!e)return;G.tips[rid+e]=1;const where=homeOf(e).name;me('"I know where the '+RACE[e].short+' make their home."','Intel');
  G.credits+=40;addRep(rid,3,'useful intel');say(tline(rid,'tip',xv(e,{where})));V.dlg.lines.push({who:'',text:'+¢40 for the location of the '+RACE[e].short+'.'});
  hist(rid,'Told them where the '+RACE[e].short+' live (+¢40).');hist(e,'You gave their homeworld location to the '+RACE[rid].short+'.');gossip(e,'sold');sfx('coin');}
/* ---------------- v2.1 codex records ---------------- */
function note(rid,text,src,claim){const N=(G.notes=G.notes||{})[rid]=(G.notes[rid]||[]);N.push({t:G.turn,text,src:src||'',claim:claim||null});if(/\b(want|wants|need|needs|crave|craves|looking for|seek|seeks)\b/i.test(text))addLead(rid,text);if(N.length>40)N.shift();}
function disprove(rid,by){(G.notes&&G.notes[rid]||[]).forEach(n=>{if(n.claim&&!n.bad){n.bad=1;n.by=by||'proof';}});}
function repLog(rid){const L=(G.repLog=G.repLog||{})[rid]=(G.repLog[rid]||[]);const r=Math.round(G.races[rid].rep);if(L.length&&L[L.length-1][0]===G.turn)L[L.length-1][1]=r;else L.push([G.turn,r]);if(L.length>60)L.shift();}
function tradeLog(rid,kind,id,price){(G.trades=G.trades||{})[rid]=(G.trades[rid]||[]);const T=G.trades[rid],l=T[T.length-1];
  if(l&&l.t===G.turn&&l.k===kind&&l.id===id&&l.p===price)l.q++;else T.push({t:G.turn,k:kind,id,q:1,p:price});if(T.length>200)T.shift();}
/* ---------------- comms ---------------- */
function rc_short(r){return 'The '+RACE[r].short;}
function hail(rid){
  if(G.visit.with&&G.visit.with!==rid){G.visit.hailedBy=G.visit.hailedBy||{};G.visit.hailedBy[G.visit.with]=G.visit.hailed;G.visit.hailed=G.visit.hailedBy[rid]||null;G.visit.topics={};}
  G.visit.with=rid;V.src=rc_short(rid);meet(rid);know(rid,'loc');const st=G.races[rid],rc=RACE[rid];
  if(G.visit.hailed&&G.visit.hailed.tone){V.dlg={rid,stage:'topics',lines:chatOf(rid)};opener(rid);V.dlg.lines.push({who:rc.speaker,text:'"Back again so soon, Captain? Go on."'});V.talkUntil=performance.now()+2000;return;}
  const g=greetFor(rid),rx=reactLines(rid);const M=mem(rid);M.n++;M.last=G.turn;
  if(rc.alt){G.visit.alt=M.n%2===0?rid:null;}
  V.dlg={rid,stage:'tone',lines:chatOf(rid)};V.dlg.base=V.dlg.lines.length;opener(rid);if(G.visit.alt===rid){V.dlg.lines.push({who:rc.speaker,text:pick(Math.random,rc.alt.intro)});if(Math.random()<.5)V.dlg.lines.push({who:rc.speaker,text:pick(Math.random,rc.alt.lines)});}V.dlg.lines.push({who:rc.speaker,text:g});rx.forEach(t=>V.dlg.lines.push({who:rc.speaker,text:t}));const co=residents(here()).find(o=>o!==rid);if(co&&rc.nb){V.dlg.lines.push({who:rc.speaker,text:pick(Math.random,rc.nb),nb:co});}G.visit.hailed={};V.talkUntil=performance.now()+2600;
  if(!G.hist[rid])hist(rid,'First contact at '+here().name+'.');
  qEvent('talk',rid).forEach(t=>V.dlg.lines.push({who:t[0]==='"'?rc.speaker:'',text:t,quest:1}));if(M.n>=2)qStart(rid);
  if(rc.lieSense&&!G.visit.lieChecked){G.visit.lieChecked=1;let fixed=null;for(const o of SB_RACES){const k=G.kn[o.id];if(!k)continue;for(const f in k){if(f==='portrait'||f==='name'||!k[f]||!k[f].r)continue;let t;try{t=truth(o.id,f);}catch(e){continue;}if(t!==undefined&&JSON.stringify(t)!==JSON.stringify(k[f].v)){k[f]={v:t,r:false};fixed=[o,f];break;}}if(fixed)break;}
    V.dlg.lines.push({who:rc.speaker,text:fixed?'"One of your rumors about the '+fixed[0].short+' ('+fixed[1]+') was a lie. We have corrected your log."':'"Your log holds no lies we can see. Well kept, Captain."'});if(fixed)note(fixed[0].id,'Kagerin exposed a false rumor about '+fixed[1]+'.','kgr');}
  if((rid==='kgr'||rid==='elv')&&RACE.ost&&!(G.flags&&G.flags.ostEv)){G.flags=G.flags||{};G.flags.ostEv=1;V.dlg.lines.push({who:rc.speaker,text:rid==='kgr'?'"A warning, Captain. The Ostrevayne salons hide locked dormitories. Their \'labor contracts\' are chains in silk."':'"The Ostrevayne... smile... over locked doors. Their contracts... are cages... with good manners."'});note('ost','The '+rc.short+' say the labor contracts hide holding pens.',rid);}
  if(RACE.lmn&&rid!=='lmn'&&!(G.flags&&G.flags.lumEv)&&Math.random()<.25){G.flags=G.flags||{};G.flags.lumEv=1;V.dlg.lines.push({who:rc.speaker,text:'"Careful with the Luminae. We fell for them once: one smile, and we traded away half a harvest. Read their terms twice."'});note('lmn','The '+rc.short+' warn their gifts hide bad terms.',rid);}
  if(rc.warden){const adv=pick(Math.random,['GLUBBARI DRIFT DETECTED NEAR OUTER LANES. RECOMMEND: SPRAY, DO NOT FIRE.','PIRATE SIGNATURES: 2. RECOMMEND: ESCORT OR ALTERNATE ROUTE.','ION STORM: DISSIPATING. LANES: NOMINAL.','HAZARD LEVEL: LOW. PROCEED.']);V.dlg.lines.push({who:rc.speaker,text:'"ADVISORY: '+adv+'"'});}
  if(rc.rumorHub&&!G.visit.hubTold){const un=SB_RACES.filter(o=>o.id!==rid&&!(G.kn[o.id]&&(G.kn[o.id].portrait||G.kn[o.id].name)));if(un.length){G.visit.hubTold=1;const u=pick(Math.random,un),h=homeOf(u.id);V.src='Hearthmoor travelers';know(u.id,'name',undefined,true);if(h)know(u.id,'loc',undefined,true);V.dlg.lines.push({who:'',rumor:1,text:'Dockside chatter: a newcomer swears the '+u.short+' live near '+(h?h.name:'the edge of the charts')+'.'});note(u.id,'Rumor from Hearthmoor travelers: home near '+(h?h.name:'?')+'.','rumor');}}
  if(rc.sage&&!G.visit.sageTold){const un=SB_RACES.filter(o=>o.id!==rid&&!(G.kn[o.id]&&(G.kn[o.id].portrait||G.kn[o.id].name)));if(un.length){G.visit.sageTold=1;const u=pick(Math.random,un),h=homeOf(u.id);V.src='The '+rc.short;know(u.id,'name',undefined,true);if(h)know(u.id,'loc',undefined,true);V.dlg.lines.push({who:rc.speaker,rumor:1,text:'"A riddle... for your log. Near '+(h?h.name:'the dark')+'... the '+u.short+' wait... '+(u.kind?u.kind.split(' ').slice(0,4).join(' ').toLowerCase():'')+'... Go... gently."'});note(u.id,'Rumor from the Eldervane: home near '+(h?h.name:'?')+'.','rumor');}}
  if(rc.giftChance&&!G.visit.gifted&&(V.forceGift||Math.random()<rc.giftChance)){G.visit.gifted=1;nomadGift(rid);}
  trimGreeting(rid);
}
// greeting = opener + at most one contextual line; everything else waits for "Any news?"
const VAGUE_T=/^(Grand|High|Lord|Lady|Captain|Commodore|Admiral|Steward|Elder|Envoy|Mother|Father|Queen|King|Prime|Chief|First|Great|Sister|Brother|Master|Speaker|Warden|Matriarch|Patriarch|The|Of|And)$/;
function nameTokens(x){const r=RACE[x];const t=[r.speaker];(r.speaker||'').split(/[\s,]+/).forEach(w=>{w=w.replace(/[^A-Za-z'-]/g,'');if(w.length>=4&&/^[A-Z]/.test(w)&&!VAGUE_T.test(w))t.push(w);});return t;}
function vagueLine(text,rid,co){if(!text)return text;let out=text;
  SB_RACES.forEach(o=>{const x=o.id;if(x===rid||spoke(x))return;let hit=false;const near=x===co||residents(here()).includes(x);
    nameTokens(x).forEach(w=>{if(w&&out.includes(w)){hit=true;out=out.split(w).join(near?'their leader':'someone out there');}});
    [o.name,o.short].forEach(n=>{if(!n)return;const re=new RegExp("(\\b[Tt]he |\\bour )?"+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"(s|'s|es)?\\b",'g');if(re.test(out)){hit=true;out=out.replace(re,near?'the folk next door':'some folk out past the lanes');}});
    out=out.replace(/their leader (Commodore|Admiral|Steward|Elder)?/g,'their leader ');
    if(hit){if(near&&!kn(x).name){V.src='The '+RACE[rid].short;know(x,'name',undefined,true);}note(x,'Rumor: the '+RACE[rid].short+' mentioned '+(near?'their neighbors next door':'folk out past the lanes')+'.','rumor');}});
  return out.replace(/the folk next door neighbou?rs/g,'the folk next door').replace(/  +/g,' ').replace(/(^|[.!?]\s+|^\W*")(some|the folk|their leader|someone)/g,(m,p,w)=>p+w[0].toUpperCase()+w.slice(1));}
function trimGreeting(rid){const D=V.dlg;if(!D||D.base===undefined)return;const add=D.lines.splice(D.base);delete D.base;
  add.forEach(l=>{if(!l.rumor&&!l.me)l.text=vagueLine(l.text,rid,l.nb);});
  const keep=[],q=[];add.forEach(l=>{if(l.quest||keep.length<2)keep.push(l);else q.push(l);});
  keep.forEach(l=>D.lines.push(l));const N=(G.visit.news=G.visit.news||{});N[rid]=(N[rid]||[]).concat(q);}
function newsTopic(rid){const D=V.dlg,rc=RACE[rid],N=(G.visit.news=G.visit.news||{});me('"Any news?"');const q=N[rid]||[];
  if(q.length){const l=q.shift();D.lines.push(l);if(l.who===rc.speaker&&q[0]&&q[0].who==='')D.lines.push(q.shift());}
  else{const n0=D.lines.length;qStart(rid);if(D.lines.length===n0)say(pick(Math.random,['"Nothing new, Captain. Quiet lanes."','"That is all the news I have for now."','"Come back another day. Something always happens."']));}
  V.talkUntil=performance.now()+2200;}
function nomadGift(rid){const rc=RACE[rid];let t;
  if(Math.random()<.5||cargoUsed()>=G.cargoMax){const c=20+Math.floor(Math.random()*41);G.credits+=c;t='The '+rc.short+' transfer ¢'+c+' to you, unasked.';hist(rid,'Gave you a gift of ¢'+c+'.');}
  else{const it=pick(Math.random,SB_RES.filter(x=>x.id!==rc.taboo)).id,q=addCargo(it,1+Math.floor(Math.random()*2));t='The '+rc.short+' beam '+q+' '+RES[it].name+' into your hold.';hist(rid,'Gave you '+q+' '+RES[it].name+'.');}
  V.dlg.lines.push({who:rc.speaker,text:(rc.gifts?pick(Math.random,rc.gifts):'"A small gift, Captain. Take it."')});V.dlg.lines.push({who:'',text:t});sfx('coin');}
function nomadDrift(){SB_RACES.forEach(rc=>{if(!rc.nomad||Math.random()>.3)return;const h=homeOf(rc.id);if(G.loc===h.id||h.co)return;
  const opts=G.systems.filter(s=>!s.port&&!s.owner&&!s.co&&s.id!==G.loc);if(!opts.length)return;const n=pick(Math.random,opts);
  n.owner=rc.id;n.rich=h.rich;n.derelict=false;h.owner=null;h.rich=shuffle(Math.random,SB_RES.map(x=>x.id)).slice(0,2);G.races[rc.id].home=n.id;
  const k=kn(rc.id).loc;if(k&&k.v===h.name){k.v=n.name;k.r=true;hist(rc.id,'Their fleet drifted from '+h.name+' toward '+n.name+' (rumored).');}});}
function opener(rid){if(rid==='ill')V.dlg.lines.push({who:RACE[rid].speaker,text:"It's me, it's me, the Illuminati!"});}
function chatOf(rid){const c=G.visit.chat=G.visit.chat||{};return c[rid]=c[rid]||[];}
function me(text,tone){V.dlg.lines.push({me:1,text,tone:tone||''});}
const TOPIC_LINE={needs:'"What do your people need?"',politics:'"Who are your friends, and your rivals?"',region:'"What news from the region?"',special:'"Is there anything we can do for each other?"',press:'"Hand over your best cargo, or else."',callout:'"That\'s a lie, and I can prove it."'};
function say(text,who){V.dlg.lines.push({who:who===undefined?RACE[V.dlg.rid].speaker:who,text});V.talkUntil=performance.now()+Math.min(4000,1000+text.length*35);}
function hailEnc(){const E=G.enc;if(!E||!RACE[E.race])return;const rid=E.race,rc=RACE[rid];meet(rid);
  V.dlg={rid,stage:'enc',lines:[{who:'',text:'Channel open to the '+E.name+'.'}]};V.view='comms';
  V.dlg.lines.push({who:rc.speaker,text:rid==='glb'?pick(Math.random,['"SURRENDER, LAND-BLOB! BOW BEFORE THE BOWL!"','"THIS IS THE GLORIOUS FLEET! YOU ARE SURROUNDED! (BY ONE SHIP.)"','"STAND DOWN OR FACE THE FULL WRATH OF OUR SPLASH CANNONS!"']):'"This is the '+E.name+'. Turn your ship around, Captain, or we will make you."'});
  V.talkUntil=performance.now()+2500;}
function encTac(v){const E=G.enc;if(!E||!V.dlg||V.dlg.stage!=='enc')return;const rid=E.race,rc=RACE[rid];
  const L={brush:'Nudge them aside with a tractor beam.',swat:'Flick them away with a shield pulse.',ignore:'Ignore them.',scare:'"Please move along, friends."',spare:'Disable their weapons, then let them go.',loot:'Disable their engines and loot the hold.'};
  me(L[v]||v);tac(v);V.dlg.lines.push({who:'',text:E.result||''});
  V.dlg.lines.push({who:rc.speaker,text:rid==='glb'?(v==='brush'?'"TACTICAL RETREAT! THIS IS NOT OVER, LAND-BLOB!"':v==='swat'?'"WE MEANT TO DO THAT!"':'"VICTORY! TELL THE HISTORIANS!"'):(v==='loot'?'"You will regret this, Captain."':v==='spare'?'"...We will remember the mercy."':'"Fine. We are leaving."')});
  markSpoke(rid);hist(rid,'Spoke with them over comms during an encounter.');V.view='comms';commit();}
function chooseTone(t){const n0=V.dlg.lines.length;chooseTone0(t);V.dlg.lines.slice(n0).forEach(l=>{if(!l.me&&l.who)l.text=vagueLine(l.text,V.dlg.rid);});}
function chooseTone0(t){if(!SB_TONE_POOL[t])t='friendly';
  const rid=V.dlg.rid,rc=RACE[rid],d=sbTemper(rc)[t],reply=sbToneReply(rc,t);const tn=toneSet(rid).find(x=>x.id===t)||{id:t,label:SB_TONE_POOL[t].labels[0],line:SB_TONE_POOL[t].lines[0]};me(tn.line,tn.label);markSpoke(rid);G.visit.hailed.tone=t;mem(rid).tone=t;
  addRep(rid,d,t==='threat'?'threatened':'tone');if(rc.friendBoost&&d>0)addRep(rid,d*(rc.friendBoost-1),'eager to be liked');if(t==='threat')bully(rid,3,'');
  hist(rid,'Opened talks in a '+tn.label.toLowerCase()+' tone ('+(d>=0?'+':'')+d+').');{const TT=sbTemper(rc),mx=Math.max(...Object.values(TT)),mn=Math.min(...Object.values(TT));G.temperKnown=G.temperKnown||{};if(!G.temperKnown[rid]&&(d===mx||d===mn||mem(rid).n>=2)){G.temperKnown[rid]=1;note(rid,'Temperament: '+SB_ARCH[sbArch(rc)].hint,'temper');}}
  say(reply);V.dlg.stage='topics';sfx(d>=0?'ok':'bad');
  if(rc.nemesis&&rc.intel&&rc.intel.probes)say(pick(Math.random,rc.intel.probes));
  const of=rollFavor(rid,V.forceFavor);if(of){V.dlg.offer=of;say(favorPitch(of));}
  commit();
}
// an empath race that likes you (Cordial+) or has read you senses lies for you
function empathSense(){return SB_RACES.some(e=>e.empath&&G.races[e.id]&&(G.races[e.id].rep>=15||G.empRead));}
function lied(rid,f){(G.visit.lied=G.visit.lied||{})[rid]=1;}
// proof a liar is lying: deep scan of their homeworld, or another race's (true) politics naming them
function lieProof(rid){if(homeOf(rid).scan>=2)return true;if(empathSense())return true;return SB_RACES.some(o=>{if(o.id===rid)return false;const k=kn(o.id);return['allies','enemies'].some(f=>k[f]&&!k[f].r&&k[f].v.includes(rid));});}
function giftable(rid){const rc=RACE[rid];return [...rc.wants,rc.secretWant].find(x=>(G.cargo[x]||0)>0)||null;}
function topic(v){
  const rid=V.dlg.rid,rc=RACE[rid],st=G.races[rid];if(v==='news'){newsTopic(rid);commit();return;}G.visit.topics[v]=1;
  if(v==='intel'){sellIntel(rid);commit();return;}if(v==='askintel'){askIntel(rid);commit();return;}
  if(v==='leverage'){leverage(rid);commit();return;}if(v==='contradict'){contradict(rid);commit();return;}if(v==='tip'){tip(rid);commit();return;}
  if(v==='bribe'){const c=bribeCost(rid);if(G.credits<c)return;G.credits-=c;G.visit.bribed=1;me('Slides a credit chit across ('+'¢'+c+').','Bribe');addRep(rid,RACE[rid].hatesBullies>.7?2:5,'bribe');mem(rid).gift=1;say(RACE[rid].liar?'"How generous. We will remember this... fondly."':'"A contribution to the people. Accepted."');hist(rid,'You paid a ¢'+c+' gift of goodwill.');commit();return;}
  if(v==='gift'){const g0=giftable(rid);if(g0)me('Offers a gift of '+RES[g0].name+'.','Gift');}else me(SB_GENERIC[v]?genericLine(rid,v):TOPIC_LINE[v],v==='press'?'Threat':'');
  if(v==='needs'){
    if(st.rep<-20){say('"What we need is for you to leave."');}
    else if(lies(rid)){const fake=shuffle(Math.random,SB_RES.map(x=>x.id).filter(x=>!rc.wants.includes(x)&&x!==rc.taboo)).slice(0,3);know(rid,'wants',fake,true);lied(rid,'wants');
      say('"We pay handsomely for '+fake.map(x=>RES[x].name).join(', ')+'."');note(rid,'Claimed to pay well for '+fake.map(x=>RES[x].name).join(', ')+'.',rc.speaker,'wants');hist(rid,'Claimed to want '+fake.map(x=>RES[x].name).join(', ')+' (unverified).');}
    else{know(rid,'wants');note(rid,'Pays well for '+rc.wants.map(x=>RES[x].name).join(', ')+'.',rc.speaker);say('"We pay handsomely for '+rc.wants.map(x=>RES[x].name).join(', ')+'."');hist(rid,'Learned what they want.');}
  } else if(v==='politics'){
    if(st.rep<0){say('"Our alliances are not your business."');}
    else{let a=truth(rid,'allies'),e=truth(rid,'enemies');
      if(lies(rid)){[a,e]=[e,a];if(!a.length&&!e.length)a=[pick(Math.random,SB_RACES.filter(x=>x.id!==rid)).id];know(rid,'allies',a,true);know(rid,'enemies',e,true);lied(rid,'politics');note(rid,'Claimed friends: '+(a.map(x=>RACE[x].short).join(', ')||'none')+'; enemies: '+(e.map(x=>RACE[x].short).join(', ')||'none')+'.',rc.speaker,'politics');hist(rid,'Described their alliances (unverified).');}
      else{know(rid,'allies');know(rid,'enemies');note(rid,'Friends: '+(a.map(x=>RACE[x].short).join(', ')||'none')+'; enemies: '+(e.map(x=>RACE[x].short).join(', ')||'none')+'.',rc.speaker);}
      a.concat(e).forEach(x=>{if(!G.kn[x])G.kn[x]={};if(!kn(x).name)kn(x).name={v:true,r:false};});
      say('"Our friends: '+(a.length?a.map(x=>RACE[x].short).join(', '):'none worth naming')+'. Our enemies: '+(e.length?e.map(x=>RACE[x].short).join(', '):'none, for now')+'."');}
  } else if(v==='region'){
    const r=rumor(rid);say('"Travelers talk. Here is what we hear..."');V.dlg.lines.push({who:'',text:r});
  } else if(v==='callout'){
    if(lieProof(rid)){const[d,l]=rc.liar.caught;addRep(rid,d,'caught lying');say(l);disprove(rid,'your evidence');mem(rid).caught=1;['wants','allies','enemies'].forEach(f=>{const k=kn(rid)[f];if(k&&k.r)delete kn(rid)[f];know(rid,f);});
      say('"We pay for '+rc.wants.map(x=>RES[x].name).join(', ')+'. We '+describe(rid,'allies',truth(rid,'allies'))+'; we '+describe(rid,'enemies',truth(rid,'enemies'))+'."');hist(rid,'Caught them lying. The log now shows the truth.');sfx('ok');}
    else{const[d,l]=rc.liar.bluff;addRep(rid,d,'baseless accusation');say(l);hist(rid,'Accused them of lying with no proof ('+d+').');sfx('bad');}
  } else if(v==='special'){say(rc.special.prompt,'');V.dlg.stage='special';}
  else if(v==='gift'){
    const g=giftable(rid);if(g){G.cargo[g]--;const secret=g===rc.secretWant;mem(rid).gift=1;ripple(rid,secret?9:6,'gift');hist(rid,'Gave a gift of '+RES[g].name+'.');
      say(secret?'"How did you know? This is... precious to us. Thank you."':'"A thoughtful gift. We will remember it."');if(secret)know(rid,'secret');sfx('coin');}
  } else if(v==='press'){
    // bullying a planet: strength-respecters may pay tribute
    const ok=rc.respectsStrength>=.5||G.races[rid].tech<3;
    if(ok){const it=pick(Math.random,homeOf(rid).rich);const q=addCargo(it,3);say('"...Fine. Take '+q+' '+RES[it].name+' and go."');bully(rid,8,'extortion');mem(rid).extorted=1;gossip(rid,'extorted');hist(rid,'Extorted '+q+' '+RES[it].name+'.');}
    else{say('"You will get nothing from us but a long memory."');bully(rid,6,'extortion');hist(rid,'Attempted extortion; refused.');}
    sfx('bad');
  }
  commit();
}
/* intel market: races with a nemesis pay for what you know about it. Only new intel pays. */
function askIntelCost(rid){const r=G.races[rid].rep;return r>=30?0:r>=0?25:60;}
function askIntel(rid){const rc=RACE[rid],t=rc.nemesis,c=askIntelCost(rid);me('"What do you know about the '+RACE[t].short+'?"','Ask');
  if(c&&G.credits<c){say('"Information costs ¢'+c+', Captain. Come back with coin."');G.visit.topics.askintel=0;return;}
  const k=kn(t),f=['loc','wants','enemies','allies'].find(x=>!k[x])||['loc','wants','enemies','allies'].find(x=>k[x].r)||'wants';
  if(c){G.credits-=c;V.dlg.lines.push({who:'',text:'You paid the '+rc.short+' ¢'+c+' for what they know.'});}
  {const sn=(RACE[t].ships||[]).find(n=>!((G.ships||{})[t]||{})[n]);if(sn&&Math.random()<.6){shipLearn(t,sn,'Rumored from the '+rc.short);V.dlg.lines.push({who:'',text:'They also mention a '+RACE[t].short+' ship, the '+sn+'. Added to Known Ships (rumored).'});}}V.src='The '+rc.short;let v;try{v=truth(t,f);}catch(e){v=undefined;}
  const desc=f==='loc'?('they live near '+((homeOf(t)||{}).name||'the edge of the charts')):f==='wants'?('they want '+(RACE[t].wants||[]).map(w=>RES[w]?RES[w].name:w).join(', ')):f==='enemies'?('their rivals: '+((v||[]).map(x=>RACE[x]?(spoke(x)?RACE[x].short:'some folk out past the lanes'):x).join(', ')||'none they admit')):('their friends: '+((v||[]).map(x=>RACE[x]?(spoke(x)?RACE[x].short:'some folk out past the lanes'):x).join(', ')||'none we know of'));
  if(v!==undefined)know(t,f,v,true);say('"The '+RACE[t].short+'? Here is what we know: '+desc+'. Take it with a grain of salt."');
  V.dlg.lines.push({who:'',text:'The '+rc.short+' shared intel on the '+RACE[t].short+' with you. Logged in the compendium (rumored).'});
  note(t,'The '+rc.short+' told you: '+desc+'.','rumor');hist(rid,'Shared their intel on the '+RACE[t].short+' with you'+(c?' for ¢'+c:'')+'.');}
/* v3.2 approaches + bespoke topics */
function toneSet(rid){const rc=RACE[rid],s=sbToneSet(rc,(G.visit.id||0)+':'+mem(rid).n);if(!s.some(x=>x.id==='friendly')){const P=SB_TONE_POOL.friendly,h=sbHash(G.visit.id+rid);s.unshift({id:'friendly',label:P.labels[h%3],line:P.lines[(h>>2)%3]});s.splice(4);}
  if(!s.some(x=>sbTemper(rc)[x.id]>=3)){const g=SB_TONE_IDS.find(x=>sbTemper(rc)[x]>=3);if(g){const P=SB_TONE_POOL[g];s[s.length-1]={id:g,label:P.labels[0],line:P.lines[0]};}}return s;}
function genericSet(rid){const K=['needs','politics','region','special'],o=sbHash((G.visit.id||0)+rid)%4;return K.slice(o).concat(K.slice(0,o));}
function genericLine(rid,k){const v=voice(RACE[rid]),L=SB_GENERIC[k];return L[v]||L.formal;}
function btNode(rid,path){let n=null,list=sbTopics(RACE[rid]);for(const i of String(path).split('.')){n=list[+i];if(!n)return null;list=n.f||[];}return n;}
function btOk(rid,n){const q=n.need||{};return (!q.rep||G.races[rid].rep>=q.rep)&&(!q.visit||mem(rid).n>=q.visit);}
function btopicHtml(rid){const D=V.dlg,A=(G.visit.bt=G.visit.bt||{})[rid]=(G.visit.bt[rid]||{});let h='';
  if(D.bnode){const n=btNode(rid,D.bnode);(n&&n.f||[]).forEach((c,i)=>{const p=D.bnode+'.'+i;if(!A[p]&&btOk(rid,c))h+='<button class="btn" data-a="bt" data-v="'+p+'"><span class="tone">Follow up</span>'+esc(c.q)+'</button>';});}
  const top=sbTopics(RACE[rid]).map((n,i)=>[n,i]).filter(([n,i])=>btOk(rid,n));const off=mem(rid).n%Math.max(1,top.length);
  top.slice(off).concat(top.slice(0,off)).slice(0,3).forEach(([n,i])=>{if(!A[i])h+='<button class="btn" data-a="bt" data-v="'+i+'">'+esc(n.q)+'</button>';});return h;}
function btAsk(rid,path){const n=btNode(rid,path);if(!n||!btOk(rid,n))return;const A=(G.visit.bt=G.visit.bt||{})[rid]=(G.visit.bt[rid]||{});A[path]=1;
  me(n.q);say(n.a);const M=mem(rid),S=(M.bt=M.bt||{});if(!S[path]){S[path]=1;if(n.rep)addRep(rid,n.rep,'enjoyed the conversation');if(n.lore)note(rid,n.lore,'lore');}
  V.dlg.bnode=(n.f&&n.f.length)?String(path):null;}
function intelScore(t){const k=G.kn[t]||{};let s=0;for(const f in k){if(k[f])s+=k[f].r?1:2;}
  s+=Math.min(6,(G.hist[t]||[]).length);favs().forEach(f=>{if(f.state!=='offer'&&(f.to===t||f.from===t))s+=2;});return s;}
function intelSold(rid){return (G.intelSold=G.intelSold||{})[rid]||0;}
function intelGrade(d){return d<=0?'nothing new':d<4?'scraps':d<10?'solid':'explosive';}
function sellIntel(rid){const rc=RACE[rid],t=rc.nemesis,I=rc.intel,sc=intelScore(t),d=sc-intelSold(rid);
  me('"Here is everything we know about the '+RACE[t].short+'. What is it worth to you?"','Sell intel');
  if(!kn(t).name){say(I.none);return;}
  if(d<=0){say(I.stale);addRep(rid,1,'tried to help');return;}
  G.intelSold[rid]=sc;const cr=30+d*25;G.credits+=cr;let r='+¢'+cr;
  if(d>=6){const it=pick(Math.random,SB_RES.filter(x=>x.id!==rc.taboo)).id,q=addCargo(it,2+Math.floor(d/4));if(q)r+=', '+q+' '+RES[it].name;}
  say(d>=8?I.big:I.small);V.dlg.lines.push({who:'',text:'You sold your intel on the '+RACE[t].short+' to the '+rc.short+'. They paid you '+r+'.'});
  ripple(rid,Math.min(18,3+Math.round(d*1.5)),'intel on the '+RACE[t].short);know(rid,'enemies');
  hist(rid,'Sold intel on the '+RACE[t].short+' ('+intelGrade(d)+', '+r+').');hist(t,'You sold their secrets to the '+rc.short+'.');gossip(t,'sold');G.intelSold[rid]=intelScore(t);sfx('coin');}
function special(i){
  const rid=V.dlg.rid,rc=RACE[rid],o=rc.special.options[i];G.visit.spec=G.visit.spec||{};if(G.visit.spec[i]){V.dlg.stage='topics';return;}const c0=G.credits;G.visit.spec[i]=1;V.dlg.stage='topics';
  me(o.t);say(o.reply.replace(/^"|"$/g,'').length?o.reply:o.reply);
  if(o.rep>=0)ripple(rid,o.rep,'');else addRep(rid,o.rep,'');
  hist(rid,o.t+' ('+(o.rep>=0?'+':'')+o.rep+').');
  if(o.fx==='tech'&&!G.hydro){G.hydro=1;G.fuelMax+=25;G.fuel=G.fuelMax;toast('Imperial hydro-condenser fitted: +25 fuel capacity.','g');}
  if(o.fx==='empath'){G.empRead=1;toast(rc.short+' empaths will now sense when others lie to you.','g');}
  if(o.fx==='intel'){know(rid,'secret');}
  if(o.fx&&/^(expose|free_)/.test(o.fx)){const Q=qState();G.flags=G.flags||{};const q=Q.unbind;let t;
    if(o.fx==='expose'){if(q)t=q.step>=2?'The pens are already open.':'They know you know. Now choose how to free the captives.';
      else if(!G.flags.ostEv)t='"Holding pens? What a vivid imagination. Do have more wine." (You need evidence: scan their world or ask around.)';
      else{Q.unbind={step:1,start:G.turn};disprove&&disprove(rid,'your evidence');t='Velorien\'s smile freezes. "Those are… staff quarters." You show him the scans. Quest started: The Quiet Unbinding.';hist(rid,'You exposed their holding pens.');toast('New quest: The Quiet Unbinding','g');}}
    else if(!q||q.step!==1)t='"Release? Whatever from? Everyone here is quite content." (They will not discuss it until you expose them.)';
    else{let ok=false,why='';
      if(o.fx==='free_neg'){ok=G.races[rid].rep>=10;why='They need to respect you more first (rep 10+).';}
      if(o.fx==='free_bribe'){ok=G.credits>=150;if(ok)G.credits-=150;why='You need ¢150.';}
      if(o.fx==='free_ally'){ok=['kgr','elv'].some(a=>G.races[a]&&G.races[a].rep>=20);why='Earn the Kagerin or Eldervane trust first (rep 20+).';}
      if(o.fx==='free_neg'&&!ok&&kn(rid).secret){ok=true;}
      t=ok?'Done. The doors open quietly; the workers step into the light, blinking.':'Not yet. '+why+' Take your time.';
      if(ok){qEvent('free',rid).forEach(x=>V.dlg.lines.push({who:'',text:x}));hist(rid,'Freed their captives.');}}
    V.dlg.lines.push({who:'',text:t});}
  if(o.fx==='care'){G.visit=G.visit||{};if(G.visit.cared)V.dlg.lines.push({who:'',text:'MOCHI-7: "You were already treated this visit. Rest is the best medicine."'});else{G.visit.cared=1;G.ls=100;G.hull=Math.min(100,(G.hull==null?100:G.hull)+20);V.dlg.lines.push({who:'',text:'Life support restored to 100%, hull +20% (free).'});}}
  if(o.fx==='gadget'){G.up=G.up||{};if(G.up.scanner)V.dlg.lines.push({who:'',text:'You already have a deep scanner.'});else if(G.credits>=160){G.credits-=160;G.up.scanner=G.turn;V.dlg.lines.push({who:'',text:'Kumoya deep scanner installed (−¢160).'});}else V.dlg.lines.push({who:'',text:'Not enough credits (¢160 needed).'});}
  if(o.fx==='smith'){if(G.credits>=80){G.credits-=80;G.hull=100;G.ls=100;V.dlg.lines.push({who:'',text:'Hull and life support restored to 100% (−¢80).'});}else V.dlg.lines.push({who:'',text:'Not enough credits (¢80 needed).'});}
  if(o.fx==='forgeDeal'){if(G.credits>=40){G.credits-=40;G.forgeDeal=1;V.dlg.lines.push({who:'',text:'Your next ship upgrade is 30% off (−¢40).'});}else V.dlg.lines.push({who:'',text:'Not enough credits (¢40 needed).'});}
  if(o.fx==='translate'){G.translate=1;V.dlg.lines.push({who:'',text:'Translation primer received: Oomba speech and Kthrax hive patterns will now be translated, and the Kthrax swarm will let you approach to talk.'});}
  if(o.fx==='escort'){if(G.credits>=60){G.credits-=60;G.escort=(G.escort||0)+3;V.dlg.lines.push({who:'',text:'A Lanewarden monolith falls in beside you. It will ward off your next 3 lane encounters.'});}else V.dlg.lines.push({who:rc.speaker,text:'"FUNDS: INSUFFICIENT. REQUIRED: 60."'});}
  if(o.fx&&/^charm/.test(o.fx)){G.flags=G.flags||{};const see=G.flags.lumEv||(G.up&&G.up.resist);const T={charm1:['a prism that only flatters the eye','¢120 for a pretty glass bauble'],charm2:['a blessing that is only a song','2 crystal for a nice song'],charm3:['friendship that comes with a 5% tithe on your next sale','a small tithe on your next sale']}[o.fx];
    if(see){V.dlg.lines.push({who:'',text:'[True terms: '+T[1]+'.] You smile and decline. Ilvaresh laughs. "Clever Captain."'});}
    else{if(o.fx==='charm1')G.credits=Math.max(0,G.credits-120);if(o.fx==='charm2'&&G.cargo&&G.cargo.crystal)G.cargo.crystal=Math.max(0,G.cargo.crystal-2);if(o.fx==='charm3')G.tithe=1;V.dlg.lines.push({who:'',text:'You feel wonderful about it. (Later you realize it was '+T[0]+'.)'});}}
  if(o.fx==='reckless'){SB_RACES.forEach(r=>{if(r.hatesBullies>=.5&&r.id!==rid)addRep(r.id,-2,'reckless weapons fire');});V.fireUntil=performance.now()+600;sfx('fire');}
  if(o.fx==='charts'){const others=SB_RACES.filter(r=>r.id!==rid&&!(kn(r.id).loc&&!kn(r.id).loc.r));if(others.length){const t=pick(Math.random,others).id;if(!kn(t).name)kn(t).name={v:true,r:false};know(t,'loc');toast('Star charts: '+RACE[t].short+' homeworld located.','g');}}
  if(/^(smith|forgeDeal|escort|gadget|free_bribe)$/.test(o.fx||'')&&G.credits===c0)delete G.visit.spec[i];sfx(o.rep>=0?'ok':'bad');commit();
}

/* ---------------- favors ---------------- */
const FAVOR_CHANCE=1/7;
const FAV_KIND={gift:{icon:'🎁',item:'Ceremonial gift'},msg:{icon:'✉️',item:'Sealed message'},prisoner:{icon:'⛓️',item:'Prisoner in stasis'},dossier:{icon:'🕵️',item:'Forged dossier'}};
function favs(){return G.favors=G.favors||[];}
function openFavor(rid){return favs().find(f=>f.from===rid&&f.state==='open');}
function favorCount(){return favs().filter(f=>f.state==='open').length;}
function rollFavor(rid,force){
  if(openFavor(rid)||(!force&&Math.random()>=FAVOR_CHANCE)||G.races[rid].rep<-15)return null;
  const al=truth(rid,'allies'),en=truth(rid,'enemies');let kind,to;
  const opts=[];al.forEach(a=>{opts.push(['gift',a],['msg',a],['prisoner',a]);});en.forEach(e=>opts.push(['dossier',e]));
  const nm=RACE[rid].nemesis;if(nm&&RACE[nm]&&Math.random()<.65){opts.length=0;opts.push(['dossier',nm]);al.forEach(a=>opts.push(['msg',a]));}
  if(!opts.length)SB_RACES.filter(x=>x.id!==rid).forEach(x=>opts.push(['msg',x.id]));
  [kind,to]=pick(Math.random,opts);
  const intel=Math.random()<.45;let credits=intel?60:120+Math.round(Math.random()*8)*20;if(RACE[rid].nemesis)credits=Math.round(credits*1.5);if(RACE[rid].favorMult)credits=Math.round(credits*RACE[rid].favorMult);
  return{id:'f'+Date.now().toString(36)+Math.floor(Math.random()*1e4),from:rid,to,kind,credits,intel,state:'offer',t:G.turn};
}
function favorPitch(f){const to=RACE[f.to].short,where=sys(G.races[f.to].home).name;
  const cu=RACE[f.from].favor;if(cu&&cu[f.kind])return cu[f.kind].replace('{to}',to).replace('{where}',where);
  return{gift:'"Captain, a small kindness? Carry this ceremonial gift to our friends the '+to+' at '+where+'."',
    msg:'"We need a discreet courier. Deliver this sealed message to the '+to+' at '+where+'. No hurry."',
    prisoner:'"We hold one of the '+to+' in stasis. Return them home to '+where+' as a sign of goodwill?"',
    dossier:'"Between us... slip this forged dossier to the '+to+' at '+where+'. They need not know it came from us."'}[f.kind];}
function favorRewardText(f){return(f.credits?'¢'+f.credits:'')+(f.intel?(f.credits?' + ':'')+'secret intel':'');}
function favorAnswer(yes){const D=V.dlg,f=D.offer;if(!f)return;D.offer=null;const rid=f.from;
  if(yes){f.state='open';favs().push(f);me('"We will see it delivered."');say('"Splendid. Take your time, Captain."');hist(rid,'Agreed to carry a '+FAV_KIND[f.kind].item.toLowerCase()+' to the '+RACE[f.to].short+'.');if(!kn(f.to).name)kn(f.to).name={v:true,r:false};sfx('ok');}
  else{me('"Not this time, I am afraid."');addRep(rid,-1,'declined a favor');say('"A pity. Perhaps another time."');}
  commit();}
function favorIntel(){const undisc=SB_RACES.filter(r=>!(kn(r.id).loc&&!kn(r.id).loc.r)&&!kn(r.id).portrait);
  if(undisc.length){const t=pick(Math.random,undisc).id;if(!kn(t).name)kn(t).name={v:true,r:true};know(t,'loc',undefined,true);hist(t,'Rumor via a favor: homeworld at '+sys(G.races[t].home).name+'.');return'the '+RACE[t].short+' homeworld lies at '+sys(G.races[t].home).name+' (marked on your map as rumored)';}
  const a=pick(Math.random,SB_RACES).id,f=pick(Math.random,['allies','enemies']);know(a,f,undefined,true);return'the '+RACE[a].short+' '+describe(a,f,truth(a,f));}
function deliverFavor(fid){const f=favs().find(x=>x.id===fid&&x.state==='open');if(!f)return;const here_=V.dlg.rid,K=FAV_KIND[f.kind];
  if(here_===f.to){f.state='done';me(f.rescue?'Brings home the rescued '+RACE[f.to].short+'.':'Hands over the '+K.item.toLowerCase()+' from the '+RACE[f.from].short+'.');
    const shady=f.kind==='dossier';addRep(f.from,shady?10:8,'favor delivered');addRep(f.to,shady?1:6,'favor received');
    say(shady?'"A dossier? How... interesting. Thank you, Captain."':'"From the '+RACE[f.from].short+'? How kind. Our thanks, Captain."');
    let r='Favor complete for the '+RACE[f.from].short+'.';if(f.credits){G.credits+=f.credits;r+=' +¢'+f.credits+'.';}
    if(f.intel){const t=favorIntel();V.dlg.lines.push({who:'',text:'Intel from the '+RACE[f.from].short+': '+t+'.'});r+=' Intel logged.';}
    gossip(f.from,'helped',true);hist(f.from,'Delivered their '+K.item.toLowerCase()+' to the '+RACE[f.to].short+'.');hist(f.to,'Received a '+K.item.toLowerCase()+' from the '+RACE[f.from].short+' via you.');toast(r,'g');sfx('coin');}
  else{f.state='betrayed';f.gaveTo=here_;me('Hands the '+RACE[f.from].short+' '+K.item.toLowerCase()+' to the '+RACE[here_].short+' instead.');
    const enemy=relOf(f.from,here_)===-1;addRep(f.from,enemy?-15:-6,'favor misdelivered');addRep(here_,enemy?8:2,'gained leverage');
    gossip(f.from,'betrayed');
    say(enemy?(f.kind==='prisoner'?'"A '+RACE[f.from].short+' captive! You have done us a great service."':'"Secrets of the '+RACE[f.from].short+'? Most welcome."'):'"This was not meant for us... but we will keep it."');
    hist(f.from,'You gave their '+K.item.toLowerCase()+' to the '+RACE[here_].short+' instead.');hist(here_,'Handed them a '+RACE[f.from].short+' '+K.item.toLowerCase()+'.');
    toast('The '+RACE[f.from].short+' will hear of this.','b');sfx('bad');}
  commit();}
function favorsHtml(){const F=favs().filter(f=>f.state==='open');if(!F.length&&!favs().length)return'';
  let h='<h3 style="margin:4px 0">Favors</h3>';if(!F.length)h+='<p class="small">No open favors. Completed: '+favs().filter(f=>f.state==='done').length+'.</p>';
  F.forEach(f=>{h+='<div class="hist">'+FAV_KIND[f.kind].icon+' <b>'+esc(FAV_KIND[f.kind].item)+'</b><br>From: '+esc(RACE[f.from].short)+' · To: '+esc(RACE[f.to].short)+' at '+esc(sys(G.races[f.to].home).name)+'<br>Reward: '+favorRewardText(f)+' · no time limit</div>';});return h;}
/* ---------------- fuel ---------------- */
const FUEL_PRICE=1; // credits per fuel unit away from home
function isHome(s){return s.id===0;}
function canRefuel(s){return s.port||(s.owner&&G.races[s.owner].rep>=-30);}
function refuelCost(){const s=here(),need=G.fuelMax-G.fuel;return isHome(s)?0:Math.min(G.credits,Math.ceil(need*FUEL_PRICE));} // never more than you have: tenders cover the rest
function refuelBtn(){const s=here();if(!canRefuel(s))return'';const full=G.fuel>=G.fuelMax,c=refuelCost();
  return'<button class="btn" data-a="refuel" '+(full?'disabled':'')+'>⛽ Refuel'+(full?' · tanks full':' to full · '+(c?'¢'+c:'Free'))+'</button>';}
function refuel(){const s=here();if(!canRefuel(s)||G.fuel>=G.fuelMax)return;const c=refuelCost();G.credits-=c;G.fuel=G.fuelMax;toast('Tanks full'+(c?' (¢'+c+')':', on the house')+'.','g');commit();}
/* ---------------- trade ---------------- */
/* demand: per race per wanted good, 0..1; recovers per warp jump (G.turn), lazily computed */
const DEM_DROP=.07,DEM_REC=.12,DEM_MIN=.15,BUMP_UP=.04,BUMP_MAX=.5,BUMP_REC=.1;
const FULL_LINE={vel:'"Our vaults overflow with that, Captain. Come back another time, hm?"',
 gor:'"Enough! Our forges are stuffed full. Bring it another day."',
 pip:'"Oh dear, the archives are bursting with those! Maybe later? Pretty please?"',
 ssk:'"The Ascendancy is sated. Offer it again when we have grown hungry."',
 kri:'"The Chorus is full of this. Return after the swarm has fed."'};
SB_RACES.forEach(r=>{if(r.full)FULL_LINE[r.id]=r.full;});
function demOf(rid,id){G.dem=G.dem||{};const e=(G.dem[rid]||{})[id];if(!e)return 1;return Math.min(1,e.d+DEM_REC*Math.max(0,G.turn-e.t));}
function demSet(rid,id,d){G.dem=G.dem||{};(G.dem[rid]=G.dem[rid]||{})[id]={d:Math.max(0,d),t:G.turn};}
function bumpOf(sid,id){G.bump=G.bump||{};const e=(G.bump[sid]||{})[id];if(!e)return 0;return Math.max(0,e.b-BUMP_REC*Math.max(0,G.turn-e.t));}
function bumpAdd(sid,id){G.bump=G.bump||{};(G.bump[sid]=G.bump[sid]||{})[id]={b:Math.min(BUMP_MAX,bumpOf(sid,id)+BUMP_UP),t:G.turn};}
function demLabel(d){return d<DEM_MIN?'Saturated':d<.45?'Low demand':d<.75?'Moderate':'High demand';}
function market(){
  const s=here();
  if(s.port){const items=s.rich.map(id=>({id,buy:Math.round(RES[id].base*1.05*(1+bumpOf(s.id,id))),sell:Math.round(RES[id].base*.85)}));
    Object.keys(G.cargo).forEach(id=>{if(G.cargo[id]>0&&!s.rich.includes(id))items.push({id,buy:null,sell:Math.round(RES[id].base*.8)});});
    return{note:'Free port market. Fair prices, no politics.',items};}
  if(!s.owner)return{refuse:'No one here to trade with. Your hold:'};
  const rid=act(s),rc=RACE[rid],st=G.races[rid];
  if(!kn(rid).portrait)return{refuse:'Hail the locals before trading. Your hold:'};
  if(st.rep<-30)return{refuse:rc.short+' traders refuse to deal with you. Improve your reputation first. Your hold:'};
  const f=moraleMult()*(1+st.rep/300)*(G.stock&&G.stock[rid]!=null&&G.turn-G.stock[rid]<6?1.08:1);const items=[];
  const wanted=[...rc.wants,rc.secretWant];
  const add=(id,mult,tag,canBuy)=>{if(items.some(x=>x.id===id))return;const w=wanted.includes(id),d=w?demOf(rid,id):1;
    items.push({id,tag,dem:w?d:null,full:w&&d<DEM_MIN,buy:canBuy?Math.max(1,Math.round(RES[id].base*mult/f*1.1*(1+bumpOf(s.id,id)))):null,sell:Math.max(1,Math.round(RES[id].base*mult*.9*f*(w?.35+.65*d:1)))});};
  homeOf(rid).rich.forEach(id=>add(id,.55,'cheap',true));
  rc.wants.forEach(id=>add(id,2.2,kn(rid).wants?'wanted':'',false));
  add(rc.secretWant,1.8,kn(rid).secret?'wanted':'',false);
  Object.keys(G.cargo).forEach(id=>{if(G.cargo[id]>0)add(id,id===rc.taboo?1:.9,id===rc.taboo&&kn(rid).taboo?'taboo':'',false);});
  return{note:rc.short+' market · standing '+repLabel(st.rep)+'. Better standing means better prices.',items};
}
function trade(kind,id){
  const s=here(),m=market(),it=m.items.find(x=>x.id===id);if(!it)return;
  const rid=act(s),rc=RACE[rid];
  if(kind==='sell'&&rid&&id===rc.taboo){addRep(rid,-6,'offered a taboo good');know(rid,'taboo');toast(rc.short+' are offended: '+RES[id].name+' is taboo to them!','b');sfx('bad');hist(rid,'Offended them by offering '+RES[id].name+'.');commit();return;}
  if(kind==='buy'){if(it.buy==null||G.credits<it.buy||cargoUsed()>=G.cargoMax)return;G.credits-=it.buy;G.cargo[id]=(G.cargo[id]||0)+1;const P=(G.paid=G.paid||{})[id]=G.paid[id]||{q:0,c:0};P.q++;P.c+=it.buy;bumpAdd(s.id,id);}
  else{if(!G.cargo[id])return;if(it.full){toast(FULL_LINE[rid]||'They have plenty of that for now.');V.keepScroll=true;renderAll();V.keepScroll=false;return;}
    G.cargo[id]--;{let pay=it.sell;if(G.tithe){if((G.flags&&G.flags.lumEv)||(G.up&&G.up.resist)){G.tithe=0;toast('You see through the Luminae tithe and stop paying it.','g');}else{const cut=Math.max(1,Math.round(pay*.1));pay-=cut;G.titheTotal=(G.titheTotal||0)+cut;toast('Luminae tithe: −¢'+cut+' of this sale.','b');}}G.credits+=pay;}if(G.paid&&G.paid[id]&&G.paid[id].q){const P=G.paid[id];P.c-=P.c/P.q;P.q--;}if(it.dem!=null)demSet(rid,id,it.dem-DEM_DROP);}
  sfx('coin');st().tr++;st().goods[id]=1;
  if(rid){tradeLog(rid,kind,id,kind==='buy'?it.buy:it.sell);if(G.visit.tradeRep<5){G.visit.tradeRep++;ripple(rid,1,'trade');}
    if(kind==='sell'&&(rc.wants.includes(id)))know(rid,'wants');
    if(kind==='sell')qEvent('sell',rid,id).forEach(t=>toast(t,'g'));
    const H=G.hist[rid]=G.hist[rid]||[];const key='T'+G.turn+': Trade';const ledger=G.visit.ledger=G.visit.ledger||{b:{},s:{},net:0};
    (kind==='buy'?ledger.b:ledger.s)[id]=((kind==='buy'?ledger.b:ledger.s)[id]||0)+1;ledger.net+=kind==='buy'?-it.buy:it.sell;
    const txt=key+(Object.keys(ledger.b).length?' · bought '+Object.entries(ledger.b).map(([k,v])=>v+' '+RES[k].name).join(', '):'')+(Object.keys(ledger.s).length?' · sold '+Object.entries(ledger.s).map(([k,v])=>v+' '+RES[k].name).join(', '):'')+' (net '+(ledger.net>=0?'+':'')+ledger.net+' cr)';
    if(H.length&&H[H.length-1].startsWith(key))H[H.length-1]=txt;else H.push(txt);}
  V.keepScroll=true;commit();V.keepScroll=false;
}

/* ---------------- tactical ---------------- */
function tac(v){
  const E=G.enc,rid=E.race,isR=!!RACE[rid];const nm=isR?RACE[rid].short:'Corsair';
  if(rid==='glb'&&E.state==='active'){E.state='fled';
    if(v==='brush'){E.result='You gently scoot the '+E.name+' aside. Bubblesnout shouts "TACTICAL RETREAT!" and floats off, sulking magnificently.';addRep('glb',2,'handled gently');hist('glb','You gently nudged their ship '+E.name+' aside.');}
    else if(v==='swat'){E.result='A soft shield pulse sends the '+E.name+' spinning like a bath toy. It drifts away, bowl sloshing, crew shouting "WE MEANT TO DO THAT!"';addRep('glb',-1,'swatted');gossip('glb','swatted');SB_RACES.forEach(r=>{if(r.respectsStrength>.8&&r.id!=='glb')addRep(r.id,1,'enjoyed the show');});hist('glb','You swatted their ship '+E.name+'. They are writing a ballad of revenge.');}
    else {E.result='You sip your tea. The '+E.name+' fires 47 shots, all of which bounce off. Eventually they declare victory and leave, very proud.';addRep('glb',1,'let them "win"');hist('glb','Their ship '+E.name+' "defeated" you. They are celebrating.');}
    commit();return;}
  if(v==='scare'){E.state='fled';E.result='The '+E.name+' turns tail and runs. No shots fired.';if(isR){addRep(rid,-1,'intimidated');SB_RACES.forEach(r=>{if(r.respectsStrength>.5&&r.id!==rid)addRep(r.id,1,'respects your resolve');});hist(rid,'Scared off their ship '+E.name+'.');}else SB_RACES.forEach(r=>{if(r.hatesBullies>.6)addRep(r.id,1,'safer trade lanes');});}
  if(v==='loot'){E.state='disabled';V.fireUntil=performance.now()+600;sfx('fire');const got=[];for(let i=0;i<2;i++){const id=pick(Math.random,SB_RES).id;const q=addCargo(id,2+Math.floor(Math.random()*3));if(q)got.push(q+' '+RES[id].name);}
    damage(2,'return fire');E.result='Engines disabled in one volley. You looted '+(got.join(' and ')||'nothing (hold full)')+'.';
    if(isR){bully(rid,10,'ship looted');gossip(rid,'raided');hist(rid,'You disabled and looted their ship '+E.name+'.');}else SB_RACES.forEach(r=>{if(r.respectsStrength>.5)addRep(r.id,1,'pirates punished');});}
  if(v==='spare'){damage(2,'return fire');E.state='disabled';V.fireUntil=performance.now()+600;sfx('fire');const r=rumor(isR?rid:null);E.result='Their weapons are slag, but you let them limp home. In gratitude they share intel. '+r;
    if(isR){mercy(rid,6,'spared their crew');gossip(rid,'spared',true);hist(rid,'Disabled then spared their ship '+E.name+'.');}else mercy(null,3,'');}
  if(v==='ignore'){E.state='fled';damage(3,'glancing shots');E.result='A few glancing shots scuff the paint, then they lose interest and leave.';if(isR&&RACE[rid].respectsStrength>.5)addRep(rid,-1,'seen as passive');}
  commit();
}

/* ---------------- input ---------------- */
document.addEventListener('pointerdown',()=>{audioInit();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();},{passive:true});
$('stations').addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(!b)return;V.view=b.dataset.st;V.logSel=null;V.logFrom=null;sfx('tap');
  if(V.view==='comms'&&!V.dlg&&here().owner&&G.visit.hailed)hail(act(here()));
  renderAll();});
$('panel').addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.note!=null){(G.pnotes=G.pnotes||{})[e.target.dataset.note]=e.target.value.slice(0,600);save();return;}if(e.target.id!=='mq')return;V.mq=e.target.value;renderAll();const i=$('mq');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}});
$('panel').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,v=b.dataset.v;sfx('tap');
  switch(a){
    case 'warp':warpTo(V.sel);break;
    case 'limp':{const ports=G.systems.filter(s=>s.port).sort((p,q)=>dist(G.loc,p.id)-dist(G.loc,q.id));toast('Running on fumes... limping to '+ports[0].name+'.');warpTo(ports[0].id,true);break;}
    case 'scan1':scan(1);break;case 'scan2':scan(2);break;
    case 'hail':hail(v&&residents(here()).includes(v)?v:act(here()));commit();break;
    case 'bt':btAsk(V.dlg.rid,v);commit();break;
    case 'tone':chooseTone(v);break;case 'topic':topic(v);break;case 'spec':special(+v);break;
    case 'close':V.dlg=null;commit();break;
    case 'go-trade':V.view='trade';renderAll();break;
    case 'go-tactical':V.view='tactical';renderAll();break;
    case 'port-rumor':if(G.visit.drink){if(![...$('toasts').children].some(e=>/shore leave/.test(e.textContent)))toast('Bartender: "Easy there, spacer, one\'s your limit till next shore leave."');renderAll();break;}if(G.credits>=10){G.credits-=10;G.visit.drink=1;toast(rumor(null));}commit();break;
    case 'buy':case 'sell':trade(a,v);break;
    case 'refuel':refuel();break;case 'repair':repair();break;case 'upg':buyUpg(v);break;case 'mapgo':V.logFrom=null;V.logSel=null;V.sel=+v;V.mapAt=null;V.mapFocus=+v;V.view='helm';renderAll();break;
    case 'fav-yes':favorAnswer(true);break;case 'fav-no':favorAnswer(false);break;case 'fav-give':deliverFavor(v);break;
    case 'tac':tac(v);break;
    case 'pzoom':{const o=document.createElement('div');o.id='pz';o.innerHTML='<img src="'+b.getAttribute('src')+'" alt=""><span>Tap to close</span>';o.onclick=()=>o.remove();document.body.appendChild(o);break;}case 'tipx':{const e=b.closest('.tip');if(e)e.remove();break;}case 'sellbest':sellBestHere();break;case 'confront':confront();break;case 'press':pressRelease();break;case 'escan':doShipScan();break;case 'hackask':V.hackAsk=1;renderAll();break;case 'hackno':V.hackAsk=0;renderAll();break;case 'hackgo':V.hackAsk=0;doHack();break;
    case 'hail-enc':hailEnc();commit();break;
    case 'enc-tac':encTac(v);break;
    case 'enc-close':G.enc=null;V.dlg=null;V.view='helm';commit();break;
    case 'tac-done':G.enc=null;if(V.dlg&&V.dlg.stage==='enc')V.dlg=null;V.view='helm';commit();break;
    case 'mkt':V.view='market';V.mSel=v;renderAll();break;case 'mf':V.mf=v;renderAll();break;case 'achopen':V.view='ach';renderAll();break;case 'achback':V.view='log';renderAll();break;case 'mback':V.view='comms';renderAll();break;case 'mlog':V.logFrom=null;V.view='log';V.logSel=v;renderAll();break;
    case 'logsel':V.logSel=v;renderAll();break;case 'dlglog':V.logFrom={rid:V.dlg&&V.dlg.rid};V.view='log';V.logSel=V.dlg?V.dlg.rid:null;renderAll();break;case 'dlgmis':V.logFrom={rid:V.dlg&&V.dlg.rid};V.view='missions';renderAll();break;case 'dlgstat':V.logFrom={rid:V.dlg&&V.dlg.rid};V.view='status';renderAll();break;case 'logret':V.logFrom=null;V.logSel=null;V.view='comms';renderAll();break;case 'logback':V.logSel=null;renderAll();break;
  }});

/* ---------------- title, slots, menu ---------------- */
function showTitle(){SB.state='title';$('title').classList.remove('hide');$('tContinue').style.display=lastSlot()?'block':'none';}
function startPlaying(){SB.state='play';$('title').classList.add('hide');$('modal').classList.add('hide');Object.assign(V,{view:'helm',sel:null,dlg:null,logSel:null});renderAll();}
function slotHtml(n){const s=readSlot(n);if(!s)return'<strong>Slot '+n+'</strong><span class="small">Empty</span>';
  return'<strong>Slot '+n+' · '+esc(s.systems[s.loc].name)+'</strong><span class="small">Jump '+s.turn+' · ¢'+s.credits+' · '+Object.keys(s.kn).length+' species · '+new Date(s.savedAt||s.created).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'</span>';}
function modal(html){const m=$('modal');m.innerHTML='<div class="modal">'+html+'</div>';m.classList.remove('hide');}
function slotPicker(mode){
  let h='<h3>'+(mode==='new'?'New game: choose a slot':'Load game')+'</h3>';
  for(let n=1;n<=3;n++){const has=!!readSlot(n);h+='<button class="btn slot" data-slot="'+n+'" '+(mode==='load'&&!has?'disabled':'')+'>'+slotHtml(n)+(mode==='new'&&has?'<br><span class="small" style="color:#ff8f9a">Overwrites this save</span>':'')+'</button>';}
  h+='<button class="btn" data-x="1">Cancel</button>';modal(h);
  $('modal').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;sfx('tap');if(b.dataset.x){$('modal').classList.add('hide');return;}
    const n=+b.dataset.slot;if(mode==='new'){newGame(n);save();startPlaying();showIntro();return;}else{G=migrate(readSlot(n));G.slot=n;}startPlaying();};
}
function introToast(){toast('Captain, you command the envoy ship. Explore, listen, and make friends (or not).','g');}
$('tContinue').onclick=()=>{sfx('tap');const n=lastSlot();if(n){G=migrate(readSlot(n));G.slot=n;startPlaying();}};
applyTextSize();addEventListener('pagehide',()=>{try{save();}catch(e){}});document.addEventListener('visibilitychange',()=>{if(document.hidden)try{save();}catch(e){}});
$('tNew').onclick=()=>{sfx('tap');slotPicker('new');};
$('tLoad').onclick=()=>{sfx('tap');slotPicker('load');};
$('menuBtn').onclick=()=>{sfx('tap');if(SB.state!=='play')return;
  modal('<h3>Ship menu</h3><p class="small">Autosaves after every action to slot '+(G.slot||'— (test mode)')+'.</p><button class="btn" data-m="snd">Sound: '+(AU.on?'On':'Off')+'</button><button class="btn" data-m="tips">Tutorial tips: '+(prefs().tipsOff?'Off':'On')+'</button><button class="btn" data-m="ts">Text size: '+({n:'Normal',l:'Large',xl:'Extra Large'}[prefs().ts||'n'])+'</button><button class="btn" data-m="ach">Achievements ('+Object.keys(G.ach||{}).length+'/'+ACH.length+')</button><button class="btn" data-m="load">Load game</button><button class="btn" data-m="title">Save &amp; return to title</button><button class="btn pri" data-m="x">Resume</button>');
  $('modal').onclick=e=>{const b=e.target.closest('button');if(!b)return;const m=b.dataset.m;sfx('tap');
    if(m==='snd'){setSound(!AU.on);b.textContent='Sound: '+(AU.on?'On':'Off');return;}
    if(m==='tips'){setPref('tipsOff',!prefs().tipsOff);b.textContent='Tutorial tips: '+(prefs().tipsOff?'Off':'On');return;}
    if(m==='ts'){const o=['n','l','xl'],c=prefs().ts||'n',nx=o[(o.indexOf(c)+1)%3];setPref('ts',nx);applyTextSize();b.textContent='Text size: '+{n:'Normal',l:'Large',xl:'Extra Large'}[nx];renderAll();return;}
    if(m==='ach'){$('modal').classList.add('hide');V.view='ach';renderAll();return;}
    if(m==='load'){slotPicker('load');return;}
    if(m==='title'){save();$('modal').classList.add('hide');showTitle();return;}
    $('modal').classList.add('hide');};};

/* ---------------- test hooks ---------------- */
function testSetup(mode){
  newGame(null,12345);G.slot=null;SB.state='play';$('title').classList.add('hide');
  const pr=params.get('race'),tr=pr&&RACE[pr]?pr:'vel';const vel=G.races[tr].home;
  const jump=id=>{G.loc=id;G.visit={id:++G.turn,topics:{},tradeRep:0};};
  if(mode==='log'){jump(vel);meet('vel');know('vel','loc');know('vel','tech');know('vel','wants');know('vel','rich');know('vel','allies');know('vel','enemies',['gor'],true);
    hist('vel','First contact at '+here().name+'.');hist('vel','Opened talks in a friendly tone (+6).');hist('vel','T2: Trade · sold 3 Ice Water (net +62 cr)');
    meet('gor');know('gor','loc',sys(G.races.pip.home).name,true);know('gor','tech');kn('pip').name={v:true,r:true};know('pip','wants',undefined,true);
    G.races.vel.rep=24;G.races.gor.rep=-18;V.view='log';V.logSel=tr;if(tr!=='vel'){meet(tr);know(tr,'loc');know(tr,'tech');know(tr,'wants');hist(tr,'First contact at '+sys(vel).name+'.');G.races[tr].rep=18;}}
  if(mode==='comms'){jump(vel);hail(tr);V.view='comms';}
  if(mode==='scan'){jump(vel);scan(1);V.view='science';}
  if(mode==='trade'){jump(vel);meet('vel');G.races.vel.rep=20;G.cargo={spice:3,art:2,arms:1,water:4};know('vel','wants');V.view='trade';}
  if(mode==='favor'){jump(vel);V.forceFavor=true;hail('vel');chooseTone('friendly');V.forceFavor=false;V.view='comms';}
  if(mode==='hostile'){jump(G.races.gor.home);spawnEncounter('gor');}
  if(mode==='helm'){V.view='helm';V.sel=G.races.kri.home;}
  renderAll();
}

/* ---------------- boot ---------------- */
resize();requestAnimationFrame(loop);
if('serviceWorker' in navigator&&location.protocol.startsWith('http')&&!params.get('test'))navigator.serviceWorker.register('sw.js').catch(()=>{});
const tm=params.get('test');
if(tm)testSetup(tm);else showTitle();
SB.api={travelEvent,achCheck,ACH,sellBestHere,thTag,prefs,setPref,doShipScan,doHack,hackRisk,rollAnom,confront,pressRelease,anomFound,knownShips,shipLearn,markSpoke,sawRaces,spawnEncounter,hailEnc,encTac,spoke,metRaces,note,friendlyTow,missions,missionBadgeCount,addLead,lifeTick,warpTo,arrive,foundCount,milestones,damage,repair,buyUpg,qEvent,qStart,market,fuelCost,bribeCost,yardHtml,tier,greetFor,reactLines,processGossip,gossip,leverTarget,contraSource,tipTarget,know,kn,meet,hist,addRep,mem,relOf,truth,lies,V:()=>V,special,demOf,favs,favorAnswer,deliverFavor,newGame,warpTo,scan,hail,chooseTone,topic,trade,tac,spawnEncounter,renderAll,save,readSlot,testSetup,setView:v=>{V.view=v;renderAll();}};
})();
