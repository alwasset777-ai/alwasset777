// 🛡️ Turnstile: بلا مفتاح ما كيبان والو؛ مع «Site Key» كيبان المربع، والطلب كيمشي فيه captcha_token (الكود + كلمة السر)
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
let otp=null,tokBody=null;
await p.route(/translate|fonts\.googleapis|gstatic/,r=>r.abort());
await p.route(/\/(rest|storage|functions)\/v1\//,r=>r.fulfill({json:[]}));
await p.route(/app\/config\.js/,async r=>{const res=await r.fetch();r.fulfill({response:res,body:(await res.text())+'\nwindow.__ALWASSET_SUPABASE__.turnstile="1x00000000000000000000AA";'});});
await p.route(/challenges\.cloudflare\.com/,r=>r.fulfill({contentType:'application/javascript',body:'window.turnstile={render(el,o){el.innerHTML="<div id=fakecap>✔ ماشي روبو</div>";el.querySelector("#fakecap").onclick=()=>o.callback("tok-cap");},reset(){}};'}));
await p.route(/\/auth\/v1\/otp/,r=>{otp=JSON.parse(r.request().postData());r.fulfill({json:{}});});
await p.route(/\/auth\/v1\/token/,r=>{tokBody=JSON.parse(r.request().postData());r.fulfill({status:400,json:{error_description:'Invalid login credentials'}});});
await p.goto('http://localhost:8777/bureau/?gate=1#/');await p.waitForTimeout(1500);
const cap=await p.evaluate(()=>!!document.getElementById('fakecap'));
await p.fill('#au-mail','cap@x.ma');await p.click('#au-send');await p.waitForTimeout(400);
const blocked=otp===null;
await p.click('#fakecap');await p.click('#au-send');await p.waitForTimeout(900);
const sent=otp&&otp.gotrue_meta_security&&otp.gotrue_meta_security.captcha_token==='tok-cap';
// كلمة السر
await p.click('#au-back');await p.waitForTimeout(300);await p.click('#au-pw');await p.waitForTimeout(500);
await p.fill('#au-pwf [name=email]','agence001');await p.fill('#au-pwf [name=password]','12345678');await p.click('#fakecap');await p.click('#au-pin');await p.waitForTimeout(800);
const pw=tokBody&&tokBody.gotrue_meta_security&&tokBody.gotrue_meta_security.captcha_token==='tok-cap'&&tokBody.email==='agence001@alwasset777.ma';
const ok=cap&&blocked&&sent&&pw&&!errs.length;if(!ok)bad++;
console.log(ok?'OK ':'BAD','widget',cap,'blocked',blocked,'otp',JSON.stringify(otp),'pw',JSON.stringify(tokBody&&{...tokBody,password:'***'}),errs.join('|'));
await b.close();process.exit(bad?1:0);})();
