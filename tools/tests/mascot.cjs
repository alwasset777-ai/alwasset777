const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.addInitScript(()=>{localStorage.w777_wasla=JSON.stringify({lang:'ar',seenHow:1})});
await p.goto('http://localhost:8777/bureau/#/game');await p.waitForTimeout(1200);
await p.click('[data-g="0"]'); await p.click('[data-s="0"]'); await p.waitForTimeout(400);
await p.screenshot({path:(process.env.S || '/tmp')+'/masc1.png'});
// open selected, answer wrong then right
await p.click('.wl-c.sel'); await p.waitForTimeout(200);
const ans=await p.evaluate(()=>{const q=document.querySelector('.wl-card-q,.wl-card-t').textContent.trim();return W777_WL.ar[0].s[0].w.find(w=>w[1]===q)[6]});
const L=Array.from(ans);
for(let k=0;k<L.length;k++){ const wrong = k===L.length-1; const bi=await p.evaluate(([ch,wr])=>{const t=[...document.querySelectorAll('.wl-t:not(.used):not(.gone)')].find(t=>wr?t.textContent!==ch:t.textContent===ch);return +t.dataset.b},[L[k],wrong]); await p.click(`[data-b="${bi}"]`);}
await p.waitForTimeout(500); await p.screenshot({path:(process.env.S || '/tmp')+'/masc2.png'});
for(let k=0;k<L.length;k++){ const filled=await p.evaluate(k=>document.querySelectorAll('.wl-slot')[k].textContent,k); if(filled) continue; const bi=await p.evaluate(ch=>{const t=[...document.querySelectorAll('.wl-t:not(.used):not(.gone)')].find(t=>t.textContent===ch);return +t.dataset.b},L[k]); await p.click(`[data-b="${bi}"]`);}
await p.waitForTimeout(300); await p.screenshot({path:(process.env.S || '/tmp')+'/masc3.png'});
console.log(errs.join('|')||'no errors');
await b.close();})();
