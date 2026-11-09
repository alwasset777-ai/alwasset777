// الإدارة: المدير كيتحكم فتواريخ العضو (نهاية المدة المجانية + الاشتراك) — +1 شهر مجاني، +1 عام، وقف دابا ← PATCH فيه trial_until
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const terms=new Date(Date.now()-30*864e5).toISOString();
const mem={uid:'33333333-3333-3333-3333-333333333333',code:'778',name:'وكالة ذاتية',phone:'0612345678',email:'self@x.ma',kind:'agency',active:true,country:'المغرب',city:'مكناس',terms_at:terms,seat_no:12,seat_zone:'ma',sub_until:null,trial_until:null,self_signup:true};
let patch=null;
await p.route(/translate|fonts\.googleapis|gstatic/,r=>r.abort());
await p.route(/\/(rest|storage|functions)\/v1\//,r=>r.fulfill({json:[]}));
await p.route(/\/rest\/v1\/rpc\/w777_is_admin/,r=>r.fulfill({json:true}));
await p.route(/\/rest\/v1\/rpc\/w777_my_status/,r=>r.fulfill({json:{admin:true,staff:false,member:false,ok:true,email:'adm@x.ma'}}));
await p.route(/\/rest\/v1\/w777_agencies\?/,r=>{if(r.request().method()==='PATCH'){patch=JSON.parse(r.request().postData());return r.fulfill({status:204,body:''});}r.fulfill({json:/uid=eq/.test(r.request().url())?[]:[mem]});});
await p.route(/\/auth\/v1\/user/,r=>r.fulfill({json:{id:'44444444-4444-4444-4444-444444444444',email:'adm@x.ma'}}));
await p.goto('http://localhost:8777/bureau/?gate=1#access_token=a&refresh_token=b&expires_in=3600');await p.waitForTimeout(2200);
await p.goto('http://localhost:8777/bureau/?gate=1#/agencies/manage');await p.waitForTimeout(2500);
const btn=await p.$(`[data-edit="${mem.uid}"]`);
if(btn){await btn.click();await p.waitForTimeout(600);}
const m=await p.evaluate(()=>({trial:!!document.querySelector('#age [name=trial_until]'),hint:(document.querySelector('#age [name=trial_until]')||{}).closest?document.querySelector('#age [name=trial_until]').closest('.field').textContent:'',btns:['age-year','age-6m','age-free','age-stop'].every(i=>!!document.getElementById(i)),self:/self@x\.ma/.test((document.getElementById('age')||{}).textContent||'')}));
await p.click('#age-free');const t1=await p.inputValue('#age [name=trial_until]');
await p.click('#age-year');const s1=await p.inputValue('#age [name=sub_until]');
await p.screenshot({path:S+'/admdates.png'});
await p.click('#age-ok');await p.waitForTimeout(800);
// المدة المجانية: 30 يوم مضت ← باقي 5 أشهر ← +1 شهر = 6 أشهر من دابا (تقريبا)
const exp=new Date(terms);exp.setMonth(exp.getMonth()+7);const want=exp.toISOString().slice(0,10);
const y=new Date();y.setFullYear(y.getFullYear()+1);
const ok=!!btn&&m.trial&&m.btns&&m.self&&/6 أشهر/.test(m.hint)&&t1===want&&s1===y.toISOString().slice(0,10)&&patch&&patch.trial_until===want&&patch.sub_until===s1&&!errs.length;
if(!ok)bad++;
console.log(ok?'OK ':'BAD','btn',!!btn,JSON.stringify(m),'trial',t1,'want',want,'sub',s1,'patch',JSON.stringify(patch),errs.join('|'));
await b.close();process.exit(bad?1:0);})();
