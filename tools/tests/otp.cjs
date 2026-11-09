// الدخول بالإيميل (كود 6 أرقام) بخادم مزيف: البوابة ← الكود ← البطاقة (تسجيل ذاتي) ← التطبيق؛ الحساب الموقوف؛ الرابط اللي فالإيميل
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
for(const vw of [{width:390,height:844},{width:1200,height:900}]){
const p=await b.newPage({viewport:vw});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const st={registered:false,ok:true,otp:null,reg:null,verify:0};
const user={id:'22222222-2222-2222-2222-222222222222',email:'new@x.ma',factors:[]};
const sess={access_token:'tok-new',refresh_token:'r',expires_in:3600,user};
const today=new Date().toISOString();
await p.route(/translate|fonts\.googleapis|gstatic/,r=>r.abort());
await p.route(/\/(rest|storage|functions)\/v1\//,r=>r.fulfill({json:[]}));
await p.route(/\/rest\/v1\/rpc\/w777_is_admin/,r=>r.fulfill({json:false}));
await p.route(/\/rest\/v1\/rpc\/w777_my_status/,r=>r.fulfill({json:{admin:false,staff:false,member:st.registered,ok:st.ok,email:'new@x.ma'}}));
await p.route(/\/rest\/v1\/rpc\/w777_register/,r=>{st.reg=JSON.parse(r.request().postData());st.registered=true;r.fulfill({json:{code:'778',seat_no:12,seat_zone:'ma',terms_at:today}});});
await p.route(/\/rest\/v1\/w777_agencies\?uid=eq/,r=>r.fulfill({json:st.registered?[{code:'778',name:'وكالة الاختبار',kind:'agency',active:true,terms_at:st.ok?today:'2025-01-01T00:00:00Z',sub_until:null,trial_until:null,seat_no:12,seat_zone:'ma'}]:[]}));
await p.route(/\/auth\/v1\/otp/,r=>{st.otp=JSON.parse(r.request().postData());r.fulfill({json:{}});});
await p.route(/\/auth\/v1\/verify/,r=>{st.verify++;const t=JSON.parse(r.request().postData()).token;if(t==='123456')r.fulfill({json:sess});else r.fulfill({status:403,json:{msg:'Token has expired or is invalid'}});});
await p.route(/\/auth\/v1\/user/,r=>r.fulfill({json:user}));
await p.goto('http://localhost:8777/bureau/?gate=1#/');await p.waitForTimeout(1500);
const gate=await p.evaluate(()=>({gated:document.body.classList.contains('gated'),mail:!!document.getElementById('au-mail'),nav:[...document.querySelectorAll('.bottomnav,.sidenav')].map(n=>getComputedStyle(n).display).find(d=>d!=='none')||'none',scroll:document.documentElement.scrollWidth<=innerWidth+1}));
await p.screenshot({path:S+`/otp-1-${vw.width}.png`});
// الإيميل الغالط ← رسالة؛ الصحيح ← الكود
await p.fill('#au-mail','bad');await p.click('#au-send');await p.waitForTimeout(300);
const stillMail=!!(await p.$('#au-mail'));
await p.fill('#au-mail',' New@X.ma ');await p.click('#au-send');await p.waitForTimeout(900);
const codeStep=await p.evaluate(()=>({code:!!document.getElementById('au-code'),again:document.getElementById('au-again').disabled}));
await p.screenshot({path:S+`/otp-2-${vw.width}.png`});
await p.fill('#au-code','000000');await p.waitForTimeout(900);
const wrong=await p.evaluate(()=>!!document.getElementById('au-code')&&!window.W777_SYNC.isOn());
await p.fill('#au-code','123456');await p.waitForTimeout(2000);
const reg=await p.evaluate(()=>({form:!!document.getElementById('rg'),on:window.W777_SYNC.isOn(),gated:document.body.classList.contains('gated'),kinds:document.querySelectorAll('.rg-kind').length}));
await p.screenshot({path:S+`/otp-3-${vw.width}.png`,fullPage:true});
// بلا الموافقة على القانون ← ما كيتسجلش
await p.fill('#rg [name=name]','وكالة الاختبار');await p.fill('#rg [name=phone]','0612345678');await p.fill('#rg [name=city]','مكناس');
await p.click('#rg-go');await p.waitForTimeout(400);const noTerms=st.reg===null;
await p.check('#rg-ok');await p.click('#rg-go');await p.waitForTimeout(2200);
const home=await p.evaluate(()=>({gated:document.body.classList.contains('gated'),nav:[...document.querySelectorAll('.bottomnav,.sidenav')].map(n=>getComputedStyle(n).display).find(d=>d!=='none')||'none',hash:location.hash,main:document.getElementById('main').textContent.length}));
// الحساب موقوف (المدة سالات)
st.ok=false;await p.evaluate(()=>{localStorage.removeItem('w777_my');});await p.reload();await p.waitForTimeout(2200);
const stop=await p.evaluate(()=>({st:!!document.getElementById('st-re'),wa:(document.querySelector('a.wa[href*="wa.me"]')||{}).href||'',txt:document.querySelector('.auth-card').textContent.includes('موقوف'),gated:document.body.classList.contains('gated')}));
await p.screenshot({path:S+`/otp-4-${vw.width}.png`});
// المدير مدّد ← «جدّدت — دخلني»
st.ok=true;await p.click('#st-re');await p.waitForTimeout(1800);
const back=await p.evaluate(()=>({gated:document.body.classList.contains('gated'),st:!!document.getElementById('st-re')}));
// خروج ← البوابة
st.ok=false;await p.evaluate(()=>localStorage.removeItem('w777_my'));await p.reload();await p.waitForTimeout(1800);await p.click('#st-out');await p.waitForTimeout(1200);
const out=await p.evaluate(()=>({mail:!!document.getElementById('au-mail'),on:window.W777_SYNC.isOn()}));
// الرابط اللي فالإيميل
st.ok=true;await p.goto('http://localhost:8777/bureau/?gate=1#access_token=tok-link&refresh_token=r2&expires_in=3600&token_type=bearer&type=magiclink');await p.waitForTimeout(2500);
const link=await p.evaluate(()=>({on:window.W777_SYNC.isOn(),hash:location.hash,gated:document.body.classList.contains('gated')}));
// بلا ?gate=1 فـ localhost: التطبيق كيبقى كيخدم بلا حساب (الاختبارات الأخرى)
await p.evaluate(()=>{sessionStorage.removeItem('w777_gate');});await p.evaluate(()=>window.W777_SYNC.signOut());await p.goto('http://localhost:8777/bureau/#/properties');await p.waitForTimeout(1200);
const dev=await p.evaluate(()=>!document.body.classList.contains('gated')&&!document.getElementById('au-mail'));
const ok=gate.gated&&gate.mail&&gate.nav==='none'&&gate.scroll&&stillMail&&st.otp&&st.otp.email==='new@x.ma'&&st.otp.create_user===true&&codeStep.code&&codeStep.again&&wrong&&reg.form&&reg.on&&reg.gated&&reg.kinds>=7&&noTerms
 &&st.reg&&st.reg.p_kind==='agency'&&st.reg.p_name==='وكالة الاختبار'&&st.reg.p_country==='المغرب'&&!home.gated&&home.nav!=='none'
 &&stop.st&&/212777777959/.test(stop.wa)&&stop.txt&&stop.gated&&!back.gated&&!back.st&&out.mail&&!out.on&&link.on&&link.hash==='#/'&&dev&&!errs.length;
if(!ok)bad++;
console.log(ok?'OK ':'BAD',vw.width,'gate',JSON.stringify(gate),'otp',JSON.stringify(st.otp),'code',JSON.stringify(codeStep),'wrong',wrong,'reg',JSON.stringify(reg),'noTerms',noTerms,'regBody',JSON.stringify(st.reg),'home',JSON.stringify(home),'stop',JSON.stringify(stop),'back',JSON.stringify(back),'out',JSON.stringify(out),'link',JSON.stringify(link),'dev',dev,errs.join('|'));
await p.close();}
await b.close();process.exit(bad?1:0);})();
