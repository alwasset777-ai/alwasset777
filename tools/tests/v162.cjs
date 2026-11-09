// v162: إعلانات فورية (3 دوائر) + اللغة كتتحفظ وكتعاود تحل الصفحة + التمويل (اتصل + مكناس) + «مجموعة الوسيط»
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
for(const vw of [{width:390,height:844},{width:1200,height:900}]){
const p=await b.newPage({viewport:vw});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/googleapis|gstatic|supabase|translate\.google/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/#/ad-maker');await p.waitForTimeout(1200);
const kinds=await p.$$eval('.ad-kind',e=>e.map(x=>x.querySelector('b').textContent));
const imgsOk=await p.$$eval('.ad-kind img',e=>e.every(i=>i.complete&&i.naturalWidth>0));
if(vw.width===390)await p.screenshot({path:S+'/ads-kinds.png'});
await p.click('.ad-kind[href$="m=project"]');await p.waitForTimeout(500);const soon=!!(await p.$('.ad-soon'));
await p.goto('http://localhost:8777/bureau/#/ad-maker?m=post');await p.waitForTimeout(600);const frame=!!(await p.$('#studio-frame'));
// التمويل
await p.goto('http://localhost:8777/bureau/#/tamwil');await p.waitForTimeout(1200);
const calls=await p.$$eval('.fc-call',e=>e.length);await p.check('#fin-mk');await p.waitForTimeout(200);const mk=await p.$$eval('.fin-card',e=>e.length);
if(vw.width===390)await p.screenshot({path:S+'/fin-mk.png'});
await p.goto('http://localhost:8777/bureau/#/tamwil/akhdar');await p.waitForTimeout(600);const callNow=!!(await p.$('.fo-callnow'));const mkSec=(await p.content()).includes('الوكالة فمكناس');
// الاسم الجديد
await p.goto('http://localhost:8777/bureau/#/');await p.waitForTimeout(800);const html=await p.content();const oldName=html.includes('شبكة الوسيط 777');
// اللغة: الاختيار كيتحفظ والصفحة كتعاود تتحل
let lang='skip';const lb=await p.$('#btn-lang');
if(lb){await lb.click();await p.waitForTimeout(300);await Promise.all([p.waitForNavigation({timeout:5000}).catch(()=>null),p.click('[data-lang="fr"]')]);await p.waitForTimeout(800);
 lang=await p.evaluate(()=>({c:document.cookie,l:localStorage.getItem('w777_lang'),code:(document.querySelector('#lang-code')||{}).textContent}));
 await p.evaluate(()=>{document.cookie='googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';});
 await p.reload();await p.waitForTimeout(600);const again=await p.evaluate(()=>(document.querySelector('#lang-code')||{}).textContent);lang.restored=again==='FR';
 await p.evaluate(()=>{localStorage.removeItem('w777_lang');document.cookie='googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';});}
const langOk=lang==='skip'||(!/googtrans=\/ar/.test(lang.c)&&lang.l==='fr'&&lang.code==='FR'&&lang.restored);
const ok=kinds.join(',')==='PROJECT,REELS,POST'&&imgsOk&&soon&&frame&&calls>10&&mk>=15&&callNow&&mkSec&&!oldName&&langOk&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD',vw.width,'kinds',kinds.join(','),imgsOk,'soon',soon,'post',frame,'calls',calls,'mk',mk,'callNow',callNow,mkSec,'oldName',oldName,'lang',JSON.stringify(lang),errs.join('|'));
await p.close();}
await b.close();process.exit(bad?1:0);})();
