// «تحديث كامل للتطبيق»: النسخة كتبان، الزر كيجيب آخر نسخة، والبيانات كتبقى
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/');await p.waitForTimeout(1500);await p.click('#seed');await p.waitForTimeout(1200);
await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForTimeout(2500);
const n0=await p.evaluate(async()=>(await window.W777_DB.all('properties')).length);
await p.evaluate(()=>location.hash='#/settings');await p.waitForTimeout(1500);
const ver=await p.textContent('#upd-ver');
await p.evaluate(()=>caches.open('w777-tts').then(c=>c.put('https://tts.w777.local/x',new Response('a'))));
await p.click('#upd-full');await p.waitForTimeout(4500);
const toast=await p.evaluate(()=>[...document.querySelectorAll('.toast, #toast')].map(t=>t.textContent).join(' '));
const n1=await p.evaluate(async()=>(await window.W777_DB.all('properties')).length);
const url=await p.evaluate(()=>location.href);const keys=await p.evaluate(()=>caches.keys());
const ok=/^v\d+$/.test(ver)&&n1===n0&&n0>0&&!/\?u=/.test(url)&&keys.includes('w777-tts')&&!errs.length;
console.log(ok?'OK':'BAD','version',ver,'props',n0,'→',n1,'| toast:',toast.trim().slice(0,60),'| url',url.replace(/^.*bureau\//,''),'| caches',keys.join(','),errs.join('|'));
await b.close();process.exit(ok?0:1);})();
