// الوكيل كيحسب بالأدوات: calculate · loan_calc · buying_fees (خادم مزيف كيطلب الأدوات ومن بعد كنقراو النتائج)
const {chromium}=require('playwright');const F=require('../tuto/fake.cjs');const BASE='http://localhost:8777/bureau/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1200,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));let results=null;
await p.addInitScript(()=>{localStorage.w777_agent_cfg=JSON.stringify({name:'منير',ai_enabled:true});localStorage.w777_agent_voice='0';});
await p.route(/googleapis|gstatic|vercel\.app/,r=>r.abort());await F.install(p);
await p.route(/functions\/v1\/w777-agent/,async r=>{const bd=JSON.parse(r.request().postData()||'{}');if(bd.ping||bd.tts!==undefined)return r.fulfill({json:{ok:true}});
  const last=(bd.messages||[]).slice(-1)[0];
  if(last&&Array.isArray(last.content)&&last.content[0]&&last.content[0].type==='tool_result'){results=last.content.map(x=>JSON.parse(x.content));return r.fulfill({json:{content:[{type:'text',text:'تم الحساب ✓'}],stop_reason:'end_turn'}});}
  r.fulfill({json:{content:[{type:'tool_use',id:'t1',name:'calculate',input:{expression:'900000*2.5/100'}},{type:'tool_use',id:'t2',name:'loan_calc',input:{price:800000}},{type:'tool_use',id:'t3',name:'buying_fees',input:{price:800000}}],stop_reason:'tool_use'}});});
await p.goto(BASE);await p.waitForTimeout(800);await F.login(p,BASE);await p.goto(BASE+'#/');await p.waitForTimeout(1500);
await p.click('#agent-fab');await p.waitForTimeout(800);
await p.fill('#ag-text','شحال الكوميسيون 2.5% على 90 مليون؟');await p.evaluate(()=>document.getElementById('ag-form').requestSubmit());await p.waitForTimeout(3000);
const c=results&&results[0],l=results&&results[1],f=results&&results[2];
const ok=c&&c.result===22500&&l&&l.monthly_installment_dh>4000&&l.monthly_installment_dh<4400&&f&&f.total_fees_dh>50000&&!errs.length;
console.log(ok?'OK':'BAD','calc',c&&c.result,'loan monthly',l&&l.monthly_installment_dh,'income',l&&l.required_monthly_income_dh,'fees',f&&f.total_fees_dh,errs.join('|'));
await b.close();process.exit(ok?0:1);})();
