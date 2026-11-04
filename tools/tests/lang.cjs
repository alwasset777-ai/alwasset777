// اللغات: الترجمة ديالنا (خدمة Google مزيفة فالاختبار) — الصفحة كتترجم، الصفحات الجديدة كتترجم، تبديل اللغة بلا إعادة تحميل، الرجوع للعربية، اللعبة والوكيل ما كيترجموش
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
for(const vw of [{width:390,height:844},{width:1200,height:900}]){
const p=await b.newPage({viewport:vw});const errs=[];p.on('pageerror',e=>errs.push(e.message));let reqs=0,strs=0;
await p.route(/googleapis\.com\/translate_a/,async r=>{reqs++;const tl=new URL(r.request().url()).searchParams.get('tl');const q=new URLSearchParams(r.request().postData()||'').getAll('q');strs+=q.length;await new Promise(x=>setTimeout(x,80));r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(q.map(s=>'['+tl+'] '+s))});});
await p.route(/gstatic|supabase|fonts\.googleapis|translate\.google\.com/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/#/');await p.waitForTimeout(1200);
const arab=()=>p.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,ar=0,tr=0;while((n=w.nextNode())){const el=n.parentElement;if(!el||el.closest('script,style,.notranslate,[translate="no"],#agent-panel,#cw-root,svg')||!el.offsetParent&&getComputedStyle(el).position!=='fixed')continue;const t=n.nodeValue.trim();if(!t)continue;if(/\[(fr|en)\]/.test(t))tr++;else if(/[؀-ۿ]/.test(t))ar++;}return {ar,tr,dir:document.documentElement.dir};});
await p.click('#btn-lang');await p.waitForTimeout(300);await p.click('[data-lang="fr"]');await p.waitForTimeout(1500);
const fr1=await arab();if(vw.width===390)await p.screenshot({path:S+'/lang-fr.png'});
// صفحة جديدة كتترجم بوحدها
await p.evaluate(()=>{location.hash='#/tamwil';});await p.waitForTimeout(1800);const fr2=await arab();
if(vw.width===390)await p.screenshot({path:S+'/lang-fr-tamwil.png'});
// تبديل للإنجليزية بلا إعادة تحميل
const nav0=await p.evaluate(()=>performance.getEntriesByType('navigation').length+':'+(window.__k=window.__k||Math.random()));
await p.click('#btn-lang');await p.waitForTimeout(300);await p.click('[data-lang="en"]');await p.waitForTimeout(1500);const en=await arab();
const same=await p.evaluate(()=>!!window.__k);const enText=await p.evaluate(()=>document.body.innerText.includes('[en]')&&!document.body.innerText.includes('[fr]'));
// إعادة التحميل: اللغة باقية والترجمة من الذاكرة (بلا طلبات جداد كثار)
const r0=reqs;await p.reload();await p.waitForTimeout(1500);const en2=await arab();const reqAfter=reqs-r0;
// اللعبة ما كتترجمش
await p.evaluate(()=>{location.hash='#/game';});await p.waitForTimeout(2500);const game=await p.evaluate(()=>{const r=document.querySelector('#cw-root');return r?{tr:/\[(fr|en)\]/.test(r.innerText),len:r.innerText.length}:null;});
// الرجوع للعربية
await p.evaluate(()=>{location.hash='#/';});await p.waitForTimeout(800);
await p.click('#btn-lang');await p.waitForTimeout(300);await p.click('[data-lang="ar"]');await p.waitForTimeout(800);const ar=await arab();
const ok=fr1.tr>5&&fr1.ar<=3&&fr1.dir==='ltr'&&fr2.tr>10&&fr2.ar<=3&&en.tr>10&&en.ar<=3&&same&&enText&&en2.tr>10&&reqAfter<=2&&game&&!game.tr&&ar.tr===0&&ar.dir==='rtl'&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD',vw.width,'fr',JSON.stringify(fr1),'tamwil',JSON.stringify(fr2),'en',JSON.stringify(en),'noReload',same,enText,'reload',JSON.stringify(en2),'newReqs',reqAfter,'game',JSON.stringify(game),'ar',JSON.stringify(ar),'reqs',reqs,'strings',strs,errs.join('|'));
await p.evaluate(()=>{localStorage.removeItem('w777_lang');});
await p.close();}
await b.close();process.exit(bad?1:0);})();
