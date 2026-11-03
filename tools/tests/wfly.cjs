// وصلة العقار: ملي الجواب صحيح الحروف كيطيرو للشبكة + التلميح (الشريط كيتنطط من بعد 6 ثواني بلا حركة)
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/game.html');await p.waitForTimeout(1200);
const x=await p.$('[data-x]');if(x)await x.click().catch(()=>{});await p.waitForTimeout(200);
await p.click('[data-g="0"]');await p.waitForTimeout(500);
// التلميح: 6 ثواني بلا حركة
await p.waitForTimeout(6400);const hint=await p.$eval('.wl-grid',g=>g.classList.contains('hint'));
const anim=await p.$eval('.wl-grid.hint .wl-c.sel',e=>getComputedStyle(e).animationName).catch(()=>'');
await p.screenshot({path:S+'/whint.png'});
// نفتح الكلمة المقترحة ونركبو الجواب الصحيح
await p.click('.wl-c.sel');await p.waitForTimeout(300);
const ans=await p.evaluate(()=>{const d=window.W777_WL.ar[0].s[0];const q=document.querySelector('.wl-card-q,.wl-card-t').textContent.trim();const w=d.w.find(w=>w[1].trim()===q);return w?Array.from(w[6]):null;});
for(const ch of ans){await p.evaluate(c=>{const b=[...document.querySelectorAll('.wl-t:not(.used):not(.gone)')].find(b=>b.textContent===c);b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},ch);await p.waitForTimeout(40);}
await p.waitForTimeout(250);const flying=await p.$$eval('.wl-fly',e=>e.length);const waiting=await p.$$eval('.wl-c.wait',e=>e.length);
await p.screenshot({path:S+'/wfly.png'});
await p.waitForTimeout(1500);const left=await p.$$eval('.wl-fly',e=>e.length);const okCells=await p.$$eval('.wl-c.ok',e=>e.length);
const ok=hint&&anim==='wl-hint'&&ans&&flying===ans.length&&waiting>0&&left===0&&okCells>=ans.length&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD','hint',hint,anim,'word',ans&&ans.join(''),'flying',flying,'waiting',waiting,'after',left,'ok cells',okCells,errs.join('|'));
await b.close();process.exit(bad?1:0);})();
