// يولّد قوالب الطبع PDF من brand-print.html + الملف المضغوط ديال الهوية (docs/bureau/files/brand/)
// الاستعمال: cd docs && python3 -m http.server 8777 &  ثم  NODE_PATH=$(npm root -g) node tools/brand_kit.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const BASE = 'http://localhost:8777/bureau/'; const ROOT = path.join(__dirname, '..', 'docs', 'bureau'); const OUT = path.join(ROOT, 'files', 'brand');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage();
  const files = { card: 'carte-visite-wasset.pdf', sale: 'panneau-a-vendre.pdf', rent: 'panneau-a-louer.pdf' };
  for (const [t, f] of Object.entries(files)) {
    await p.goto(BASE + 'brand-print.html?t=' + t); await p.evaluate(() => localStorage.removeItem('w777_brand_kit'));
    await p.goto(BASE + 'brand-print.html?t=' + t); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: path.join(OUT, f), preferCSSPageSize: true, printBackground: true });
    await p.emulateMedia({ media: 'screen' });
    console.log('PDF', f, fs.statSync(path.join(OUT, f)).size);
  }
  await b.close();
  // الألوان + قراءة
  fs.writeFileSync(path.join(OUT, 'couleurs-الألوان.txt'), [
    'مجموعة الوسيط — الألوان / Couleurs Al Wasset Groupe', '',
    'الأحمر / Rouge        #C8102E   RGB 200,16,46', 'الأحمر الغامق / Rouge foncé  #A00D24   RGB 160,13,36',
    'الأكحل / Noir         #111111   RGB 17,17,17', 'الرمادي الفاتح / Gris clair  #F5F5F5   RGB 245,245,245',
    'الأبيض / Blanc        #FFFFFF   RGB 255,255,255', '', 'الخط / Police : Tajawal (فابور — fonts.google.com/specimen/Tajawal)', '',
    'القاعدة: الشعار فيه 777 أصلاً — ما تكتبش «777» حدا الشعار. كتب «مجموعة الوسيط».',
    'Règle : le logo contient déjà 777 — ne jamais écrire « 777 » à côté du logo. Écrire « مجموعة الوسيط / Al Wasset Groupe ».',
    '', 'الدليل الكامل / Charte complète : https://alwasset777-ai.github.io/alwasset777/bureau/brand.html', ''].join('\r\n'));
  // الملف المضغوط
  const zip = path.join(OUT, 'kit-identite-wasset.zip'); try { fs.unlinkSync(zip); } catch (e) {}
  const tmp = fs.mkdtempSync('/tmp/kit-'); const K = path.join(tmp, 'Al-Wasset-Groupe'); fs.mkdirSync(path.join(K, 'logos'), { recursive: true }); fs.mkdirSync(path.join(K, 'modeles'));
  const cp = (a, b2) => fs.copyFileSync(path.join(ROOT, a), path.join(K, b2));
  cp('icons/logo.png', 'logos/logo-rond.png'); cp('icons/brand/logo-flat.png', 'logos/logo-sombre.png'); cp('icons/brand/logo-flat-white.png', 'logos/logo-blanc.png');
  cp('icons/brand/logo-flat.webp', 'logos/logo-sombre.webp'); cp('icons/brand/logo-flat-white.webp', 'logos/logo-blanc.webp');
  for (const f of Object.values(files)) cp('files/brand/' + f, 'modeles/' + f);
  cp('files/brand/couleurs-الألوان.txt', 'couleurs-الألوان.txt');
  execFileSync('zip', ['-qr', '-X', zip, 'Al-Wasset-Groupe'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ZIP', fs.statSync(zip).size);
})();
