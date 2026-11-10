// كل أدوات الوكيل (23) كتخدم فالتطبيق: خادم مزيف كيطلبهم كاملين، كنأكدو الإضافات، وكنقراو النتائج (بلا أخطاء)
const {chromium}=require('playwright');const F=require('../tuto/fake.cjs');const BASE='http://localhost:8777/bureau/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));let results=null,calls=null;
await p.addInitScript(()=>{localStorage.w777_agent_cfg=JSON.stringify({name:'منير',ai_enabled:true});localStorage.w777_agent_voice='0';});
await p.route(/googleapis|gstatic|vercel\.app/,r=>r.abort());await F.install(p);
await p.goto(BASE);await p.waitForTimeout(800);await F.login(p,BASE);
await p.evaluate(async()=>{const db=await new Promise(res=>{const q=indexedDB.open('wasset777_bureau');q.onsuccess=()=>res(q.result);});const tx=db.transaction(['properties','requests'],'readwrite');const now=new Date().toISOString();
 tx.objectStore('properties').put({id:'ag-p1',ref:'W777-0901',title:'شقة 3 بيوت فحمرية',type:'apartment',transaction:'sale',status:'available',city:'مكناس',district:'حمرية',priceMin:850000,areaBuilt:110,specs:{rooms:4,bedrooms:3,bathrooms:2},owner:{name:'مالك تجريبي',phone:'0611111111'},media:[],createdAt:now,updatedAt:now});
 tx.objectStore('requests').put({id:'ag-r1',ref:'DM-0901',client:{name:'زبون للتجربة',phone:'0622222222'},transaction:'sale',types:['apartment'],city:'مكناس',districts:['حمرية'],budgetMax:950000,status:'new',priority:'normal',proposals:{},createdAt:now,updatedAt:now});
 await new Promise(r=>{tx.oncomplete=r;});});
await p.reload();await p.waitForTimeout(1500);await p.goto(BASE+'#/');await p.waitForTimeout(1800);
const refs={P:'W777-0901',R:'DM-0901'};
const tom=new Date(Date.now()+864e5).toISOString().slice(0,10);
calls=[['search_properties',{}],['search_properties',{city:'مكناس',price_max:1}],['get_property',{ref:refs.P}],['search_requests',{}],['get_request',{ref:refs.R}],
 ['matches_for_request',{ref:refs.R}],['matches_for_property',{ref:refs.P}],['create_request',{client_name:'زبون تجريبي',phone:'0600000000',transaction:'sale',property_type:'apartment',city:'مكناس',budget_max:900000}],
 ['list_appointments',{}],['create_appointment',{client_name:'زبون تجريبي',date:tom,time:'10:00',type:'visit'}],['update_property_status',{ref:refs.P,status:'reserved'}],
 ['market_price',{city:'مكناس',district:'حمرية',property_type:'apartment',area:100,price:900000}],['office_stats',{}],['network_search',{}],['app_help',{query:'زيد صور العقار'}],
 ['finance_summary',{}],['rentals_summary',{}],['get_contract_template',{}],['get_contract_template',{id:'01-bail-habitation'}],['calculate',{expression:'(3500*12)/650000*100'}],
 ['loan_calc',{price:900000}],['buying_fees',{price:900000}],['directory_search',{kind:'agency'}],['create_property',{property_type:'villa',transaction:'sale',city:'مكناس',district:'بني محمد',price:2500000,area:300,bedrooms:4,owner_name:'مالك تجريبي',owner_phone:'0677889900'}],['open_page',{page:'reels',ref:refs.P}]];
await p.route(/functions\/v1\/w777-agent/,async r=>{const bd=JSON.parse(r.request().postData()||'{}');if(bd.ping||bd.tts!==undefined)return r.fulfill({json:{ok:true}});
  const last=(bd.messages||[]).slice(-1)[0];
  if(last&&Array.isArray(last.content)&&last.content[0]&&last.content[0].type==='tool_result'){results=last.content.map(x=>{try{return JSON.parse(x.content);}catch(e){return {raw:x.content};}});return r.fulfill({json:{content:[{type:'text',text:'تم ✓'}],stop_reason:'end_turn'}});}
  r.fulfill({json:{content:calls.map(([n,a],i)=>({type:'tool_use',id:'t'+i,name:n,input:a})),stop_reason:'tool_use'}});});
await p.click('#agent-fab');await p.waitForTimeout(700);
// تأكيد الإضافات (الطلب، الموعد، الحالة) بوحدها
await p.evaluate(()=>{window.__cf=setInterval(()=>{const b=document.getElementById('cf-ok');if(b)b.click();},150);});
await p.fill('#ag-text','جرب كل الأدوات');await p.evaluate(()=>document.getElementById('ag-form').requestSubmit());
for(let i=0;i<40&&!results;i++)await p.waitForTimeout(500);
const hash=await p.evaluate(()=>location.hash);
let bad=0;const rows=(results||[]).map((r,i)=>{const n=calls[i][0];const e=r&&r.error;const empty=r==null;if(e||empty)bad++;return `${e||empty?'✗':'✓'} ${n} ${JSON.stringify(r).slice(0,110)}`;});
console.log('refs',JSON.stringify(refs));rows.forEach(x=>console.log(x));
const ok=results&&results.length===calls.length&&!bad&&/m=reels/.test(hash)&&!errs.length;
console.log(ok?'OK':'BAD','tools',results&&results.length,'/',calls.length,'errors',bad,'hash',hash,errs.join('|'));
await b.close();process.exit(ok?0:1);})();
