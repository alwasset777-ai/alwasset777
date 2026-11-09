// PROJECT (عرض PDF): الدائرة كتفتحو، زر «عرض PDF» فصفحة العقار كيعمر الصور والمعلومات، الوكيل كيكتب النصوص، والـ PDF كيتصاوب (3 أنواع × 3 لغات)
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push('main: '+e.message));
await p.route(/gstatic|supabase|fonts\.googleapis|translate/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/#/');await p.waitForTimeout(800);
await p.evaluate(async()=>{const mk=async(col)=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,1200,800);g.fillStyle='#fff';g.fillRect(300,200,600,400);return await new Promise(r=>c.toBlob(r,'image/jpeg',.8));};
 const cols=['#7a5','#c84','#48c','#a4c','#4ac','#ca4'];const blobs=[];for(const c of cols)blobs.push(await mk(c));
 const db=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);});const tx=db.transaction(['properties','files'],'readwrite');const now=new Date().toISOString();
 for(let i=0;i<6;i++)tx.objectStore('files').put({id:'pj-f'+i,blob:blobs[i],owner:'pj-p1',kind:'photo',createdAt:now});
 tx.objectStore('properties').put({id:'pj-p1',ref:'W777-0888',title:'شقة فاخرة بإطلالة',type:'apartment',transaction:'sale',city:'مكناس',district:'حمرية',priceMin:1250000,areaBuilt:120,specs:{rooms:5,bedrooms:3,bathrooms:2,floor:3},features:['مصعد','شرفة','مرآب'],description:'شقة مشمسة فوسط حمرية.',media:[0,1,2,3,4,5].map(i=>({id:'pj-f'+i,kind:'photo'})),status:'available',createdAt:now,updatedAt:now});
 await new Promise(r=>{tx.oncomplete=r;});});
await p.reload();await p.waitForTimeout(1200);
await p.goto('http://localhost:8777/bureau/#/ad-maker');await p.waitForTimeout(800);
await p.click('.ad-kind[href$="m=project"]');await p.waitForTimeout(2000);
let fr=p.frame({url:/project\/index\.html/});const boot=fr?await fr.evaluate(()=>({kind:W777_PROJECT.state.kind,ok:!!document.querySelector('#big canvas')})):null;
await p.goto('http://localhost:8777/bureau/#/property/pj-p1');await p.waitForTimeout(1200);
await p.click('a[href*="m=project&p="]');await p.waitForTimeout(4000);
fr=p.frame({url:/project\/index\.html/});
const filled=await fr.evaluate(()=>{const s=W777_PROJECT.state;return {kind:s.kind,ref:s.f.property.ref,price:s.f.property.price,photos:s.photos.length,desc:s.t.property.description,agency:(s.base||{}).name,slides:W777_PROJECT.plan().length};});
await p.screenshot({path:S+'/project-app.png'});
// الوكيل (جواب مزيف من الخادم)
await p.evaluate(()=>{const Sy=window.W777_SYNC;Sy.isOn=()=>true;Sy.request=async(u,o)=>{window.__sent=JSON.parse(o.body);return new Response(JSON.stringify({json:{tagline:'عيش فقلب حمرية',description:'شقة واسعة ومشمسة فالطابق الثالث مع مصعد ومرآب.',highlights:['مصعد','شرفة مشمسة','مرآب خاص','قريبة من الطرامواي'],location:'حمرية حي حيوي فوسط مكناس.'}}),{status:200,headers:{'content-type':'application/json'}});};});
await fr.click('#aiGo');await p.waitForTimeout(2500);
const ai=await fr.evaluate(()=>({t:W777_PROJECT.state.t.property,st:document.querySelector('#aiSt').textContent}));
const sent=await p.evaluate(()=>window.__sent&&window.__sent.sample?{imgs:window.__sent.sample.images.length,p:window.__sent.sample.prompt.length}:null);
// PDF: 3 أنواع × 3 لغات
const out={};
for(const kind of ['property','project','investor'])for(const lang of ['ar','fr','en']){
 const r=await fr.evaluate(async([kind,lang])=>{const s=W777_PROJECT.state;s.kind=kind;s.lang=lang;
  if(kind==='project')s.f.project=Object.assign({title:'إقامة النخيل',promoter:'منعش تجريبي',city:'مكناس',unitsN:'120',priceFrom:'450000',stage:'60%',delivery:'2027',unitsTable:'شقة 2 غرف | 75 | 650000 | 40\nشقة 3 غرف | 95 | 820000 | 60',amenities:'مسبح\nحديقة\nأمن 24/24',paymentPlan:'30% عند الحجز\n70% عند التسليم'},s.f.project||{});
  if(kind==='investor')s.f.investor=Object.assign({title:'شقة للاستثمار',city:'مكناس',price:'900000',feesPct:'7',works:'50000',rentM:'5500',charges:'4000',vacancy:'1',growth:'3',loanPct:'70',rate:'4.5',years:'20'},s.f.investor||{});
  if(kind==='investor')s.t.investor={description:'فرصة كراء طويل.',strengths:'طلب قوي\nقرب الجامعة',risks:'الفراغ\nتكاليف الصيانة'};
  const sl=W777_PROJECT.plan();const pages=[];for(const fn of sl){const c=document.createElement('canvas');c.width=1600;c.height=900;fn(c.getContext('2d'));const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.8));pages.push({bytes:new Uint8Array(await b.arrayBuffer()),w:1600,h:900});}
  const pdf=W777_PROJECT.buildPdf(pages,'Test');const ab=new Uint8Array(await pdf.arrayBuffer());let bin='';for(let i=0;i<ab.length;i+=32768)bin+=String.fromCharCode.apply(null,ab.subarray(i,i+32768));return {n:sl.length,b64:btoa(bin)};},[kind,lang]);
 const f=S+`/pj-${kind}-${lang}.pdf`;fs.writeFileSync(f,Buffer.from(r.b64,'base64'));out[kind+'-'+lang]=r.n;}
await p.evaluate(async()=>{const db=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);});const tx=db.transaction(['properties','files'],'readwrite');tx.objectStore('properties').delete('pj-p1');for(let i=0;i<6;i++)tx.objectStore('files').delete('pj-f'+i);await new Promise(r=>{tx.oncomplete=r;});});
const ok=boot&&boot.ok&&filled.kind==='property'&&filled.ref==='W777-0888'&&filled.price==='1250000'&&filled.photos===6&&filled.slides>=6&&/حمرية/.test(ai.t.tagline||'')&&/مصعد/.test(ai.t.highlights||'')&&sent&&sent.imgs===4&&Object.values(out).every(n=>n>=5)&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD','boot',JSON.stringify(boot),'filled',JSON.stringify(filled),'ai',ai.st,'sent',JSON.stringify(sent),'pages',JSON.stringify(out),errs.join('|'));
await b.close();process.exit(bad?1:0);})();
