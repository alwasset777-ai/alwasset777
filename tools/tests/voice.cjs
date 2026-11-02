// منير فاللعبة كيتكلم فـ 2 ثواني على الأكثر من الضغطة (جواب فوري، سيرفر بطيء، صوت طبيعي بطيء)
const {chromium}=require('playwright');const F=require('../tuto/fake.cjs');
const BASE='http://localhost:8777/bureau/';
const SSE=(t)=>'data: '+JSON.stringify({t})+'\n\n';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;
async function run(name,url,{login=false,chip=1,textDelay=1200,ttsDelay=0}={}){
  const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await c.newPage();
  let ttsN=0;const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.w777_agent_cfg=JSON.stringify({name:'منير',ai_enabled:true});localStorage.w777_wasla=JSON.stringify({lang:'ar',seenHow:1});window.__spk=[];
    const o=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{if(u.text.trim())window.__spk.push([performance.now(),u.text]);o(u);};
    const S0=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){if(this.buffer&&this.buffer.duration>0.2)window.__spk.push([performance.now(),'[cloud]']);return S0.apply(this,a);};});
  await p.route(/googleapis|gstatic|vercel\.app/,r=>r.abort());
  if(login){await F.install(p);}else await p.route(/supabase\.co\/(rest|auth)/,r=>r.abort());
  await p.route(/functions\/v1\/w777-agent/,async r=>{const body=JSON.parse(r.request().postData()||'{}');
    if(body.ping) return r.fulfill({json:{ok:true}});
    if(body.tts!==undefined){ttsN++;await new Promise(z=>setTimeout(z,ttsDelay));return r.fulfill({status:502,json:{error:'tts'}});}
    await new Promise(z=>setTimeout(z,textDelay));
    r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:SSE('هاد الكلمة كتعني الجزء الداخلي ديال الدار. ')+SSE('مثلا فمكناس كاين بزاف ديال الرياضات.')});});
  if(login){await p.goto(BASE);await p.waitForTimeout(800);await F.login(p,BASE);}
  await p.goto(url);await p.waitForTimeout(1500);
  await p.click('[data-g="0"]');await p.waitForTimeout(300);
  await p.click('.wl-c.sel');await p.waitForTimeout(300);await p.click('[data-ask]');await p.waitForTimeout(400);
  const t0=await p.evaluate(n=>{const t=performance.now();document.querySelectorAll('.wl-ai-chips button')[n].click();return t;},chip);
  await p.waitForTimeout(3500);
  const spk=await p.evaluate(()=>window.__spk);if(process.env.DBG)console.log('tts calls',ttsN);const log=(await p.textContent('#wl-ai-log')).slice(0,90);
  const first=spk.length?Math.round(spk[0][0]-t0):null;const ok=first!==null&&first<=2000&&!errs.length;if(!ok)bad++;
  console.log(ok?'OK ':'BAD',name,'first voice after',first,'ms ·',spk.length,'parts ·',log.replace(/\s+/g,' '),errs.join('|'));
  await c.close();}
await run('pub instant answer',BASE+'game.html',{chip:0});
await run('pub server 1.2s',BASE+'game.html',{chip:1,textDelay:1200});
await run('app (no login) server 1.2s',BASE+'#/game',{chip:1,textDelay:1200});
await run('app login, natural voice slow 5s',BASE+'#/game',{login:true,chip:1,textDelay:600,ttsDelay:5000});
await run('app login instant answer',BASE+'#/game',{login:true,chip:0,ttsDelay:5000});
await b.close();process.exit(bad?1:0);})();
