// النجمة (المفضلة) فوق العقارات + الشعار + «شقة غير مفروشة» فالمطابقة + استمارة التمويل + اللعبة كتدخل مباشرة
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;const S=process.env.S||'/tmp';
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route(/googleapis|gstatic|supabase/,r=>r.abort());
await p.goto('http://localhost:8777/bureau/');await p.waitForTimeout(1200);await p.click('#seed');await p.waitForTimeout(1200);
await p.evaluate(()=>location.hash='#/properties?status=');await p.waitForTimeout(900);
const st0=await p.$$eval('#plist .pc-more.fav',x=>x.length);
await p.click('#plist .prop-card >> nth=0 >> .pc-more');await p.click('#plist .prop-card >> nth=0 >> .pc-mi[data-pfav]');await p.waitForTimeout(500);
const url=await p.evaluate(()=>location.hash);
await p.reload();await p.waitForTimeout(1500);await p.evaluate(()=>location.hash='#/properties?status=');await p.waitForTimeout(900);
const st1=await p.$$eval('#plist .pc-more.fav',x=>x.length);
await p.screenshot({path:S+'/fav.png'});
const favOk=st1===st0+1&&url.startsWith('#/properties');
console.log(favOk?'OK ':'BAD','star',st0,'→',st1,'stayed',url);if(!favOk)bad++;
// المطابقة: شقة مفروشة ما كتبانش للي باغي غير مفروشة
const m=await p.evaluate(()=>{const T=window.W777_TEST;return T?T.furnCheck():null;});
console.log(m&&m.ok?'OK ':'BAD','furnished match',JSON.stringify(m));if(!m||!m.ok)bad++;
// التمويل: شرح الألوان + الاستمارة
await p.evaluate(()=>location.hash='#/tamwil');await p.waitForTimeout(1500);
const leg=await p.$('.fin-legend');await p.screenshot({path:S+'/tamwil.png'});
const first=await p.$eval('.fin-card',a=>a.getAttribute('href'));
await p.evaluate(h=>location.hash=h,first);await p.waitForTimeout(900);
await p.fill('#fin-f [name=rate]','4.6% ثابتة');await p.fill('#fin-f [name=years]','25');await p.fill('#fin-f textarea[name=docs]','بطاقة التعريف\nشهادة الأجرة');
await p.click('#fin-f button[type=submit]');await p.waitForTimeout(900);
const mine=await p.$$eval('.fin-mine > div',x=>x.length);const badge=await p.textContent('.fo-head .badge');
await p.screenshot({path:S+'/tamwil-one.png',fullPage:true});
const finOk=!!leg&&mine>=3&&/✅/.test(badge);console.log(finOk?'OK ':'BAD','finance legend',!!leg,'mine',mine,'badge',badge);if(!finOk)bad++;
// اللعبة: الضغط على موضوع كيدخل للعب مباشرة
await p.evaluate(()=>location.hash='#/game/wasla');await p.waitForTimeout(1500);
const cl=await p.$('.wl-modal [data-x], [data-x]');if(cl)await cl.click().catch(()=>{});await p.waitForTimeout(300);
await p.click('[data-g="0"]');await p.waitForTimeout(600);
const inPlay=!!(await p.$('[data-pback]'))&&!(await p.$('.wl-stages'));await p.screenshot({path:S+'/game.png'});
console.log(inPlay?'OK ':'BAD','game direct',inPlay);if(!inPlay)bad++;
if(errs.length){bad++;console.log('errors',errs.join('|'));}
await b.close();process.exit(bad?1:0);})();
