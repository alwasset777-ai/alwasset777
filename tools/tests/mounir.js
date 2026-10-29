const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for (const [url,name] of [['http://localhost:8777/bureau/#/game','app'],['http://localhost:8777/bureau/game.html','pub']]){
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let sent=null;
await p.route(/googleapis|gstatic/,r=>r.abort());
await p.route(/functions\/v1\/w777-agent/,async r=>{sent=JSON.parse(r.request().postData()); await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'الجواب هو **'+sent.game.a+'** — كلمة كتعني …'})})});
await p.route(/supabase\.co\/(rest|auth)/,r=>r.abort());
await p.addInitScript(()=>{localStorage.w777_wasla=JSON.stringify({lang:'ar',seenHow:1})});
await p.goto(url);await p.waitForTimeout(1500);
await p.click('[data-g="0"]'); await p.click('[data-s="0"]'); await p.waitForTimeout(300);
await p.click('.wl-c.sel'); await p.waitForTimeout(300);
await p.click('[data-ask]'); await p.waitForTimeout(300);
await p.click('.wl-ai-chips button'); await p.waitForTimeout(800);
await p.screenshot({path:(process.env.S || '/tmp')+'/mounir_'+name+'.png'});
console.log(name, 'sent', JSON.stringify(sent&&{lang:sent.lang,game:sent.game,n:sent.messages.length}), 'log:', (await p.textContent('#wl-ai-log')).slice(0,160), errs.join('|')||'no errors');
await c.close();}
await b.close();})();
