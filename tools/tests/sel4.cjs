// التحديد والمسح فـ: الطلبات، المواعيد، المطابقة الذكية (+ العقارات فـ psel.cjs)
const {chromium}=require('playwright');const O=process.env.S||'/tmp';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;
for(const vw of [{width:1200,height:900},{width:390,height:844}]){
const p=await b.newPage({viewport:vw});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/');await p.waitForTimeout(1200);await p.click('#seed');await p.waitForTimeout(1200);
// مواعيد تجريبية
await p.evaluate(async()=>{const D=window.W777_DB;const t=new Date().toISOString().slice(0,10);for(let i=0;i<3;i++)await D.saveRec('appointments',{id:'apt'+i,date:t,time:'1'+i+':00',type:'visit',status:'planned',client:{name:'زبون '+i},remind:'30'});});
await p.reload();await p.waitForTimeout(1500);
const ok=async()=>{const b2=await p.$('#cf-ok');if(b2)await b2.click();await p.waitForTimeout(1200);};
const count=sel=>p.$$eval(sel,x=>x.length);
const res={};
for(const [hash,card] of [['#/matching?min=50','#mlist [data-sid]'],['#/appointments?f=all','.appt-list [data-sid]'],['#/requests?','#rlist [data-sid]']]){
  if(hash.startsWith('#/requests')){await p.evaluate(()=>location.hash='#/matching?min=50');await p.waitForTimeout(800);global.unhide=!!(await p.$('#m-unhide'));global.reqs=await p.evaluate(async()=>(await window.W777_DB.all('requests')).length);}
  await p.evaluate(h=>location.hash=h,hash);await p.waitForTimeout(1000);
  if(hash.startsWith('#/requests'))await p.evaluate(()=>{const c=[...document.querySelectorAll('[data-st]')].find(x=>x.dataset.st==='');if(c)c.click();});await p.waitForTimeout(500);
  const n0=await count(card);
  await p.click(card+' >> nth=0 >> .pc-more');await p.click(card+' >> nth=0 >> .pc-mi.del');await p.waitForTimeout(300);await ok();
  const n1=await count(card);
  let n2=n1,bar='';
  if(n1>=2){await p.click(card+' >> nth=0 >> .pc-more');await p.click(card+' >> nth=0 >> .pc-mi[data-psel]');await p.click(card+' >> nth=1 >> .pc-more');await p.click(card+' >> nth=1 >> .pc-mi[data-psel]');await p.waitForTimeout(300);bar=await p.textContent('#psel-bar').catch(()=>'');
    if(vw.width===390)await p.screenshot({path:O+'/sel_'+hash.split('?')[0].slice(2)+'.png'});
    await p.click('#psel-bar [data-pb=del]');await p.waitForTimeout(300);await ok();n2=await count(card);}
  res[hash]=[n0,n1,n2,/2 محدد/.test(bar)];
  if(!(n1===n0-1&&(n1<2||n2===n1-2)&&(n1<2||/2 محدد/.test(bar))))bad++;
}
// المطابقة: الطلب والعقار باقيين، وزر الاسترجاع كيبان
const unhide=global.unhide,reqs=global.reqs;
if(!unhide||errs.length)bad++;
console.log(bad?'BAD':'OK ',vw.width,JSON.stringify(res),'unhide btn',unhide,'requests kept',reqs,errs.join('|'));
await p.close();}
await b.close();process.exit(bad?1:0);})();
