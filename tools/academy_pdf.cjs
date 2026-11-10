// كيولد ملفات PDF ديال الأكاديمية (M1 → M7) فـ docs/bureau/files/formation/
// الاستعمال: cd docs && python3 -m http.server 8777 &  ثم  NODE_PATH=$(npm root -g) node tools/academy_pdf.cjs
const { chromium } = require('playwright'); const path = require('path');
const OUT = path.join(__dirname, '..', 'docs', 'bureau', 'files', 'formation');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
  for (let i = 1; i <= 7; i++) {
    const m = 'M' + i;
    await p.goto(`http://localhost:8777/bureau/academy-print.html?m=${m}`);
    await p.evaluate(() => document.querySelectorAll('img[loading]').forEach(x => x.removeAttribute('loading')));
    await p.waitForFunction(() => [...document.images].every(x => x.complete), null, { timeout: 30000 });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
    await p.pdf({ path: path.join(OUT, m + '.pdf'), format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    console.log('ok', m);
  }
  await b.close();
})();
