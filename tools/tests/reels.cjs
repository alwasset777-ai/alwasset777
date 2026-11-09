// REELS (VIDOMIDO) داخل التطبيق: الدائرة كتفتحو، زر «فيديو Reels» فصفحة العقار كيعمر الصور والبطاقة، «المخرج الذكي» ظاهر، والوكيل كيفتحو بالمرجع
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push('main: '+e.message));
p.on('frameattached',f=>{});
await p.route(/gstatic|supabase|fonts\.googleapis|translate/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/#/ad-maker');await p.waitForTimeout(1000);
await p.click('.ad-kind[href$="m=reels"]');await p.waitForTimeout(2500);
const fr=p.frame({url:/reels\/index\.html/});
const boot=fr?await fr.evaluate(()=>({mode:S.mode,ai:!document.querySelector('#aiPanel').hidden,lang:LANG,onb:document.querySelector('#onb').hidden})):null;
await p.screenshot({path:S+'/reels-empty.png'});
// عقار تجريبي بصورة (فالمتصفح ديال الاختبار غير)
await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d');g.fillStyle='#c84';g.fillRect(0,0,640,480);g.fillStyle='#fff';g.fillRect(200,150,240,180);
 const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.8));const db=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);});
 const tx=db.transaction(['properties','files'],'readwrite');const now=new Date().toISOString();
 tx.objectStore('files').put({id:'t-f1',blob,owner:'t-p1',kind:'photo',createdAt:now});tx.objectStore('files').put({id:'t-f2',blob,owner:'t-p1',kind:'photo',createdAt:now});
 tx.objectStore('properties').put({id:'t-p1',ref:'W777-0999',type:'apartment',transaction:'sale',city:'مكناس',district:'حمرية',priceMin:950000,areaTotal:110,specs:{bedrooms:3,bathrooms:2},features:['مصعد','شرفة'],media:[{id:'t-f1',kind:'photo'},{id:'t-f2',kind:'photo'}],status:'available',createdAt:now,updatedAt:now});
 await new Promise(r=>{tx.oncomplete=r;});});
await p.reload();await p.waitForTimeout(1500);
// عقار من اللائحة
const pid=await p.evaluate(async()=>{const r=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);q.onerror=()=>res(null);});if(!r)return null;
 try{const tx=r.transaction('properties','readonly');const all=await new Promise(res=>{const q=tx.objectStore('properties').getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>res([]);});const x=all.find(x=>x.id==='t-p1');return x?{id:x.id,ref:x.ref,city:x.city,photos:(x.media||[]).filter(m=>m.kind==='photo').length}:null;}catch(e){return 'err '+e.message;}});
let filled=null;
if(pid&&pid.id){await p.goto('http://localhost:8777/bureau/#/property/'+pid.id);await p.waitForTimeout(1200);
 const btn=await p.$('a[href*="m=reels&p="]');if(btn){await btn.click();await p.waitForTimeout(4500);
  const f2=p.frame({url:/reels\/index\.html/});filled=f2?await f2.evaluate(()=>({mode:S.mode,city:S.listing.city,ref:S.listing.ref,price:S.listing.price,photos:new Set(S.imageScenes.filter(x=>x.kind==='photo').map(x=>x.src)).size,cards:S.imageScenes.filter(x=>x.card).map(x=>x.card).join(','),agency:S.agency.name})):null;
  await p.screenshot({path:S+'/reels-prop.png'});}}
// «المخرج الذكي»: الطلب كيدوز للتطبيق الأم ← الوكيل (هنا جواب مزيف) ← المونتاج والتعليق كيتطبقو
let aiRes=null,sent=null;
if(filled){await p.evaluate(()=>{const Sy=window.W777_SYNC;Sy.isOn=()=>true;Sy.request=async(u,o)=>{window.__sent=JSON.parse(o.body);return new Response(JSON.stringify({json:{scenes:[{photo:1,piece:'Salon',effet:'dolly-in',duree:4,sous_titre:'صالون مشمس'},{photo:0,piece:'Façade',effet:'drone',duree:4,sous_titre:''}],fiche:{},format:'9:16',legende:'شقة للبيع فحمرية #مكناس #عقار'}}),{status:200,headers:{'content-type':'application/json'}});};});
 const f3=p.frame({url:/reels\/index\.html/});
 await f3.evaluate(()=>{document.querySelector('#aiPanel').open=true;document.querySelector('#aiBrief').value='شقة للبيع فحمرية';});
 await f3.click('#aiGo');await p.waitForTimeout(2500);
 aiRes=await f3.evaluate(()=>({status:document.querySelector('#aiStatus').textContent,caption:document.querySelector('#captionText').value,first:(S.imageScenes.find(x=>!x.card||x.card==='hook')||{}).label}));
 sent=await p.evaluate(()=>window.__sent&&window.__sent.sample?{p:window.__sent.sample.prompt.length,imgs:window.__sent.sample.images.length}:null);
 await p.screenshot({path:S+'/reels-ai.png'});}
const inStudio=await p.evaluate(()=>document.body.classList.contains('in-studio'));
const ok=boot&&boot.mode!==undefined&&boot.ai&&boot.onb!==false&&inStudio&&pid&&pid.id&&((filled&&filled.mode==='annonce'&&filled.ref===pid.ref&&filled.photos===Math.min(pid.photos,20)&&aiRes&&/#مكناس/.test(aiRes.caption)&&sent&&sent.imgs>=1))&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD','boot',JSON.stringify(boot),'prop',JSON.stringify(pid),'filled',JSON.stringify(filled),'ai',JSON.stringify(aiRes),'sent',JSON.stringify(sent),'inStudio',inStudio,errs.join('|'));
await p.evaluate(async()=>{const db=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);});const tx=db.transaction(['properties','files'],'readwrite');tx.objectStore('properties').delete('t-p1');tx.objectStore('files').delete('t-f1');tx.objectStore('files').delete('t-f2');await new Promise(r=>{tx.oncomplete=r;});});
await b.close();process.exit(bad?1:0);})();
