// 🇫🇷 v194: الكلمات المهنية بالفرنسية (القاموس TR_GLOSS + أسماء الأحياء والبنوك TR_NAMES/W777_FIN) — بلا «Le cadeau» ولا «Corail»…
// كيحتاج الإنترنت (الترجمة ديال الباقي)
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_lang = 'fr'; localStorage.w777_guide_seen = '1'; });
  await p.route(/fonts\.googleapis|gstatic/, r => r.abort()); await F.install(p); await p.goto(BASE); await F.login(p, BASE);
  const out = {};
  for (const h of ['#/property/new', '#/request/new', '#/tamwil', '#/']) { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(3000);
    out[h] = await p.evaluate(() => document.body.innerText + (document.querySelector('.sidenav') || {}).textContent); }
  const all = Object.values(out).join('\n');
  const want = ['Rahn', 'Vente sur plan (VEFA)', 'Titré (titre foncier)', 'Rez-de-chaussée (RDC)', 'Local commercial', 'Marjane', 'Sidi Saïd', 'Bassatine', 'Saham', 'Al Barid Bank', 'Dons solidaires', 'Simulateur de crédit', 'Guide de l’application'];
  const bad = ['Le cadeau', 'Portefeuille', 'Premier médicament', 'Corail', 'Monsieur Saeed', 'Actions bancaires', 'hypothèque', 'Candidature'];
  const miss = want.filter(w => !all.includes(w)), still = bad.filter(w => all.includes(w));
  const ok = !miss.length && !still.length && !errs.length;
  console.log(ok ? 'OK' : 'BAD', 'missing:', miss.join(' | '), 'still bad:', still.join(' | '), errs.join('|'));
  await b.close(); process.exit(ok ? 0 : 1); })();
