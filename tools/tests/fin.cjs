// التمويل العقاري: الحالات (أخضر/أصفر) + الملاحظة فبطاقة المؤسسة + CaixaBank (ما كتمولش الناس) + Bank Al Karam
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
for(const vw of [{width:390,height:844},{width:1200,height:900}]){
const p=await b.newPage({viewport:vw});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/#/tamwil');await p.waitForTimeout(1500);
const st=await p.evaluate(()=>{const c={};(window.W777_FIN.inst||[]).forEach(x=>c[x.status]=(c[x.status]||0)+1);return c;});
const body=await p.evaluate(()=>document.body.innerText);
if(vw.width===390)await p.screenshot({path:S+'/fin-list.png'});
await p.goto('http://localhost:8777/bureau/#/tamwil/caixa');await p.waitForTimeout(800);
const note=await p.$eval('.fin-note',e=>e.textContent).catch(()=>'');
if(vw.width===390)await p.screenshot({path:S+'/fin-caixa.png',fullPage:true});
await p.goto('http://localhost:8777/bureau/#/tamwil/cam');await p.waitForTimeout(800);
const cam=await p.evaluate(()=>document.body.innerText.includes('CAM Assakan'));
if(vw.width===390)await p.screenshot({path:S+'/fin-cam.png',fullPage:true});
const ok=!st.missing&&st.ok>=20&&/PAS de crédit immobilier/.test(note)&&cam&&body.includes('Bank Al Karam')&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD',vw.width,JSON.stringify(st),'note',!!note,'cam',cam,'alkaram',body.includes('Bank Al Karam'),errs.join('|'));
await p.close();}
await b.close();process.exit(bad?1:0);})();
