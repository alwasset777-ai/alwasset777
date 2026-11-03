// وصلة العقار: سحب الشريط على الكلمة (كيكبر مع السحب) + الحروف كتدخل بلا ما تتعاود البطاقة
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
for(const vw of [{width:390,height:844,hasTouch:true},{width:1200,height:900}]){
const p=await b.newPage({viewport:{width:vw.width,height:vw.height},hasTouch:!!vw.hasTouch});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/game.html');await p.waitForTimeout(1200);
const x=await p.$('[data-x]');if(x)await x.click().catch(()=>{});await p.waitForTimeout(200);
await p.click('[data-g="0"]');await p.waitForTimeout(500);
// الكلمة المحددة (خانات .sel) — نسحبو من الأولى للأخيرة
const box=await p.$$eval('.wl-c.sel',els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];}));
const n=box.length;const [a,z]=[box[0],box[n-1]];
await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move((a[0]+z[0])/2,(a[1]+z[1])/2,{steps:4});await p.mouse.move(z[0],z[1],{steps:4});
const lit=await p.$$eval('.wl-c.drg',e=>e.length);const sc=await p.$eval('.wl-c.drg',e=>getComputedStyle(e).transform);
if(vw.width===390)await p.screenshot({path:S+'/wdrag.png'});
await p.mouse.up();await p.waitForTimeout(400);
const card=!!(await p.$('.wl-card'));
// الحروف: البطاقة ما كتعاودش ترسم (نفس العنصر) والخانة كتعمر
await p.evaluate(()=>{const c=document.querySelector('.wl-card');if(c)c.dataset.keep='1';});
const t0=Date.now();await p.click('.wl-t:not(.used):not(.gone)');const dt=Date.now()-t0;
const kept=await p.$eval('.wl-card',c=>c.dataset.keep==='1');const filled=await p.$$eval('.wl-slot.in',e=>e.length);
await p.click('.wl-slot.in');const after=await p.$$eval('.wl-slot.in',e=>e.length);
if(vw.width===390)await p.screenshot({path:S+'/wcard.png'});
const ok=n>1&&lit===n&&sc!=='none'&&card&&kept&&filled===1&&after===0&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD',vw.width,'word',n,'lit',lit,'scale',sc.slice(0,28),'card',card,'kept',kept,'fill',filled,'→',after,'tap ms',dt,errs.join('|'));
await p.close();}
await b.close();process.exit(bad?1:0);})();
