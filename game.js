/*! STARBOUND ENVOY v2.0.3 — © 2026 Rainwater Games (Jeff Rainwater). All rights reserved. */
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
function newGame(slot,seed){
  seed=seed||((Date.now()^Math.floor(Math.random()*1e9))>>>0);
  const r=rng(seed);
  const names=shuffle(r,SB_SYSNAMES).slice(0,40);
  const pts=[];
  const all=[...SB_PORTS.map(n=>({name:n,port:true})),...names.map(n=>({name:n}))];
  // staggered jittered grid (3 cols x 14 rows) keeps 42 systems readable on a phone map
  const cells=[];for(let rw=0;rw<14;rw++)for(let c=0;c<3;c++)cells.push([c,rw]);
  const ci=cells.findIndex(([c,rw])=>c===1&&rw===6);const order=[cells[ci],...shuffle(r,cells.filter((_,i)=>i!==ci))];
  all.forEach((s,i)=>{const [c,rw]=order[i];
    pts.push({x:.05+c*.33+(rw%2?.06:0)+(r()-.5)*.03,y:.025+rw*.0715+(r()-.5)*.02});
  });
  const systems=all.map((s,i)=>({id:i,name:s.name,port:!!s.port,x:pts[i].x,y:pts[i].y,
    type:s.port?'station':pick(r,SB_PTYPES),owner:null,rich:[],scan:0,derelict:false,tex:Math.floor(r()*1e9)}));
  const worlds=shuffle(r,systems.filter(s=>!s.port).map(s=>s.id));
  const races={};
  SB_RACES.forEach((rc,i)=>{
    const sys=systems[worlds[i]];sys.owner=rc.id;
    const pool=SB_RES.map(x=>x.id).filter(x=>!rc.wants.includes(x)&&x!==rc.taboo&&x!==rc.secretWant);
    sys.rich=shuffle(r,pool).slice(0,3);
    races[rc.id]={home:sys.id,tech:clamp(rc.techBase+Math.round((r()-.5)*2),1,5),rep:0};
  });
  systems.forEach(s=>{ if(!s.owner&&!s.port){ s.rich=shuffle(r,SB_RES.map(x=>x.id)).slice(0,2); s.derelict=r()<.45; } if(s.port) s.rich=shuffle(r,SB_RES.map(x=>x.id)).slice(0,9); });
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
function relOf(a,b){return (G.rel[pk(a,b)])||0;}
const sys=id=>G.systems[id];
const here=()=>sys(G.loc);
const homeOf=rid=>sys(G.races[rid].home);

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
}
function meet(rid){const k=kn(rid);if(!k.name||k.name.r)know(rid,'name',true);if(!k.portrait)k.portrait={v:true};}
function hist(rid,text){(G.hist[rid]=G.hist[rid]||[]).push('T'+G.turn+': '+text);}
function rumor(fromRid){
  const others=SB_RACES.filter(x=>x.id!==fromRid);
  const rid=pick(Math.random,others).id;
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
function addRep(rid,d,why,quiet){
  if(!RACE[rid]||!d)return;
  const st=G.races[rid];const old=st.rep;st.rep=clamp(Math.round((st.rep+d)*10)/10,-100,100);
  const real=Math.round(st.rep-old);
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
function migrate(g0){if(!g0||!g0.systems)return g0;const r=rng((g0.seed||1)+77);const used=new Set(g0.systems.map(s=>s.name));
  SB_RACES.forEach(rc=>{if(g0.races[rc.id])return;let x,y,best=null,bd=-1;for(let t=0;t<300;t++){x=.08+r()*.84;y=.07+r()*.86;const d=Math.min(...g0.systems.map(s=>Math.hypot(s.x-x,s.y-y)));if(d>bd){bd=d;best=[x,y];}}
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
SB_RACES.forEach(rc=>{const im=new Image();im.src=rc.img;IMG[rc.id]=im;im.onload=()=>{
  // sample eyelid colors (skin just above each eye) for blinking
  try{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);
    im._lid=rc.eyes.map(([ex,ey])=>{const d=x.getImageData(Math.round(ex*c.width),Math.round((ey-rc.eyeR*1.6)*c.height),1,1).data;return 'rgb('+d[0]+','+d[1]+','+d[2]+')';});}catch(e){im._lid=null;}
};});

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
  const im=IMG[rid],rc=RACE[rid];
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
  const R=vsRect();
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
  frameEnd(R,t);
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
function commit(){ save(); renderAll(); }
const STATIONS=[['helm','Helm','✦'],['science','Science','◎'],['comms','Comms','☏'],['trade','Trade','⇄'],['tactical','Tactical','⚔'],['log','Log','▤']];
function renderStations(){
  $('stations').innerHTML=STATIONS.map(([id,l,i])=>'<button class="sb'+(V.view===id?' on':'')+(id==='tactical'&&G.enc&&G.enc.state==='active'?' alert':'')+'" data-st="'+id+'"><i>'+i+'</i>'+l+'</button>').join('');
}
function renderHud(){
  const s=here();$('hLoc').textContent=s.name+(s.port?' (port)':'');
  $('hFuel').textContent='⛽'+Math.round(G.fuel);$('hCr').textContent='¢'+G.credits;$('hCargo').textContent='📦'+cargoUsed()+'/'+G.cargoMax;
  const o=s.owner&&kn(s.owner).loc&&!kn(s.owner).loc.r?RACE[s.owner].short+' space':(s.port?'Free port':'Uncharted');
  $('cap').textContent=vsMode()==='portrait'?RACE[V.dlg.rid].speaker+' · '+RACE[V.dlg.rid].name:vsMode()==='ship'?(G.enc.name+' · '+G.enc.state):(s.name+' · '+o);
}
function renderAll(){ if(!G)return; renderHud(); renderStations(); const fn=VIEWS[V.view]; $('panel').innerHTML=fn(); $('panel').scrollTop=V.keepScroll?$('panel').scrollTop:0; afterRender(); }
function afterRender(){ if(V.view==='helm')drawMap(); const c=$('chat');if(c)c.scrollTop=c.scrollHeight; }
function raceName(rid){const k=kn(rid);return k.name?RACE[rid].short+(k.name.r?' (rumored)':''):'Unknown species';}
function fieldHtml(rid,f,fmt){const k=kn(rid)[f];if(!k)return'<span class="unk">Unknown</span>';return esc(fmt(k.v))+(k.r?'<span class="tag">rumored</span>':'');}
const resList=a=>a.map(x=>RES[x].icon+' '+RES[x].name).join(', ');
const raceList=a=>a.length?a.map(x=>kn(x).name?RACE[x].short:'an unknown species').join(', '):'None known';

/* ---------------- views ---------------- */
const VIEWS={};
VIEWS.helm=()=>{
  const s=V.sel!=null?sys(V.sel):null;let h='<h2>HELM · GALAXY MAP</h2><canvas class="map" id="map"></canvas>';
  if(s&&s.id!==G.loc){const d=dist(G.loc,s.id),cost=fuelCost(d);
    h+='<p><b>'+esc(s.name)+'</b> · '+sysLabel(s)+'<br><span class="small">Distance '+(d*10).toFixed(1)+' ly · fuel '+cost+' of '+Math.round(G.fuel)+'</span></p>';
    if(cost<=G.fuel)h+='<button class="btn pri" data-a="warp">Engage warp to '+esc(s.name)+' (⛽ '+cost+' fuel)</button>';
    else h+='<p class="small">Not enough fuel for that jump. No problem: the ship can limp to the nearest port, where you can top up for a few credits (or free if you are broke).</p><button class="btn pri" data-a="limp">Limp to nearest port</button>';
  } else h+='<p class="small">Tap a star system to plot a course. Refuel free at Haven Station, or for about ¢1 per unit elsewhere; there is no clock, so explore at your own pace.</p>';
  if(!(s&&s.id!==G.loc))h+=refuelBtn();
  return h;
};
VIEWS.science=()=>{
  const s=here();let h='<h2>SCIENCE · '+esc(s.name.toUpperCase())+'</h2>';
  if(s.scan<1){h+='<p>Planetary sensors ready. A survey scan reveals the world, its inhabitants and its richest resources.</p><button class="btn pri" data-a="scan1">Run survey scan</button>';return h;}
  h+='<div class="kv"><b>World type</b><span>'+cap(s.type)+'</span><b>Rich in</b><span>'+resList(s.rich)+'</span>';
  if(s.owner){const st=G.races[s.owner];h+='<b>Inhabitants</b><span>'+esc(RACE[s.owner].name)+'</span><b>Tech level</b><span>'+TECH_NAMES[st.tech]+' ('+st.tech+'/5) — '+techCompare(st.tech)+'</span>';}
  else if(s.port)h+='<b>Inhabitants</b><span>Mixed traders, free port</span>';
  else h+='<b>Inhabitants</b><span>None detected</span>';
  h+='</div>';
  if(s.scan<2){h+='<p class="small">A deep scan sweeps subspace chatter, buried ruins and encrypted traffic for hidden intel (uses 3 fuel).</p><button class="btn pri" data-a="scan2">Run deep scan</button>';}
  else h+='<p class="small">Deep scan complete. Findings are in your Computer Log.</p>'+(V.lastScan?'<div class="say">'+V.lastScan.map(esc).join('<br>')+'</div>':'');
  return h;
};
VIEWS.comms=()=>{
  const s=here();const D=V.dlg;
  if(G.enc&&G.enc.state==='active'&&!D)return'<h2>COMMS</h2><p>An armed vessel, the <b>'+esc(G.enc.name)+'</b>, is on an intercept course.</p><button class="btn pri" data-a="go-tactical">Go to Tactical</button>';
  if(!D){
    if(!s.owner)return'<h2>COMMS</h2><p>'+(s.port?'Port control waves you through: "Welcome to '+esc(s.name)+', Captain. Trade and fuel are open."':'Only static and distant pulsar chirps. Nobody here to hail.')+'</p>'+(s.port?'<button class="btn" data-a="port-rumor">Buy a drink and listen for rumors</button>':'');
    return'<h2>COMMS</h2><p>A planetary channel is available'+(kn(s.owner).name?' to the <b>'+esc(RACE[s.owner].name)+'</b>':'')+'.</p><button class="btn pri" data-a="hail">Open hailing frequencies</button>';
  }
  const rc=RACE[D.rid];let h='<h2>COMMS · '+esc(rc.short.toUpperCase())+'</h2>';
  h+='<div id="chat">'+D.lines.map(l=>l.me?'<div class="bub me">'+(l.tone?'<span class="tone">'+esc(l.tone)+'</span>':'')+esc(l.text)+'</div>':
    l.who?'<div class="bub them"><span class="who">'+esc(l.who)+'</span>'+esc(l.text)+'</div>':'<div class="bub note">'+esc(l.text)+'</div>').join('')+'</div>';
  if(D.stage==='tone'){SB_TONES.forEach(tn=>{h+='<button class="btn" data-a="tone" data-v="'+tn.id+'"><span class="tone">'+tn.label+'</span>'+esc(tn.line)+'</button>';});}
  else if(false){h+='<p class="small">Reward: '+favorRewardText(D.offer)+' · takes 1 hold slot · no time limit</p><button class="btn pri" data-a="fav-yes">"Happy to help."</button><button class="btn" data-a="fav-no">"Not this time."</button>';}
  else if(D.stage==='special'){rc.special.options.forEach((o,i)=>{h+='<button class="btn" data-a="spec" data-v="'+i+'">'+esc(o.t)+'</button>';});}
  else{
    const T=G.visit.topics;
    if(!T.needs)h+='<button class="btn" data-a="topic" data-v="needs">"What do your people need?"</button>';
    if(!T.politics)h+='<button class="btn" data-a="topic" data-v="politics">"Who are your friends, and your rivals?"</button>';
    if(!T.region)h+='<button class="btn" data-a="topic" data-v="region">"What news from the region?"</button>';
    if(!T.special)h+='<button class="btn" data-a="topic" data-v="special">"Is there anything we can do for each other?"</button>';
    if(rc.nemesis&&rc.intel&&!T.intel&&kn(rc.nemesis).name)h+='<button class="btn pri" data-a="topic" data-v="intel"><span class="tone">Intel</span>'+esc(rc.intel.ask)+' ('+esc(intelGrade(intelScore(rc.nemesis)-intelSold(D.rid)))+')</button>';
    const gift=giftable(D.rid);if(gift&&!T.gift)h+='<button class="btn" data-a="topic" data-v="gift">Offer a gift of '+esc(RES[gift].name)+'</button>';
    if(D.offer)h+='<p class="small">Favor reward: '+favorRewardText(D.offer)+' · takes 1 hold slot · no time limit</p><button class="btn pri" data-a="fav-yes"><span class="tone">Favor</span>"Happy to help."</button><button class="btn" data-a="fav-no">"Not this time."</button>';
    favs().filter(f=>f.state==='open').forEach(f=>{const ok=f.to===D.rid,K=FAV_KIND[f.kind];if(f.from===D.rid)return;
      h+='<button class="btn'+(ok?' pri':' warn')+'" data-a="fav-give" data-v="'+f.id+'">'+(ok?'<span class="tone">Favor</span>Deliver the ':'<span class="tone">Off-book</span>Hand over the ')+esc(RACE[f.from].short)+' '+esc(K.item.toLowerCase())+(ok?'':' (meant for the '+esc(RACE[f.to].short)+')')+'</button>';});
    if(rc.liar&&G.visit.lied&&G.visit.lied[D.rid]&&!T.callout){const pf=lieProof(D.rid);h+='<button class="btn'+(pf?' pri':' warn')+'" data-a="topic" data-v="callout"><span class="tone">'+(pf?'Proof':'Bluff')+'</span>"That\'s a lie, and I can prove it."</button>';}
    if(!T.press)h+='<button class="btn warn" data-a="topic" data-v="press"><span class="tone">Threat</span>"Hand over your best cargo, or else."</button>';
    h+='<button class="btn pri" data-a="go-trade">Open trade channel</button><button class="btn" data-a="close">Close channel</button>';
  }
  return h;
};
VIEWS.trade=()=>{
  const s=here();let h='<h2>CARGO · TRADE</h2>';
  const m=market();
  if(m.refuse)return h+'<p>'+esc(m.refuse)+'</p>'+cargoTable(null);
  h+='<p class="small">'+esc(m.note)+'</p>';
  h+=refuelBtn();
  h+='<div class="row small"><span class="n">Good</span><span class="q">Hold</span><span style="width:58px;text-align:center">Buy</span><span style="width:58px;text-align:center">Sell</span></div>';
  m.items.forEach(it=>{const have=G.cargo[it.id]||0;const r=RES[it.id];
    h+='<div class="row"><span class="n">'+r.icon+' '+esc(r.name)+(it.tag?'<span class="tag '+(it.tag==='wanted'?'w':'')+'">'+it.tag+'</span>':'')+(it.dem!=null&&it.tag==='wanted'?'<span class="dl'+(it.full?' sat':'')+'">'+demLabel(it.dem)+'</span>':'')+'</span><span class="q">'+have+'</span>'+
    '<button data-a="buy" data-v="'+it.id+'" '+(it.buy==null||G.credits<it.buy||cargoUsed()>=G.cargoMax?'disabled':'')+'>'+(it.buy==null?'—':'¢'+it.buy)+'</button>'+
    '<button data-a="sell" data-v="'+it.id+'" '+(!have?'disabled':'')+'>'+(it.full?'Full':'¢'+it.sell)+'</button></div>';});
  if(favorCount())h+=cargoTable();
  if(m.items.some(x=>x.full))h+='<p class="small">'+esc(FULL_LINE[here().owner]||'')+'</p>';
  h+='<p class="small">Wanted goods fetch less as a market fills up; demand recovers a little with every warp jump.</p>';
  return h;
};
function cargoTable(){const ids=Object.keys(G.cargo).filter(k=>G.cargo[k]>0);const fv=favs().filter(f=>f.state==='open').map(f=>FAV_KIND[f.kind].icon+' '+FAV_KIND[f.kind].item+' (favor)');const all=ids.map(k=>RES[k].icon+' '+RES[k].name+' ×'+G.cargo[k]).concat(fv);return'<p class="small">Hold: '+(all.length?all.join(', '):'empty')+'</p>';}
VIEWS.tactical=()=>{
  const E=G.enc;let h='<h2>TACTICAL</h2>';
  if(!E)return h+'<p>Shields up, weapons cold. No threats on sensors.</p><p class="small">Your ship outclasses anything in this sector. When hostiles appear, how you handle them is a political choice: other races are watching.</p>';
  const who=RACE[E.race]?RACE[E.race].name:SB_PIRATES.short;
  if(E.state==='active'){
    h+='<p><b>'+esc(E.name)+'</b> ('+esc(who)+') has locked weapons on you. Their weapons can\'t breach your shields.</p>';
    h+='<button class="btn" data-a="tac" data-v="scare"><span class="tone">Firm</span>Hail: "Stand down and leave. Now."</button>';
    h+='<button class="btn warn" data-a="tac" data-v="loot"><span class="tone">Bully</span>Disable their engines and loot the hold</button>';
    h+='<button class="btn" data-a="tac" data-v="spare"><span class="tone">Mercy</span>Disable their weapons, then spare them</button>';
    h+='<button class="btn" data-a="tac" data-v="ignore"><span class="tone">Calm</span>Ignore them and hold position</button>';
  } else h+='<p>'+esc(E.result||'')+'</p><button class="btn pri" data-a="tac-done">Stand down from alert</button>';
  return h;
};
VIEWS.log=()=>{
  let h='<h2>COMPUTER LOG</h2>';
  if(V.logSel)return h+logEntry(V.logSel);
  h+=favorsHtml();
  const ids=SB_RACES.map(r=>r.id).filter(id=>G.kn[id]);
  if(!ids.length)h+='<p class="small">No species on record yet. Hail, scan, and listen for rumors to fill the log.</p>';
  ids.forEach(id=>{const k=kn(id),rc=RACE[id];h+='<button class="lr" data-a="logsel" data-v="'+id+'">'+(k.portrait?'<img src="'+rc.img+'" alt="">':'<span class="pt">?</span>')+
    '<div><strong>'+esc(raceName(id))+'</strong>'+(k.portrait?esc(rc.kind):'<span class="unk">No visual contact</span>')+'<br>Reputation: '+(k.portrait?repLabel(G.races[id].rep)+' ('+Math.round(G.races[id].rep)+')':'<span class="unk">Unknown</span>')+'</div></button>';});
  const unk=SB_RACES.length-ids.length;
  if(unk>0)h+='<p class="small">'+unk+' more signal source'+(unk>1?'s':'')+' detected but uncharted.</p>';
  return h;
};
function logEntry(id){
  const k=kn(id),rc=RACE[id],st=G.races[id];
  let h='<button class="btn" data-a="logback">‹ All species</button>';
  h+=k.portrait?'<img class="big" src="'+rc.img+'" alt="'+esc(rc.short)+'">':'<div class="pt" style="width:100%;height:120px">?</div>';
  h+='<h2 style="margin-top:8px">'+esc(raceName(id))+'</h2>';
  h+='<div class="kv">';
  h+='<b>Species</b><span>'+(k.portrait?esc(rc.kind):'<span class="unk">Unknown</span>')+'</span>';
  h+='<b>Personality</b><span>'+(k.portrait?esc(rc.hint):'<span class="unk">Unknown</span>')+'</span>';
  h+='<b>'+(rc.nomad?'Last seen':'Homeworld')+'</b><span>'+fieldHtml(id,'loc',v=>v)+'</span>';
  h+='<b>Tech level</b><span>'+fieldHtml(id,'tech',v=>TECH_NAMES[v]+' ('+v+'/5), '+techCompare(v))+'</span>';
  h+='<b>Wants</b><span>'+fieldHtml(id,'wants',resList)+'</span>';
  h+='<b>Planet has</b><span>'+fieldHtml(id,'rich',resList)+'</span>';
  h+='<b>Hidden want</b><span>'+fieldHtml(id,'secret',v=>RES[v].icon+' '+RES[v].name)+'</span>';
  h+='<b>Taboo good</b><span>'+fieldHtml(id,'taboo',v=>RES[v].icon+' '+RES[v].name)+'</span>';
  h+='<b>Reputation</b><span>'+(k.portrait?repLabel(st.rep)+' ('+Math.round(st.rep)+')':'<span class="unk">Unknown</span>')+'</span>';
  h+='<b>Allies</b><span>'+fieldHtml(id,'allies',raceList)+'</span>';
  h+='<b>At war with</b><span>'+fieldHtml(id,'enemies',raceList)+'</span>';
  h+='</div><h2>DEALINGS</h2>';
  const H=G.hist[id]||[];h+=H.length?H.slice().reverse().map(x=>'<div class="hist">'+esc(x)+'</div>').join(''):'<p class="small">No dealings yet.</p>';
  return h;
}
const cap=s=>s[0].toUpperCase()+s.slice(1);
function techCompare(v){const known=SB_RACES.map(r=>kn(r.id).tech).filter(Boolean).map(x=>x.v);const avg=known.length?known.reduce((a,b)=>a+b,0)/known.length:3;
  return v>avg+.4?'more advanced than most known races':v<avg-.4?'less advanced than most known races':'about average among known races';}
function sysLabel(s){if(s.port)return'Free port';if(s.owner){const k=kn(s.owner).loc;if(k&&k.v===s.name)return RACE[s.owner].short+' homeworld'+(k.r?' (rumored)':'');}
  const rum=SB_RACES.find(r=>{const k=kn(r.id).loc;return k&&k.r&&k.v===s.name;});if(rum)return rum.short+' homeworld (rumored)';
  return s.scan?(s.owner?'Inhabited':'Uninhabited'):'Unexplored';}

/* ---------------- helm ---------------- */
function dist(a,b){return Math.hypot(sys(a).x-sys(b).x,sys(a).y-sys(b).y);}
function fuelCost(d){return Math.max(4,Math.round(d*38));}
function drawMap(){
  const c=$('map');if(!c)return;const w=c.clientWidth,h=Math.round(w*2.3);c.style.height=h+'px';c.width=w*DPR;c.height=h*DPR;const x=c.getContext('2d');x.setTransform(DPR,0,0,DPR,0,0);
  x.fillStyle='#040814';x.fillRect(0,0,w,h);x.strokeStyle='#10203d';for(let i=1;i<8;i++){x.beginPath();x.moveTo(i*w/8,0);x.lineTo(i*w/8,h);x.stroke();x.beginPath();x.moveTo(0,i*h/8);x.lineTo(w,i*h/8);x.stroke();}
  const P=s=>[12+s.x*(w-24),12+s.y*(h-24)];
  const cur=P(here());
  if(V.sel!=null&&V.sel!==G.loc){const p=P(sys(V.sel));x.setLineDash([4,4]);x.strokeStyle='#ffcf6a';x.beginPath();x.moveTo(cur[0],cur[1]);x.lineTo(p[0],p[1]);x.stroke();x.setLineDash([]);}
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
    let lx=px+8;if(bad(lx)){const L2=px-8-W2();if(!bad(L2))lx=L2;else{while(tx.length>4&&bad(lx)){tx=tx.slice(0,-2)+'…';}}}
    const ww=W2();LR.push({l:lx-2,r:lx+ww+2,t:py-7,b:py+(two?16:5)});
    x.fillStyle=s.id===G.loc?'#bfe3ff':'#8ea3c8';x.fillText(tx,lx,py-1);
    if(two){x.fillStyle=/rumored/.test(lab)?'#c9a050':'#7fe7a8';x.fillText(t2,lx,py+10);}
  });
  c.onclick=e=>{const r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let best=null,bd=30;G.systems.forEach(s=>{const [px,py]=P(s);const d=Math.hypot(px-mx,py-my);if(d<bd){bd=d;best=s.id;}});
    if(best!=null){V.sel=best;sfx('tap');renderAll();setTimeout(()=>{const b=document.querySelector('[data-a=warp],[data-a=limp]');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});},50);}};
}
function warpTo(id,limp){
  const d=dist(G.loc,id);G.fuel=Math.max(0,G.fuel-(limp?G.fuel:fuelCost(d)));G.loc=id;G.turn++;V.sel=null;V.dlg=null;G.visit={id:G.turn,topics:{},tradeRep:0};V.lastScan=null;nomadDrift();
  V.warpT=performance.now()+1300;sfx('warp');V.view='helm';renderAll();
  setTimeout(arrive,1300);
}
function arrive(){
  const s=here();
  if(s.port){if(G.fuel<G.fuelMax){G.fuel=G.fuelMax;toast('Port tenders top up your fuel. No charge.','g');}}
  if(s.owner&&kn(s.owner).loc&&kn(s.owner).loc.r){ if(kn(s.owner).loc.v===s.name)toast('Rumor confirmed: '+RACE[s.owner].short+' homeworld.','g'); }
  SB_RACES.forEach(r=>{const k=kn(r.id).loc;if(k&&k.r&&k.v===s.name&&s.owner!==r.id){delete kn(r.id).loc;toast('Rumor about the '+r.short+' homeworld proved false.','b');}});
  if(s.owner&&(kn(s.owner).loc||s.scan))know(s.owner,'loc');
  if(!s.port&&Math.random()<.3)spawnEncounter();
  commit();
}
function spawnEncounter(forceRace){
  const pool=SB_RACES.filter(r=>G.races[r.id].rep<30&&!r.neverHostile);const race=forceRace||(Math.random()<.4||!pool.length?'pir':pick(Math.random,pool).id);
  const src=RACE[race]||SB_PIRATES;G.enc={race,name:pick(Math.random,src.ships),state:'active'};
  if(RACE[race])meet(race);
  V.view='tactical';V.dlg=null;sfx('alert');toast('Red alert: the '+G.enc.name+' is closing in.','b');
}

/* ---------------- science ---------------- */
function scan(level){
  const s=here();V.scanUntil=performance.now()+1500;sfx('scan');const out=[];
  if(level===1){s.scan=1;if(s.owner){know(s.owner,'name');know(s.owner,'loc');know(s.owner,'tech');know(s.owner,'rich');out.push('Identified the '+RACE[s.owner].name+'.');toast('Log updated: '+RACE[s.owner].short,'g');}
  } else {
    G.fuel=Math.max(0,G.fuel-3);s.scan=2;
    if(s.owner){know(s.owner,'secret');know(s.owner,'taboo');const f=pick(Math.random,['allies','enemies']);know(s.owner,f);
      out.push('Decrypted trade manifests: the '+RACE[s.owner].short+' quietly crave '+RES[RACE[s.owner].secretWant].name+'.');
      out.push('Cultural archive: they consider '+RES[RACE[s.owner].taboo].name+' taboo.');
      out.push('Military traffic shows they '+describe(s.owner,f,truth(s.owner,f))+'.');}
    else if(s.derelict&&!s.looted){s.looted=true;const q=2+Math.floor(Math.random()*3);addCargo('relics',q);out.push('Found a derelict hulk. Salvaged '+q+' Ancient Relics.');}
    else out.push('Subspace echoes only. No hidden structures.');
    out.push(rumor(s.owner));
  }
  V.lastScan=out;commit();
}
function addCargo(id,q){const room=G.cargoMax-cargoUsed();q=Math.min(q,room);if(q>0)G.cargo[id]=(G.cargo[id]||0)+q;return q;}

/* ---------------- comms ---------------- */
function hail(rid){
  meet(rid);know(rid,'loc');const st=G.races[rid],rc=RACE[rid];
  if(G.visit.hailed&&G.visit.hailed.tone){V.dlg={rid,stage:'topics',lines:chatOf(rid)};opener(rid);V.dlg.lines.push({who:rc.speaker,text:'"Back again so soon, Captain? Go on."'});V.talkUntil=performance.now()+2000;return;}
  const g=st.rep>=30?rc.greet.hi:st.rep<=-15?rc.greet.lo:rc.greet.mid;
  V.dlg={rid,stage:'tone',lines:chatOf(rid)};opener(rid);V.dlg.lines.push({who:rc.speaker,text:g});G.visit.hailed={};V.talkUntil=performance.now()+2600;
  if(!G.hist[rid])hist(rid,'First contact at '+here().name+'.');
  if(rc.giftChance&&!G.visit.gifted&&(V.forceGift||Math.random()<rc.giftChance)){G.visit.gifted=1;nomadGift(rid);}
}
function nomadGift(rid){const rc=RACE[rid];let t;
  if(Math.random()<.5||cargoUsed()>=G.cargoMax){const c=20+Math.floor(Math.random()*41);G.credits+=c;t='The '+rc.short+' transfer ¢'+c+' to you, unasked.';hist(rid,'Gave you a gift of ¢'+c+'.');}
  else{const it=pick(Math.random,SB_RES.filter(x=>x.id!==rc.taboo)).id,q=addCargo(it,1+Math.floor(Math.random()*2));t='The '+rc.short+' beam '+q+' '+RES[it].name+' into your hold.';hist(rid,'Gave you '+q+' '+RES[it].name+'.');}
  V.dlg.lines.push({who:rc.speaker,text:(rc.gifts?pick(Math.random,rc.gifts):'"A small gift, Captain. Take it."')});V.dlg.lines.push({who:'',text:t});sfx('coin');}
function nomadDrift(){SB_RACES.forEach(rc=>{if(!rc.nomad||Math.random()>.3)return;const h=homeOf(rc.id);if(G.loc===h.id)return;
  const opts=G.systems.filter(s=>!s.port&&!s.owner&&s.id!==G.loc);if(!opts.length)return;const n=pick(Math.random,opts);
  n.owner=rc.id;n.rich=h.rich;n.derelict=false;h.owner=null;h.rich=shuffle(Math.random,SB_RES.map(x=>x.id)).slice(0,2);G.races[rc.id].home=n.id;
  const k=kn(rc.id).loc;if(k&&k.v===h.name){k.v=n.name;k.r=true;hist(rc.id,'Their fleet drifted from '+h.name+' toward '+n.name+' (rumored).');}});}
function opener(rid){if(rid==='ill')V.dlg.lines.push({who:RACE[rid].speaker,text:"It's me, it's me, the Illuminati!"});}
function chatOf(rid){const c=G.visit.chat=G.visit.chat||{};return c[rid]=c[rid]||[];}
function me(text,tone){V.dlg.lines.push({me:1,text,tone:tone||''});}
const TOPIC_LINE={needs:'"What do your people need?"',politics:'"Who are your friends, and your rivals?"',region:'"What news from the region?"',special:'"Is there anything we can do for each other?"',press:'"Hand over your best cargo, or else."',callout:'"That\'s a lie, and I can prove it."'};
function say(text,who){V.dlg.lines.push({who:who===undefined?RACE[V.dlg.rid].speaker:who,text});V.talkUntil=performance.now()+Math.min(4000,1000+text.length*35);}
function chooseTone(t){
  const rid=V.dlg.rid,rc=RACE[rid],[d,reply]=rc.tones[t];const tn=SB_TONES.find(x=>x.id===t);me(tn.line,tn.label);G.visit.hailed.tone=t;
  addRep(rid,d,t==='threat'?'threatened':'tone');if(rc.friendBoost&&d>0)addRep(rid,d*(rc.friendBoost-1),'eager to be liked');if(t==='threat')bully(rid,3,'');
  hist(rid,'Opened talks in a '+SB_TONES.find(x=>x.id===t).label.toLowerCase()+' tone ('+(d>=0?'+':'')+d+').');
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
  const rid=V.dlg.rid,rc=RACE[rid],st=G.races[rid];G.visit.topics[v]=1;
  if(v==='intel'){sellIntel(rid);commit();return;}
  if(v==='gift'){const g0=giftable(rid);if(g0)me('Offers a gift of '+RES[g0].name+'.','Gift');}else me(TOPIC_LINE[v],v==='press'?'Threat':'');
  if(v==='needs'){
    if(st.rep<-20){say('"What we need is for you to leave."');}
    else if(rc.liar){const fake=shuffle(Math.random,SB_RES.map(x=>x.id).filter(x=>!rc.wants.includes(x)&&x!==rc.taboo)).slice(0,3);know(rid,'wants',fake,true);lied(rid,'wants');
      say('"We pay handsomely for '+fake.map(x=>RES[x].name).join(', ')+'."');hist(rid,'Claimed to want '+fake.map(x=>RES[x].name).join(', ')+' (unverified).');}
    else{know(rid,'wants');say('"We pay handsomely for '+rc.wants.map(x=>RES[x].name).join(', ')+'."');hist(rid,'Learned what they want.');}
  } else if(v==='politics'){
    if(st.rep<0){say('"Our alliances are not your business."');}
    else{let a=truth(rid,'allies'),e=truth(rid,'enemies');
      if(rc.liar){[a,e]=[e,a];if(!a.length&&!e.length)a=[pick(Math.random,SB_RACES.filter(x=>x.id!==rid)).id];know(rid,'allies',a,true);know(rid,'enemies',e,true);lied(rid,'politics');hist(rid,'Described their alliances (unverified).');}
      else{know(rid,'allies');know(rid,'enemies');}
      a.concat(e).forEach(x=>{if(!G.kn[x])G.kn[x]={};if(!kn(x).name)kn(x).name={v:true,r:false};});
      say('"Our friends: '+(a.length?a.map(x=>RACE[x].short).join(', '):'none worth naming')+'. Our enemies: '+(e.length?e.map(x=>RACE[x].short).join(', '):'none, for now')+'."');}
  } else if(v==='region'){
    const r=rumor(rid);say('"Travelers talk. Here is what we hear..."');V.dlg.lines.push({who:'',text:r});
  } else if(v==='callout'){
    if(lieProof(rid)){const[d,l]=rc.liar.caught;addRep(rid,d,'caught lying');say(l);['wants','allies','enemies'].forEach(f=>{const k=kn(rid)[f];if(k&&k.r)delete kn(rid)[f];know(rid,f);});
      say('"We pay for '+rc.wants.map(x=>RES[x].name).join(', ')+'. We '+describe(rid,'allies',truth(rid,'allies'))+'; we '+describe(rid,'enemies',truth(rid,'enemies'))+'."');hist(rid,'Caught them lying. The log now shows the truth.');sfx('ok');}
    else{const[d,l]=rc.liar.bluff;addRep(rid,d,'baseless accusation');say(l);hist(rid,'Accused them of lying with no proof ('+d+').');sfx('bad');}
  } else if(v==='special'){say(rc.special.prompt,'');V.dlg.stage='special';}
  else if(v==='gift'){
    const g=giftable(rid);if(g){G.cargo[g]--;const secret=g===rc.secretWant;ripple(rid,secret?9:6,'gift');hist(rid,'Gave a gift of '+RES[g].name+'.');
      say(secret?'"How did you know? This is... precious to us. Thank you."':'"A thoughtful gift. We will remember it."');if(secret)know(rid,'secret');sfx('coin');}
  } else if(v==='press'){
    // bullying a planet: strength-respecters may pay tribute
    const ok=rc.respectsStrength>=.5||G.races[rid].tech<3;
    if(ok){const it=pick(Math.random,homeOf(rid).rich);const q=addCargo(it,3);say('"...Fine. Take '+q+' '+RES[it].name+' and go."');bully(rid,8,'extortion');hist(rid,'Extorted '+q+' '+RES[it].name+'.');}
    else{say('"You will get nothing from us but a long memory."');bully(rid,6,'extortion');hist(rid,'Attempted extortion; refused.');}
    sfx('bad');
  }
  commit();
}
/* intel market: races with a nemesis pay for what you know about it. Only new intel pays. */
function intelScore(t){const k=G.kn[t]||{};let s=0;for(const f in k){if(k[f])s+=k[f].r?1:2;}
  s+=Math.min(6,(G.hist[t]||[]).length);favs().forEach(f=>{if(f.state!=='offer'&&(f.to===t||f.from===t))s+=2;});return s;}
function intelSold(rid){return (G.intelSold=G.intelSold||{})[rid]||0;}
function intelGrade(d){return d<=0?'nothing new':d<4?'scraps':d<10?'solid':'explosive';}
function sellIntel(rid){const rc=RACE[rid],t=rc.nemesis,I=rc.intel,sc=intelScore(t),d=sc-intelSold(rid);
  me('Shares everything you know about the '+RACE[t].short+'.','Intel');
  if(!kn(t).name){say(I.none);return;}
  if(d<=0){say(I.stale);addRep(rid,1,'tried to help');return;}
  G.intelSold[rid]=sc;const cr=30+d*25;G.credits+=cr;let r='+¢'+cr;
  if(d>=6){const it=pick(Math.random,SB_RES.filter(x=>x.id!==rc.taboo)).id,q=addCargo(it,2+Math.floor(d/4));if(q)r+=', '+q+' '+RES[it].name;}
  say(d>=8?I.big:I.small);V.dlg.lines.push({who:'',text:'The '+rc.short+' pay for your intel on the '+RACE[t].short+': '+r+'.'});
  ripple(rid,Math.min(18,3+Math.round(d*1.5)),'intel on the '+RACE[t].short);know(rid,'enemies');
  hist(rid,'Sold intel on the '+RACE[t].short+' ('+intelGrade(d)+', '+r+').');hist(t,'You sold their secrets to the '+rc.short+'.');G.intelSold[rid]=intelScore(t);sfx('coin');}
function special(i){
  const rid=V.dlg.rid,rc=RACE[rid],o=rc.special.options[i];V.dlg.stage='topics';
  me(o.t);say(o.reply.replace(/^"|"$/g,'').length?o.reply:o.reply);
  if(o.rep>=0)ripple(rid,o.rep,'');else addRep(rid,o.rep,'');
  hist(rid,o.t+' ('+(o.rep>=0?'+':'')+o.rep+').');
  if(o.fx==='tech'&&!G.hydro){G.hydro=1;G.fuelMax+=25;G.fuel=G.fuelMax;toast('Imperial hydro-condenser fitted: +25 fuel capacity.','g');}
  if(o.fx==='empath'){G.empRead=1;toast(rc.short+' empaths will now sense when others lie to you.','g');}
  if(o.fx==='intel'){know(rid,'secret');}
  if(o.fx==='reckless'){SB_RACES.forEach(r=>{if(r.hatesBullies>=.5&&r.id!==rid)addRep(r.id,-2,'reckless weapons fire');});V.fireUntil=performance.now()+600;sfx('fire');}
  if(o.fx==='charts'){const others=SB_RACES.filter(r=>r.id!==rid&&!(kn(r.id).loc&&!kn(r.id).loc.r));if(others.length){const t=pick(Math.random,others).id;if(!kn(t).name)kn(t).name={v:true,r:false};know(t,'loc');toast('Star charts: '+RACE[t].short+' homeworld located.','g');}}
  sfx(o.rep>=0?'ok':'bad');commit();
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
  if(here_===f.to){f.state='done';me('Hands over the '+K.item.toLowerCase()+' from the '+RACE[f.from].short+'.');
    const shady=f.kind==='dossier';addRep(f.from,shady?10:8,'favor delivered');addRep(f.to,shady?1:6,'favor received');
    say(shady?'"A dossier? How... interesting. Thank you, Captain."':'"From the '+RACE[f.from].short+'? How kind. Our thanks, Captain."');
    let r='Favor complete for the '+RACE[f.from].short+'.';if(f.credits){G.credits+=f.credits;r+=' +¢'+f.credits+'.';}
    if(f.intel){const t=favorIntel();V.dlg.lines.push({who:'',text:'Intel from the '+RACE[f.from].short+': '+t+'.'});r+=' Intel logged.';}
    hist(f.from,'Delivered their '+K.item.toLowerCase()+' to the '+RACE[f.to].short+'.');hist(f.to,'Received a '+K.item.toLowerCase()+' from the '+RACE[f.from].short+' via you.');toast(r,'g');sfx('coin');}
  else{f.state='betrayed';f.gaveTo=here_;me('Hands the '+RACE[f.from].short+' '+K.item.toLowerCase()+' to the '+RACE[here_].short+' instead.');
    const enemy=relOf(f.from,here_)===-1;addRep(f.from,enemy?-15:-6,'favor misdelivered');addRep(here_,enemy?8:2,'gained leverage');
    if(enemy)SB_RACES.forEach(o=>{if(o.id!==f.from&&o.id!==here_&&relOf(f.from,o.id)===1)addRep(o.id,-3,'betrayed an ally');});
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
  const rid=s.owner,rc=RACE[rid],st=G.races[rid];
  if(!kn(rid).portrait)return{refuse:'Hail the locals before trading. Your hold:'};
  if(st.rep<-30)return{refuse:rc.short+' traders refuse to deal with you. Improve your reputation first. Your hold:'};
  const f=1+st.rep/300;const items=[];
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
  const rid=s.owner,rc=RACE[rid];
  if(kind==='sell'&&rid&&id===rc.taboo){addRep(rid,-6,'offered a taboo good');know(rid,'taboo');toast(rc.short+' are offended: '+RES[id].name+' is taboo to them!','b');sfx('bad');hist(rid,'Offended them by offering '+RES[id].name+'.');commit();return;}
  if(kind==='buy'){if(it.buy==null||G.credits<it.buy||cargoUsed()>=G.cargoMax)return;G.credits-=it.buy;G.cargo[id]=(G.cargo[id]||0)+1;bumpAdd(s.id,id);}
  else{if(!G.cargo[id])return;if(it.full){toast(FULL_LINE[rid]||'They have plenty of that for now.');V.keepScroll=true;renderAll();V.keepScroll=false;return;}
    G.cargo[id]--;G.credits+=it.sell;if(it.dem!=null)demSet(rid,id,it.dem-DEM_DROP);}
  sfx('coin');
  if(rid){if(G.visit.tradeRep<5){G.visit.tradeRep++;ripple(rid,1,'trade');}
    if(kind==='sell'&&(rc.wants.includes(id)))know(rid,'wants');
    const H=G.hist[rid]=G.hist[rid]||[];const key='T'+G.turn+': Trade';const ledger=G.visit.ledger=G.visit.ledger||{b:{},s:{},net:0};
    (kind==='buy'?ledger.b:ledger.s)[id]=((kind==='buy'?ledger.b:ledger.s)[id]||0)+1;ledger.net+=kind==='buy'?-it.buy:it.sell;
    const txt=key+(Object.keys(ledger.b).length?' · bought '+Object.entries(ledger.b).map(([k,v])=>v+' '+RES[k].name).join(', '):'')+(Object.keys(ledger.s).length?' · sold '+Object.entries(ledger.s).map(([k,v])=>v+' '+RES[k].name).join(', '):'')+' (net '+(ledger.net>=0?'+':'')+ledger.net+' cr)';
    if(H.length&&H[H.length-1].startsWith(key))H[H.length-1]=txt;else H.push(txt);}
  V.keepScroll=true;commit();V.keepScroll=false;
}

/* ---------------- tactical ---------------- */
function tac(v){
  const E=G.enc,rid=E.race,isR=!!RACE[rid];const nm=isR?RACE[rid].short:'Corsair';
  if(v==='scare'){E.state='fled';E.result='The '+E.name+' turns tail and runs. No shots fired.';if(isR){addRep(rid,-1,'intimidated');SB_RACES.forEach(r=>{if(r.respectsStrength>.5&&r.id!==rid)addRep(r.id,1,'respects your resolve');});hist(rid,'Scared off their ship '+E.name+'.');}else SB_RACES.forEach(r=>{if(r.hatesBullies>.6)addRep(r.id,1,'safer trade lanes');});}
  if(v==='loot'){E.state='disabled';V.fireUntil=performance.now()+600;sfx('fire');const got=[];for(let i=0;i<2;i++){const id=pick(Math.random,SB_RES).id;const q=addCargo(id,2+Math.floor(Math.random()*3));if(q)got.push(q+' '+RES[id].name);}
    E.result='Engines disabled in one volley. You looted '+(got.join(' and ')||'nothing (hold full)')+'.';
    if(isR){bully(rid,10,'ship looted');hist(rid,'You disabled and looted their ship '+E.name+'.');}else SB_RACES.forEach(r=>{if(r.respectsStrength>.5)addRep(r.id,1,'pirates punished');});}
  if(v==='spare'){E.state='disabled';V.fireUntil=performance.now()+600;sfx('fire');const r=rumor(isR?rid:null);E.result='Their weapons are slag, but you let them limp home. In gratitude they share intel. '+r;
    if(isR){mercy(rid,6,'spared their crew');hist(rid,'Disabled then spared their ship '+E.name+'.');}else mercy(null,3,'');}
  if(v==='ignore'){E.state='fled';E.result='Their shots splash harmlessly off your shields. Bored, they leave.';if(isR&&RACE[rid].respectsStrength>.5)addRep(rid,-1,'seen as passive');}
  commit();
}

/* ---------------- input ---------------- */
document.addEventListener('pointerdown',()=>{audioInit();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();},{passive:true});
$('stations').addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(!b)return;V.view=b.dataset.st;V.logSel=null;sfx('tap');
  if(V.view==='comms'&&!V.dlg&&here().owner&&G.visit.hailed)hail(here().owner);
  renderAll();});
$('panel').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,v=b.dataset.v;sfx('tap');
  switch(a){
    case 'warp':warpTo(V.sel);break;
    case 'limp':{const ports=G.systems.filter(s=>s.port).sort((p,q)=>dist(G.loc,p.id)-dist(G.loc,q.id));toast('Running on fumes... limping to '+ports[0].name+'.');warpTo(ports[0].id,true);break;}
    case 'scan1':scan(1);break;case 'scan2':scan(2);break;
    case 'hail':hail(here().owner);commit();break;
    case 'tone':chooseTone(v);break;case 'topic':topic(v);break;case 'spec':special(+v);break;
    case 'close':V.dlg=null;commit();break;
    case 'go-trade':V.view='trade';renderAll();break;
    case 'go-tactical':V.view='tactical';renderAll();break;
    case 'port-rumor':if(G.credits>=10){G.credits-=10;toast(rumor(null));}commit();break;
    case 'buy':case 'sell':trade(a,v);break;
    case 'refuel':refuel();break;
    case 'fav-yes':favorAnswer(true);break;case 'fav-no':favorAnswer(false);break;case 'fav-give':deliverFavor(v);break;
    case 'tac':tac(v);break;
    case 'tac-done':G.enc=null;V.view='helm';commit();break;
    case 'logsel':V.logSel=v;renderAll();break;case 'logback':V.logSel=null;renderAll();break;
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
    const n=+b.dataset.slot;if(mode==='new'){newGame(n);save();introToast();}else{G=migrate(readSlot(n));G.slot=n;}startPlaying();};
}
function introToast(){toast('Captain, you command the envoy ship. Explore, listen, and make friends (or not).','g');}
$('tContinue').onclick=()=>{sfx('tap');const n=lastSlot();if(n){G=migrate(readSlot(n));G.slot=n;startPlaying();}};
$('tNew').onclick=()=>{sfx('tap');slotPicker('new');};
$('tLoad').onclick=()=>{sfx('tap');slotPicker('load');};
$('menuBtn').onclick=()=>{sfx('tap');if(SB.state!=='play')return;
  modal('<h3>Ship menu</h3><p class="small">Autosaves after every action to slot '+(G.slot||'— (test mode)')+'.</p><button class="btn" data-m="snd">Sound: '+(AU.on?'On':'Off')+'</button><button class="btn" data-m="load">Load game</button><button class="btn" data-m="title">Save &amp; return to title</button><button class="btn pri" data-m="x">Resume</button>');
  $('modal').onclick=e=>{const b=e.target.closest('button');if(!b)return;const m=b.dataset.m;sfx('tap');
    if(m==='snd'){setSound(!AU.on);b.textContent='Sound: '+(AU.on?'On':'Off');return;}
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
SB.api={special,demOf,favs,favorAnswer,deliverFavor,newGame,warpTo,scan,hail,chooseTone,topic,trade,tac,spawnEncounter,renderAll,save,readSlot,testSetup,setView:v=>{V.view=v;renderAll();}};
})();
