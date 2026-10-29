// صور سريعة للصفحات بالحساب التجريبي: node tools/tuto/explore.cjs OUTDIR route1 route2 …
const {chromium}=require('playwright');const F=require('./fake.cjs');
const BASE='http://localhost:8777/bureau/';
(async()=>{const [out,...routes]=process.argv.slice(2);
const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:720},deviceScaleFactor:2,serviceWorkers:'block',isMobile:true,hasTouch:true});
const p=await c.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.route(/googleapis|gstatic|unpkg|jsdelivr|cdnjs|tile\.|openstreetmap|vercel\.app/,r=>r.abort());
await F.install(p);
await p.goto(BASE);await p.waitForTimeout(1500);const sd=await p.$('#seed');if(sd){await sd.click();await p.waitForTimeout(1500);}
await F.addPhotos(p,BASE);
console.log('login',await F.login(p,BASE));
for(const r of routes){await p.evaluate(r=>location.hash='#/'+r,r);await p.waitForTimeout(1500);
 await p.evaluate(()=>document.querySelectorAll('.wl-mod').forEach(m=>m.remove()));
 await p.screenshot({path:out+'/'+(r.replace(/\//g,'_')||'home')+'.jpg',type:'jpeg',quality:70});}
await b.close();})();
