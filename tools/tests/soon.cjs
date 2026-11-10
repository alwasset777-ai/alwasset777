// ⏰ شريط «باقي X أيام» للعضو (7 أيام قبل)، كيتسد بـ ✕؛ والإدارة: «كتسالي ف30 يوم» / «سالات المدة» / «تسجّلو بالإيميل» + تذكير واتساب
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
const ago=(m,d)=>{const x=new Date();x.setMonth(x.getMonth()-m);x.setDate(x.getDate()+(d||0));return x.toISOString();};
const mock=async(p,admin,me,list)=>{
 await p.route(/translate|fonts\.googleapis|gstatic/,r=>r.abort());
 await p.route(/\/(rest|storage|functions)\/v1\//,r=>r.fulfill({json:[]}));
 await p.route(/\/rest\/v1\/rpc\/w777_is_admin/,r=>r.fulfill({json:admin}));
 await p.route(/\/rest\/v1\/rpc\/w777_my_status/,r=>r.fulfill({json:{admin,staff:false,member:!admin,ok:true,email:'m@x.ma'}}));
 await p.route(/\/rest\/v1\/w777_agencies\?/,r=>r.fulfill({json:/uid=eq/.test(r.request().url())?(me?[me]:[]):list}));
 await p.route(/\/auth\/v1\/user/,r=>r.fulfill({json:{id:'55555555-5555-5555-5555-555555555555',email:'m@x.ma'}}));};
// 1) العضو: المدة المجانية كتسالي من دابا 3 أيام
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const me={code:'901',name:'وكالة قريبة',kind:'agency',active:true,terms_at:ago(6,3),sub_until:null,trial_until:null,seat_no:90,seat_zone:'ma',email:'m@x.ma'};
await mock(p,false,me,[]);
await p.goto('http://localhost:8777/bureau/?gate=1#access_token=a&refresh_token=b&expires_in=3600');await p.waitForTimeout(2500);
await p.goto('http://localhost:8777/bureau/?gate=1#/properties');await p.waitForTimeout(1200);
const bar=await p.evaluate(()=>{const b=document.getElementById('sub-bar');return b?{txt:b.textContent.replace(/\s+/g,' ').trim(),wa:/wa\.me\/212777777959/.test(b.innerHTML),scroll:document.documentElement.scrollWidth<=innerWidth+1}:null;});
await p.screenshot({path:S+'/soon-bar.png'});
await p.click('#sub-bar-x');await p.waitForTimeout(200);await p.goto('http://localhost:8777/bureau/?gate=1#/');await p.waitForTimeout(1000);
const hidden=await p.evaluate(()=>!document.getElementById('sub-bar'));
await p.close();
// 2) المدير
const a=await b.newPage({viewport:{width:390,height:844}});a.on('pageerror',e=>errs.push('adm: '+e.message));
const L=[{uid:'a1',code:'801',name:'تسالي قريب',phone:'0611111111',kind:'agency',active:true,terms_at:ago(6,10),seat_no:100,seat_zone:'ma',country:'المغرب'},
 {uid:'a2',code:'802',name:'سالات المدة',phone:'0622222222',kind:'agency',active:true,terms_at:ago(8),seat_no:101,seat_zone:'ma',country:'المغرب'},
 {uid:'a3',code:'803',name:'مسجّل بالإيميل',phone:'0633333333',email:'s@x.ma',kind:'agency',active:true,terms_at:ago(0,-2),seat_no:102,seat_zone:'ma',country:'المغرب',self_signup:true},
 {uid:'a4',code:'804',name:'مجاني مدى الحياة',phone:'0644444444',kind:'agency',active:true,terms_at:ago(9),seat_no:3,seat_zone:'ma',country:'المغرب'}];
await mock(a,true,null,L);
await a.goto('http://localhost:8777/bureau/?gate=1#access_token=a&refresh_token=b&expires_in=3600');await a.waitForTimeout(2200);
await a.goto('http://localhost:8777/bureau/?gate=1#/agencies/manage');await a.waitForTimeout(2500);
const opts=await a.evaluate(()=>['soon','expired','self'].map(v=>(document.querySelector(`[name=agf] option[value=${v}]`)||{}).textContent||''));
const pick=async v=>{await a.selectOption('[name=agf]',v);await a.waitForTimeout(300);return a.evaluate(()=>({rows:[...document.querySelectorAll('#aglist .mb-card .mb-top b, #aglist .list-row b')].map(x=>x.textContent),remind:document.querySelectorAll('#aglist a.wa').length&&[...document.querySelectorAll('#aglist a.wa')].map(x=>x.textContent.trim()),copy:!document.getElementById('ag-soonrow').hidden}));};
const soon=await pick('soon');await a.screenshot({path:S+'/soon-admin.png'});
const exp=await pick('expired');const self=await pick('self');
const ok=bar&&/باقي 3 أيام|باقي 2 أيام|باقي 4 أيام/.test(bar.txt)&&bar.wa&&bar.scroll&&hidden&&/\(1\)/.test(opts[0])&&/\(1\)/.test(opts[1])&&/\(1\)/.test(opts[2])
 &&soon.rows.join()==='تسالي قريب'&&/تذكير/.test(soon.remind[0])&&soon.copy&&exp.rows.join()==='سالات المدة'&&exp.copy&&self.rows.join()==='مسجّل بالإيميل'&&/الترحيب/.test(self.remind[0])&&!self.copy&&!errs.length;
if(!ok)bad++;
console.log(ok?'OK ':'BAD','bar',JSON.stringify(bar),'hidden',hidden,'opts',JSON.stringify(opts),'soon',JSON.stringify(soon),'exp',JSON.stringify(exp),'self',JSON.stringify(self),errs.join('|'));
await b.close();process.exit(bad?1:0);})();
