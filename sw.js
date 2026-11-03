/*! STARBOUND ENVOY — © 2026 Rainwater Games (Jeff Rainwater). All rights reserved. */
const V='2.0.3';const C='starbound-v'+V;
const F=['./','index.html','game.js?v='+V,'data.js?v='+V,'install.js?v='+V,'manifest.webmanifest','img/vel.webp','img/gor.webp','img/pip.webp','img/ssk.webp','img/kri.webp','img/ill.webp','img/zoh.webp','img/rex.webp','img/men.webp','img/blb.webp','img/ruk.webp','img/vhr.webp','img/thi.webp','img/ael.webp','img/nyr.webp','img/hro.webp','img/bam.webp','img/thz.webp','img/omm.webp','img/ser.webp','img/tar.webp','img/lum.webp','img/dro.webp','img/cor.webp','img/gru.webp','img/oru.webp','img/pon.webp','img/jef.webp','img/bel.webp','img/syn.webp','img/hiv.webp','img/hun.webp','img/aeo.webp','img/grz.webp','img/ket.webp','img/uth.webp','img/mah.webp','img/vho.webp','img/eph.webp','img/mit.webp','img/icon-192.png','img/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'no-cache'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==location.origin)return;
 if(/version\.json$/.test(u.pathname)){e.respondWith(fetch(req,{cache:'no-store'}));return;}
 e.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(req,cp));}return res;})
  .catch(()=>caches.match(req,{ignoreSearch:req.mode==='navigate'}).then(m=>m||caches.match('index.html'))));});
