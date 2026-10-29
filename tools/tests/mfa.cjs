// اختبار التحقق بخطوتين بخادم مزيف (بلا حساب حقيقي): الدخول كيطلب الرمز، الرمز الغالط كيترفض، الصحيح كيدخل
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const user={id:'11111111-1111-1111-1111-111111111111',email:'t@x.ma',factors:[{id:'f1',status:'verified',factor_type:'totp'}]};
const sess=aal=>({access_token:'tok-'+aal,refresh_token:'r',expires_in:3600,user});
let verified=0;
// Playwright كيجرب آخر route أولا: العام هو الأول
await p.route(/\/(rest|storage|functions)\/v1\//,r=>r.fulfill({json:[]}));
await p.route(/\/auth\/v1\/token/,r=>r.fulfill({json:sess('aal1')}));
await p.route(/\/auth\/v1\/factors\/f1\/challenge/,r=>r.fulfill({json:{id:'c1'}}));
await p.route(/\/auth\/v1\/factors\/f1\/verify/,r=>{const c=JSON.parse(r.request().postData()).code;if(c==='123456'){verified++;r.fulfill({json:sess('aal2')});}else r.fulfill({status:422,json:{msg:'Invalid TOTP code entered'}});});
let enrolled=0;
await p.route(/\/auth\/v1\/user/,r=>r.fulfill({json:{...user,factors:enrolled?[{id:'f2',status:'verified',factor_type:'totp'}]:[]}}));
await p.route(/\/auth\/v1\/factors$/,r=>r.fulfill({json:{id:'f2',type:'totp',totp:{qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',secret:'JBSWY3DPEHPK3PXP'}}}));
await p.route(/\/auth\/v1\/factors\/f2\/challenge/,r=>r.fulfill({json:{id:'c2'}}));
await p.route(/\/auth\/v1\/factors\/f2\/verify/,r=>{enrolled=1;r.fulfill({json:sess('aal2')});});
await p.route(/\/rest\/v1\/rpc\/w777_is_admin/,r=>r.fulfill({json:true}));
await p.goto('http://127.0.0.1:8777/bureau/#/settings');await p.waitForTimeout(1500);
await p.fill('#cl-form [name=url]','https://demo.supabase.co').catch(()=>{});
await p.fill('#cl-form [name=key]','anon').catch(()=>{});
await p.fill('#cl-form [name=email]','t@x.ma');await p.fill('#cl-form [name=password]','12345678');
const btn=await p.$('#cl-in')||await p.$('#cl-form button[type=submit]');await btn.click();
await p.waitForSelector('#mf-code',{timeout:5000});
const stored0=await p.evaluate(()=>Object.keys(localStorage).filter(k=>/sync|w777_sb|session/i.test(k)&&String(localStorage.getItem(k)).includes('tok-aal1')).length);
await p.fill('#mf-code','000000');await p.click('#mf-ok');await p.waitForTimeout(800);
await p.waitForSelector('#mf-code',{timeout:5000});
await p.fill('#mf-code','123456');await p.click('#mf-ok');await p.waitForTimeout(1500);
const on=await p.evaluate(()=>window.W777_SYNC.isOn());
// المدير: البطاقة كتبان، التفعيل كيورّي QR وكيقبل الرمز
await p.goto('http://127.0.0.1:8777/bureau/#/terms');await p.waitForTimeout(1500);await p.goto('http://127.0.0.1:8777/bureau/#/settings');
await p.waitForSelector('#mfa-on',{timeout:8000});await p.click('#mfa-on');await p.waitForSelector('#mfa-code');
const qrOk=await p.$eval('.modal img[alt=QR]',i=>i.complete&&i.naturalWidth>0);
await p.fill('#mfa-code','654321');await p.click('#mfa-ok');await p.waitForSelector('#mfa-off',{timeout:5000});
await p.screenshot({path:process.argv[2]||'/tmp/mfa.png'});
console.log('admin card enroll ok, qr shown:',qrOk);
console.log('aal1 not stored:',stored0===0,'verified:',verified,'signed in:',on,'errors:',errs);
await b.close();process.exit(stored0===0&&verified===1&&on&&!errs.length?0:1);})();
