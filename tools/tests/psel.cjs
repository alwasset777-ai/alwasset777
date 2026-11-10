// التحديد والمسح فوق صورة كل عقار: مسح واحد، تحديد جوج ومسحهم دفعة وحدة
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;
for(const vw of [{width:1200,height:900},{width:390,height:844}]){
const p=await b.newPage({viewport:vw});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/');await p.waitForTimeout(1200);await p.click('#seed');await p.waitForTimeout(1200);
await p.evaluate(()=>location.hash='#/properties?status=');await p.waitForTimeout(800);
await p.evaluate(()=>{const c=[...document.querySelectorAll('[data-st]')].find(x=>x.dataset.st==='');if(c)c.click();});await p.waitForTimeout(600);
const n0=await p.$$eval('#plist .prop-card',x=>x.length);
// مسح عقار واحد
await p.click('#plist .prop-card >> nth=0 >> .pc-more');await p.click('#plist .prop-card >> nth=0 >> .pc-mi.del');await p.waitForTimeout(400);
const ok1=await p.$('#cf-ok');if(ok1)await ok1.click();await p.waitForTimeout(1200);
const n1=await p.$$eval('#plist .prop-card',x=>x.length);
// تحديد جوج ← الشريط ← حذف المحدد
await p.click('#plist .prop-card >> nth=0 >> .pc-more');await p.click('#plist .prop-card >> nth=0 >> .pc-mi[data-psel]');await p.click('#plist .prop-card >> nth=1 >> .pc-more');await p.click('#plist .prop-card >> nth=1 >> .pc-mi[data-psel]');await p.waitForTimeout(300);
const bar=await p.textContent('#psel-bar').catch(()=>'');const url=await p.evaluate(()=>location.hash);
if(vw.width===390){await p.waitForTimeout(2800);await p.screenshot({path:(process.env.S||'/tmp')+'/psel.png'});}
await p.click('#psel-bar [data-pb=del]');await p.waitForTimeout(400);
const ok2=await p.$('#cf-ok');if(ok2)await ok2.click();await p.waitForTimeout(1200);
const n2=await p.$$eval('#plist .prop-card',x=>x.length);const barGone=!(await p.$('#psel-bar'));
const ok=n1===n0-1&&n2===n1-2&&/2 محدد/.test(bar)&&url.startsWith('#/properties')&&barGone&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD',vw.width,'cards',n0,'→',n1,'→',n2,'| bar:',bar.replace(/\s+/g,' ').trim(),'| stayed:',url,errs.join('|'));
await p.close();}
await b.close();process.exit(bad?1:0);})();
