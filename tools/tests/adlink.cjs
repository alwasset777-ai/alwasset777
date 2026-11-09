// «إعلانات فورية»: العقارات المعروضة تحت الدوائر، اختيار عقار كيربط POST / REELS / PROJECT بيه، والأزرار فكل سطر كيعمرو الأداة
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
for(const vw of [{width:390,height:844},{width:1200,height:900}]){
const p=await b.newPage({viewport:vw});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/gstatic|supabase|fonts\.googleapis|translate/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/#/');await p.waitForTimeout(800);
await p.evaluate(async()=>{const mk=async(col)=>{const c=document.createElement('canvas');c.width=800;c.height=600;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,800,600);return await new Promise(r=>c.toBlob(r,'image/jpeg',.8));};
 const blobs=[await mk('#7a5'),await mk('#c84'),await mk('#48c')];
 const db=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);});const tx=db.transaction(['properties','files','requests'],'readwrite');const now=new Date().toISOString();
 for(let i=0;i<3;i++)tx.objectStore('files').put({id:'al-f'+i,blob:blobs[i],owner:'al-p1',kind:'photo',createdAt:now});
 tx.objectStore('properties').put({id:'al-p1',ref:'W777-0777',title:'فيلا بمسبح',type:'villa',transaction:'sale',status:'available',city:'مكناس',district:'حمرية',priceMin:3500000,areaBuilt:450,specs:{rooms:7,bedrooms:4,bathrooms:3},features:['مسبح'],media:[0,1,2].map(i=>({id:'al-f'+i,kind:'photo'})),createdAt:now,updatedAt:'2099-01-01T00:00:00Z'});
 tx.objectStore('requests').put({id:'al-r1',ref:'D-0777',transaction:'sale',types:['villa'],city:'مكناس',districts:['حمرية'],budgetMin:3000000,budgetMax:4000000,status:'new',createdAt:now,updatedAt:now});
 tx.objectStore('properties').put({id:'al-p2',ref:'W777-0778',title:'شقة مباعة',type:'apartment',transaction:'sale',status:'sold',city:'مكناس',district:'الزيتون',priceMin:600000,media:[],createdAt:now,updatedAt:'2098-01-01T00:00:00Z'});
 await new Promise(r=>{tx.oncomplete=r;});});
await p.reload();await p.waitForTimeout(1200);
await p.goto('http://localhost:8777/bureau/#/ad-maker');await p.waitForTimeout(1200);
const list=await p.evaluate(()=>({kinds:document.querySelectorAll('.ad-kind').length,rows:[...document.querySelectorAll('.ad-prop')].map(r=>r.dataset.id),thumb:!!document.querySelector('.ad-prop[data-id="al-p1"] .ad-th img:not(.hidden)'),btns:document.querySelectorAll('.ad-prop[data-id="al-p1"] .ad-go a').length,scrollX:document.documentElement.scrollWidth<=innerWidth+1,hot:(document.querySelector('.ad-prop[data-id="al-p1"] .ad-hot')||{}).textContent||'',sort:document.getElementById('ad-sort').value}));
const hasP1=list.rows.includes('al-p1'),noSold=!list.rows.includes('al-p2');
await p.check('#ad-all');await p.waitForTimeout(200);
const withSold=await p.evaluate(()=>[...document.querySelectorAll('.ad-prop')].some(r=>r.dataset.id==='al-p2'));
await p.uncheck('#ad-all');await p.fill('#ad-q','W777-0777');await p.waitForTimeout(200);
const searched=await p.evaluate(()=>[...document.querySelectorAll('.ad-prop')].map(r=>r.dataset.id).join(','));
await p.click('.ad-prop[data-id="al-p1"] .grow');await p.waitForTimeout(500);
const sel=await p.evaluate(()=>({bar:!document.getElementById('ad-selbar').hidden&&/W777-0777/.test(document.getElementById('ad-selbar').textContent),hrefs:[...document.querySelectorAll('.ad-kind')].every(a=>/p=al-p1/.test(a.getAttribute('href'))),on:!!document.querySelector('.ad-prop.on[data-id="al-p1"]')}));
await p.screenshot({path:S+`/adlink-${vw.width}.png`,fullPage:true});
// الدائرة REELS بعد الاختيار ← معمّرة بالعقار
await p.click('.ad-kind[data-k="reels"]');await p.waitForTimeout(3500);
const reels=await p.evaluate(()=>({hash:location.hash,sub:(document.querySelector('.studio-head .sub')||{}).textContent||''}));
let fr=p.frame({url:/reels\/index\.html/});const rf=fr?await fr.evaluate(()=>({ref:S.listing.ref,photos:new Set(S.imageScenes.map(s=>s.src||(s.img&&s.img.src)).filter(Boolean)).size})).catch(()=>null):null;
// زر PROJECT فالسطر
await p.goto('http://localhost:8777/bureau/#/ad-maker');await p.waitForTimeout(800);
await p.click('.ad-prop[data-id="al-p1"] a.ad-go-project');await p.waitForTimeout(3500);
fr=p.frame({url:/project\/index\.html/});const pf=fr?await fr.evaluate(()=>({ref:W777_PROJECT.state.f.property.ref,photos:W777_PROJECT.state.photos.length})):null;
await fr.evaluate(()=>window.parent.postMessage({type:'w777-made',kind:'project'},location.origin));await p.waitForTimeout(600);
await p.goto('http://localhost:8777/bureau/#/ad-maker');await p.waitForTimeout(900);
const done=await p.evaluate(()=>{const a=document.querySelector('.ad-prop[data-id="al-p1"] a.ad-go-project');return {done:a.classList.contains('done'),txt:a.textContent,reels:document.querySelector('.ad-prop[data-id="al-p1"] a.ad-go-reels').classList.contains('done')};});
await p.selectOption('#ad-sort','todo');await p.waitForTimeout(200);const todo=await p.evaluate(()=>[...document.querySelectorAll('.ad-prop')].map(r=>r.dataset.id).join(','));
await p.screenshot({path:S+`/adlink2-${vw.width}.png`});
// زر POST فالسطر
await p.goto('http://localhost:8777/bureau/#/ad-maker');await p.waitForTimeout(800);
await p.click('.ad-prop[data-id="al-p1"] a.ad-go-post');await p.waitForTimeout(1000);
const post=await p.evaluate(()=>({frame:!!document.getElementById('studio-frame'),sub:/W777-0777/.test((document.querySelector('.studio-head .sub')||{}).textContent||''),back:!!document.querySelector('.studio-head a[href="#/ad-maker"]')}));
await p.evaluate(async()=>{const db=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);});const tx=db.transaction(['properties','files','requests','meta'],'readwrite');tx.objectStore('requests').delete('al-r1');const mt=tx.objectStore('meta');const g=mt.get('ad_made');g.onsuccess=()=>{const v=g.result;if(v&&v.value){delete v.value['al-p1'];mt.put(v);}};tx.objectStore('properties').delete('al-p1');tx.objectStore('properties').delete('al-p2');for(let i=0;i<3;i++)tx.objectStore('files').delete('al-f'+i);await new Promise(r=>{tx.oncomplete=r;});});
const ok=list.kinds===3&&hasP1&&noSold&&list.thumb&&list.btns===3&&list.scrollX&&withSold&&searched==='al-p1'&&sel.bar&&sel.hrefs&&sel.on&&/m=reels&p=al-p1/.test(reels.hash)&&/W777-0777/.test(reels.sub)&&rf&&rf.ref==='W777-0777'&&pf&&pf.ref==='W777-0777'&&pf.photos===3&&post.frame&&post.sub&&post.back&&/🔥 1/.test(list.hot)&&list.sort==='demand'&&done.done&&/✓/.test(done.txt)&&!done.reels&&todo==='al-p1'&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD',vw.width,'list',JSON.stringify(list),'sold',noSold,withSold,'search',searched,'sel',JSON.stringify(sel),'reels',reels.hash,JSON.stringify(rf),'project',JSON.stringify(pf),'post',JSON.stringify(post),'done',JSON.stringify(done),'todo',todo,errs.join('|'));
await p.close();}
await b.close();process.exit(bad?1:0);})();
