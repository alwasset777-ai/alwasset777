const {chromium}=require('playwright');
const routes=['','ad-maker','agencies','appointment/new','appointments','associations','brokers','chat','contractors','contracts','disputes','donations','estimate','events','finance','finishing','game','guide','inbox','investors','learn','loan','map','matching','news','notaries','ownership','projects','properties','property/new','rentals','report','request/new','requests','search','settings','stays','tamwil','tamwil/awb','tamwil/najmah','terms','terms/groups','zzz-unknown'];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const all=[];
for (const vw of [{width:1200,height:900},{width:390,height:844}]) {
const c=await b.newContext({viewport:vw,serviceWorkers:'block'});const p=await c.newPage();
await p.route(/googleapis|gstatic|supabase|unpkg|jsdelivr|cdnjs|tile|openstreetmap/,r=>r.abort());
let cur='';const errs=[];p.on('pageerror',e=>errs.push(cur+' :: '+e.message));
p.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED|net::|Failed to load resource|404/.test(m.text()))errs.push(cur+' :: console '+m.text().slice(0,150))});
await p.goto('http://localhost:8777/bureau/');await p.waitForTimeout(2000);
// بيانات تجريبية
cur='seed'; const sd=await p.$('#seed'); if(sd){ await sd.click(); await p.waitForTimeout(1500);} else errs.push('no seed button');
p.on('dialog',d=>d.accept());
for(const r of routes){cur=r;await p.evaluate(r=>location.hash='#/'+r,r);await p.waitForTimeout(600);
 await p.evaluate(()=>document.querySelectorAll('.wl-mod').forEach(m=>m.remove()));
 const h=await p.evaluate(()=>(document.querySelector('main, #main')||document.body).innerText.length);if(h<5) errs.push(r+' :: empty page');}
// صفحات التفاصيل
for (const kind of ['property','request']){
  cur=kind+' detail'; await p.evaluate(k=>location.hash='#/'+k+'s',kind); await p.waitForTimeout(600);
  const a=await p.$(`a[href^="#/${kind}/"]:not([href$="/new"])`); if(a){ await a.click(); await p.waitForTimeout(800); const t=await p.evaluate(()=>document.querySelector('main').innerText.length); if(t<20) errs.push(cur+' :: empty'); } else errs.push(cur+' :: no link');
}
// كل الأزرار فالقوائم
for(const k of ['add','svc','net']){
  await p.evaluate(()=>location.hash='#/');await p.waitForTimeout(500);
  const n=await p.evaluate(k=>{const b=document.querySelector(`[data-hm="${k}"]`);if(!b)return -1;b.click();return document.querySelectorAll('.hub-menu .hub-tile').length},k);
  await p.waitForTimeout(300);
  const tiles=await p.evaluate(()=>[...document.querySelectorAll('.hub-menu .hub-tile')].map(t=>t.getAttribute('href')));
  if(!tiles.length) errs.push('menu '+k+' :: no tiles');
  await p.keyboard.press('Escape');
  for(const href of tiles){ cur='tile '+href; await p.evaluate(()=>{document.querySelectorAll('.modal-back,.modal,.wl-mod').forEach(m=>m.remove())}); await p.evaluate(h=>location.hash=h,href); await p.waitForTimeout(500);
    const h=await p.evaluate(()=>(document.querySelector('main')||document.body).innerText.length); if(h<5) errs.push(cur+' :: empty'); }
}
console.log(vw.width, errs.length?errs.join('\n'):'no errors'); all.push(...errs); await c.close();}
// الصفحات العمومية
for (const pg of ['catalog.html','game.html','stays.html','partner.html']){
  const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(pg+' :: '+e.message));
  await p.route(/googleapis|gstatic|supabase|unpkg|jsdelivr|cdnjs|tile|openstreetmap/,r=>r.abort());
  await p.goto('http://localhost:8777/bureau/'+pg);await p.waitForTimeout(1500);
  console.log(pg, errs.length?errs.join('\n'):'ok'); await c.close();
}
await b.close();})();
