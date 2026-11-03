// عرض 777: الامتياز حسب رقم التسجيل + لوحة العرض فالدليل (بلا خادم: كنحسبو بالدوال مباشرة)
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/');await p.waitForTimeout(1200);
const r=await p.evaluate(()=>window.W777_TEST.offer());
console.log(r.ok?'OK ':'BAD','tiers',JSON.stringify(r.c));if(!r.ok)bad++;
await p.evaluate(()=>{document.querySelector('#main, main').innerHTML='<div class="card card-pad">'+window.W777_TEST.board()+'</div>';});
await p.screenshot({path:(process.env.S||'/tmp')+'/offer.png'});
await p.evaluate(()=>location.hash='#/terms');await p.waitForTimeout(1200);
const t=await p.textContent('main').catch(()=>'');const tOk=/عرض 777 للأوائل/.test(t)&&/6 أشهر/.test(t);console.log(tOk?'OK ':'BAD','terms');if(!tOk)bad++;
if(errs.length){bad++;console.log(errs.join('|'));}
await b.close();process.exit(bad?1:0);})();
