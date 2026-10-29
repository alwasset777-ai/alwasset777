// خادم مزيف للدليل والفيديوهات: شبكة الوسيط 777 بمعطيات خيالية (بلا أي حساب ولا معطيات حقيقية)
// الاستعمال: const F = require('./fake.cjs'); await F.install(page); await F.login(page);
const fs = require('fs');
const path = require('path');
const IMG = path.join(__dirname, '../../docs/bureau/game/img');
const hx = n => ((n * 2654435761) >>> 0).toString(16).padStart(8, '0');
const u = n => `${hx(n + 7)}-${hx(n * 3 + 1).slice(0, 4)}-4000-8000-${String(n).padStart(12, '0')}`;
const ME = u(777);
const day = d => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const ago = h => new Date(Date.now() - h * 3600000).toISOString();

// الأعضاء (أسماء خيالية)
const M = [
  [ME, 'agence001', 'مكتب الوسيط 777', 'agency', 'مكناس', 'المغرب', 'حمرية', ['بيع', 'كراء', 'تسيير الأملاك', 'استثمار']],
  [u(1), 'agence014', 'وكالة الأطلس للعقار', 'agency', 'فاس', 'المغرب', 'سايس', ['بيع', 'كراء', 'أراضي']],
  [u(2), 'agence027', 'دار السعادة العقارية', 'agency', 'الرباط', 'المغرب', 'أكدال', ['بيع', 'عقارات فاخرة']],
  [u(3), 'agence041', 'Palmeraie Immo', 'agency', 'مراكش', 'المغرب', 'النخيل', ['كراء موسمي', 'عقارات فاخرة']],
  [u(4), 'agence058', 'وكالة البوغاز', 'agency', 'طنجة', 'المغرب', 'مالاباطا', ['بيع', 'كراء']],
  [u(5), 'agence702', 'Euro-Maroc Habitat', 'agency', 'Lyon', 'فرنسا', '', ['بيع', 'استثمار']],
  [u(6), 'agence715', 'Atlas Homes Bruxelles', 'agency', 'Bruxelles', 'بلجيكا', '', ['بيع', 'مرافقة الزبون']],
  [u(11), 'W012', 'سمير — وسيط عقاري', 'broker', 'مكناس', 'المغرب', 'مرجان', ['شقق', 'كراء']],
  [u(12), 'W033', 'وسيط الخير', 'broker', 'الدار البيضاء', 'المغرب', 'المعاريف', ['بيع', 'محلات تجارية']],
  [u(13), 'W048', 'Immo Conseil Agadir', 'broker', 'أكادير', 'المغرب', 'تالبرجت', ['فيلات', 'أراضي']],
  [u(21), 'B004', 'مقاولة البناء المتين', 'contractor', 'مكناس', 'المغرب', '', ['بناء فيلات وعمارات', 'بناء مفتاح فاليد']],
  [u(22), 'B019', 'شركة الأساس للأشغال', 'contractor', 'فاس', 'المغرب', '', ['تجزئة وتهيئة', 'هندسة مدنية']],
  [u(31), 'F007', 'لمسة ديكور', 'finishing', 'مكناس', 'المغرب', '', ['صباغة', 'جبس وPlaco', 'ديكور داخلي']],
  [u(32), 'F022', 'زليج الأصالة', 'finishing', 'فاس', 'المغرب', '', ['زليج ورخام', 'نجارة']],
  [u(41), 'I003', 'مجموعة الاستثمار الأخضر', 'investor', 'الرباط', 'المغرب', '', ['سكني', 'سياحي / فندقي']],
  [u(42), 'I017', 'Invest Sud Holding', 'investor', 'Paris', 'فرنسا', '', ['أراضي وتجزئات', 'تجاري']],
  [u(51), 'N002', 'مكتب التوثيق النور', 'notary', 'مكناس', 'المغرب', '', ['عقود البيع', 'الوعد بالبيع']],
  [u(52), 'N011', 'مكتب التوثيق الأمان', 'notary', 'الدار البيضاء', 'المغرب', '', ['البيع فـ طور الإنجاز', 'الشركات والشراكات']],
  [u(61), 'A005', 'ودادية الأمل السكنية', 'association', 'مكناس', 'المغرب', '', ['ودادية سكنية', 'شراء أراضي جماعية']],
  [u(62), 'A018', 'تعاونية النخيل للسكن', 'association', 'مراكش', 'المغرب', '', ['تعاونية سكنية', 'بناء جماعي']],
];
const agencies = M.map(([uid, code, name, kind, city, country, district, services], i) => ({
  uid, code, name, kind, city, country, district, services, active: true, phone: uid === ME ? '+212777777959' : `06000${String(100 + i).padStart(5, '0')}`,
  email: uid === ME ? 'alwasset777@gmail.com' : `contact${i}@exemple.ma`, about: uid === ME ? 'مع الوسيط… حلك بسيط' : 'عضو فشبكة الوسيط 777 — خدمة احترافية وثقة.',
  budget: kind === 'investor' ? 5000000 : null, invest_modes: kind === 'investor' ? ['شراكة', 'تمويل'] : null, gps: null,
  terms_at: ago(400), photo: null, logo: null, id_ok: true, sub_until: day(300), created_at: ago(900),
}));

// عقارات الشبكة (خيالية)
const P = [
  [u(1), 'sale', 'apartment', 'فاس', 'سايس', 890000, 110, 3, ['building', 'salon', 'kitchen', 'bedroom']],
  [u(2), 'sale', 'villa', 'الرباط', 'السويسي', 4200000, 520, 6, ['villa', 'pool', 'garden', 'salon']],
  [u(3), 'rent', 'riad', 'مراكش', 'المدينة القديمة', 15000, 280, 5, ['riad', 'courtyard', 'fountain', 'zellige']],
  [u(4), 'sale', 'apartment', 'طنجة', 'مالاباطا', 1350000, 125, 3, ['sea', 'balcony', 'salon', 'bathroom']],
  [u(11), 'rent', 'apartment', 'مكناس', 'مرجان 2', 3200, 80, 2, ['building', 'bedroom', 'kitchen']],
  [u(12), 'sale', 'shop', 'الدار البيضاء', 'المعاريف', 1900000, 60, 0, ['shop', 'street']],
  [u(13), 'sale', 'villa', 'أكادير', 'تالبرجت', 3100000, 400, 4, ['chalet', 'pool', 'garden']],
  [u(5), 'sale', 'plot_house', 'مكناس', 'ويسلان', 450000, 150, 0, ['plot', 'site']],
];
const TYPE_AR = { apartment: 'شقة', villa: 'فيلا', riad: 'رياض', shop: 'محل تجاري', plot_house: 'بقعة أرضية' };
const shared = P.map(([owner, trx, type, city, district, price, area, bedrooms, photos], i) => {
  const ag = agencies.find(a => a.uid === owner);
  const id = 'net' + (i + 1);
  return { owner, id, agency: ag.name, phone: ag.phone, city, type, trx, price, photo_ids: photos, updated_at: ago(i * 7 + 2),
    data: { id, ref: 'N' + (2400 + i), transaction: trx, type, city, district, priceMin: price, priceMax: price, priceUnit: trx === 'rent' ? 'درهم / الشهر' : 'درهم',
      areaTotal: area, specs: bedrooms ? { bedrooms, salons: 1, bathrooms: 2 } : {}, features: ['قريب من الخدمات', 'وثائق سليمة'],
      title: `${TYPE_AR[type]} ${trx === 'rent' ? 'للكراء' : 'للبيع'} — ${district}، ${city}`, description: 'عقار مميز فموقع ممتاز، معروض عبر شبكة الوسيط 777.',
      media: photos.map(p => ({ id: p, kind: 'photo', name: p + '.webp', mime: 'image/webp' })), cover: photos[0], status: 'available' } };
});

const projects = [
  { id: u(901), owner: u(41), owner_name: 'مجموعة الاستثمار الأخضر', title: 'إقامة سياحية بيئية فإفران', category: 'سياحي', city: 'إفران', amount: 12000000, contribution: 'شراكة 40%', description: 'مشروع 24 شاليه بالخشب والطاقة الشمسية قرب الغابة.', status: 'approved', created_at: ago(30) },
  { id: u(902), owner: ME, owner_name: 'مكتب الوسيط 777', title: 'تجزئة سكنية اقتصادية فمكناس', category: 'سكني', city: 'مكناس', amount: 8500000, contribution: 'تمويل + شراكة', description: '64 بقعة مجهزة لفائدة الأسر.', status: 'pending', created_at: ago(8) },
  { id: u(903), owner: u(21), owner_name: 'مقاولة البناء المتين', title: 'عمارة R+4 بمحلات تجارية', category: 'تجاري', city: 'فاس', amount: 6000000, contribution: 'مستثمر شريك', description: '16 شقة و4 محلات فشارع رئيسي.', status: 'approved', created_at: ago(60) },
];
const events = [
  { id: u(801), title: 'صالون العقار المغربي', kind: 'صالون', starts: day(12), ends: day(15), city: 'الدار البيضاء', venue: 'معرض الدار البيضاء', description: 'أكبر صالون للعقار والسكن بالمغرب.', source: 'الوسيط 777' },
  { id: u(802), title: 'ملتقى مغاربة العالم للاستثمار العقاري', kind: 'ملتقى', starts: day(30), ends: day(31), city: 'طنجة', venue: 'قصر المؤتمرات', description: 'لقاءات مع البنوك والمنعشين.', source: 'الوسيط 777' },
  { id: u(803), title: 'تكوين: التسويق العقاري الرقمي', kind: 'تكوين', starts: day(5), ends: null, city: 'مكناس', venue: 'مكتب الوسيط 777', description: 'ورشة عملية لأعضاء الشبكة.', source: 'الوسيط 777' },
  { id: u(804), title: 'معرض السكن الاقتصادي', kind: 'معرض', starts: day(-20), ends: day(-17), city: 'فاس', venue: 'ساحة المعارض', description: 'دورة ناجحة بحضور كبير.', source: 'الوسيط 777' },
];
const news = [
  ['ma', 'برنامج الدعم المباشر للسكن: الشروط والمراحل', 'ملخص مبسط لشروط الاستفادة من الدعم المباشر لاقتناء السكن الرئيسي.'],
  ['ma', 'مكناس: طلب متزايد على الشقق المتوسطة', 'المكاتب العقارية تسجل اهتماما كبيرا بالشقق ذات 3 غرف.'],
  ['ma', 'نصائح قبل توقيع الوعد بالبيع', 'خطوات بسيطة لحماية البائع والمشتري.'],
  ['world', 'Europe : les taux immobiliers se stabilisent', 'Les banques européennes ajustent leurs offres de crédit.'],
  ['world', 'العقار الأخضر: توجه عالمي نحو البناء المستدام', 'مواد بناء جديدة تقلل استهلاك الطاقة.'],
].map(([scope, title, summary], i) => ({ id: u(700 + i), scope, title, summary, source: 'الوسيط 777 (مثال)', url: null, lang: 'ar', published: day(-i), created_at: ago(i * 20) }));
const donations = [
  { id: u(601), owner: u(61), owner_name: 'ودادية الأمل السكنية', title: 'ترميم سقف دار أرملة وأطفالها', need: 'repair', city: 'مكناس', amount: 25000, raised: 17500, story: 'الدار مهددة بالمطر، والعائلة محتاجة ترميم السقف قبل الشتاء.', status: 'approved', created_at: ago(50) },
  { id: u(602), owner: u(62), owner_name: 'تعاونية النخيل للسكن', title: 'كراء سنة لعائلة فوضعية صعبة', need: 'rent', city: 'مراكش', amount: 18000, raised: 6000, story: 'مساعدة مؤقتة حتى يستقر رب الأسرة فعمل جديد.', status: 'approved', created_at: ago(90) },
];
const disputes = [
  { id: u(501), owner: ME, owner_name: 'مكتب الوسيط 777', category: 'كراء', title: 'المكتري ما خلصش 3 شهور', description: 'مثال تعليمي.', city: 'مكناس', specialist: 'lawyer', status: 'escalated', created_at: ago(40) },
  { id: u(502), owner: u(11), owner_name: 'سمير — وسيط عقاري', category: 'بيع', title: 'خلاف على العربون بعد الوعد بالبيع', description: 'مثال تعليمي.', city: 'فاس', specialist: 'notary', status: 'in_progress', created_at: ago(70) },
];
const stories = [
  { id: u(401), owner: u(3), kind: 'text', body: '🌴 رياض جديد للكراء الموسمي فقلب المدينة القديمة!', bg: 'g3', created_at: ago(3) },
  { id: u(402), owner: u(1), kind: 'text', body: '🎉 بعنا اليوم شقة فسايس عبر الشبكة — شكرا الوسيط 777', bg: 'g1', created_at: ago(6) },
  { id: u(403), owner: ME, kind: 'text', body: 'مع الوسيط… حلك بسيط ✨ عروض جديدة هاد السيمانة', bg: 'g2', created_at: ago(9) },
];
const stays = [
  { id: u(301), owner: ME, owner_name: 'مكتب الوسيط 777', title: 'شقة مفروشة راقية قرب المدينة الجديدة', kind: 'apartment', city: 'مكناس', district: 'حمرية', price_night: 450, cleaning_fee: 100, min_nights: 2, max_guests: 4, bedrooms: 2, beds: 3, baths: 1, amenities: ['wifi', 'ac', 'parking', 'kitchen'], description: 'شقة نظيفة ومجهزة بالكامل.', rules: 'ممنوع التدخين', photos: [], address: '', owner_phone: '+212777777959', status: 'approved', created_at: ago(100) },
  { id: u(302), owner: u(3), owner_name: 'Palmeraie Immo', title: 'رياض تقليدي بمسبح', kind: 'riad', city: 'مراكش', district: 'المدينة القديمة', price_night: 1200, cleaning_fee: 200, min_nights: 2, max_guests: 8, bedrooms: 4, beds: 5, baths: 3, amenities: ['wifi', 'pool', 'ac'], description: 'رياض أصيل وسط المدينة.', rules: '', photos: [], address: '', owner_phone: '0600000103', status: 'approved', created_at: ago(200) },
];
const msgs = [
  { id: u(201), sender: u(1), recipient: ME, body: 'السلام، عندي زبون كيقلب على فيلا فمكناس، واش عندكم شي حاجة؟', created_at: ago(2), read_at: null },
  { id: u(202), sender: ME, recipient: u(1), body: 'وعليكم السلام، عندنا فيلا فالرياض 300م² — نصيفطها ليك دابا.', created_at: ago(1.5), read_at: ago(1) },
];
const ratings = [{ rater: u(1), target: ME, stars: 5, comment: 'تعامل احترافي وسريع 👌', created_at: ago(30), updated_at: ago(30) }];
const invest = [{ id: u(101), owner: u(41), owner_name: 'مجموعة الاستثمار الأخضر', mode: 'شراكة', sectors: ['سياحي / فندقي'], status: 'open', created_at: ago(20) }];

const T = { w777_agencies: agencies, w777_shared_props: shared, w777_projects: projects, w777_events: events, w777_news: news, w777_donations: donations,
  w777_disputes: disputes, w777_stories: stories, w777_stays: stays, w777_msgs: msgs, w777_ratings: ratings, w777_invest: invest,
  w777_agent_config: [{ id: 1, name: 'منير', ai_enabled: true }], w777_story_likes: [{ story_id: u(401), uid: u(1) }, { story_id: u(401), uid: u(2) }, { story_id: u(402), uid: ME }],
  w777_story_comments: [{ id: u(151), story_id: u(401), uid: u(2), body: 'رائع 😍', created_at: ago(2) }] };

// فلترة بسيطة ديال PostgREST: col=eq.x / neq / in.(…) / is.true
function filter(rows, q) {
  for (const [k, v] of q) {
    if (['select', 'order', 'limit', 'offset', 'or', 'on_conflict'].includes(k) || k.includes('.')) continue;
    const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) continue;
    const [, op, val] = m;
    rows = rows.filter(r => {
      const x = r[k]; const s = x == null ? 'null' : String(x);
      if (op === 'eq') return s === val;
      if (op === 'neq') return s !== val;
      if (op === 'is') return s === val;
      if (op === 'in') return val.replace(/[()]/g, '').split(',').map(decodeURIComponent).includes(s);
      return true;
    });
  }
  return rows;
}
const RPC = { w777_is_admin: true, w777_admin_uid: ME, w777_staff_brand: null, w777_stay_busy: [], w777_owner_bookings: [], w777_my_kind: 'agency', w777_can_use: true };
const user = { id: ME, email: 'demo@alwasset777.ma', factors: [] };
const sess = { access_token: 'demo-token', refresh_token: 'demo-r', expires_in: 360000, expires_at: Math.floor(Date.now() / 1000) + 360000, token_type: 'bearer', user };

async function install(page) {
  // كل طلب لـ Supabase كيتجاوب محليا (حتى حاجة ما كتخرج للإنترنت)
  await page.route(/supabase\.co|\/(rest|auth|storage|functions)\/v1\//, async r => {
    const url = new URL(r.request().url()), pth = url.pathname, meth = r.request().method();
    if (pth.startsWith('/auth/v1/')) {
      if (pth.endsWith('/user')) return r.fulfill({ json: user });
      if (pth.endsWith('/token') || pth.endsWith('/verify')) return r.fulfill({ json: sess });
      return r.fulfill({ json: {} });
    }
    if (pth.startsWith('/storage/v1/')) {
      if (pth.includes('/object/sign/') && meth === 'POST') {
        const body = JSON.parse(r.request().postData() || '{}');
        return r.fulfill({ json: (body.paths || []).map(p => ({ path: p, signedURL: '/object/sign/demo/' + p + '?token=demo', error: null })) });
      }
      const name = (pth.match(/([a-z]+)(?:\.t)?(?:\.webp|\.jpg)?$/) || [])[1];
      const f = name && path.join(IMG, name + '.webp');
      if (f && fs.existsSync(f)) return r.fulfill({ body: fs.readFileSync(f), contentType: 'image/webp' });
      return r.fulfill({ status: meth === 'GET' ? 404 : 200, json: meth === 'GET' ? {} : [] });
    }
    if (pth.startsWith('/functions/v1/')) return r.fulfill({ json: { ok: true, reply: 'مرحبا! أنا منير، المساعد ديال الوسيط 777 🤖' } });
    const rpc = pth.match(/\/rest\/v1\/rpc\/(\w+)/);
    if (rpc) return r.fulfill({ json: rpc[1] in RPC ? RPC[rpc[1]] : null });
    const t = (pth.match(/\/rest\/v1\/(\w+)/) || [])[1];
    if (meth !== 'GET') return r.fulfill({ json: [] });
    let rows = filter(T[t] || [], url.searchParams);
    if (t === 'w777_stays' && url.searchParams.get('status')) rows = rows.filter(x => x.status === 'approved');
    return r.fulfill({ json: rows, headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` } });
  });
}

// الدخول بالحساب التجريبي (كيمر من نفس الفورم ديال التطبيق)
async function login(page, base) {
  await page.goto(base + '#/settings'); await page.waitForTimeout(1200);
  await page.fill('#cl-form [name=url]', 'https://demo.supabase.co').catch(() => {});
  await page.fill('#cl-form [name=key]', 'anon').catch(() => {});
  await page.fill('#cl-form [name=email]', 'demo@alwasset777.ma');
  await page.fill('#cl-form [name=password]', 'demo-demo');
  const btn = await page.$('#cl-in') || await page.$('#cl-form button[type=submit]');
  await btn.click(); await page.waitForTimeout(2500);
  return page.evaluate(() => window.W777_SYNC && window.W777_SYNC.isOn());
}

// صور تجريبية للعقارات المحلية (من صور اللعبة المرخصة)
async function addPhotos(page, base) {
  const map = { apartment: ['building', 'salon', 'kitchen', 'bedroom'], villa: ['villa', 'pool', 'garden', 'salon'], plot_house: ['plot', 'site'], shop: ['shop', 'street'], farm: ['farm', 'olive', 'well'] };
  await page.evaluate(async ({ map, base }) => {
    const DB = window.W777_DB; const props = await DB.all('properties');
    for (const p of props) {
      const names = (p.transaction === 'rent' ? ['salon', 'bedroom', 'balcony'] : map[p.type]) || ['building'];
      p.media = [];
      for (const n of names) {
        const blob = await (await fetch(base + 'game/img/' + n + '.webp')).blob();
        const id = 'demo-' + n + '-' + p.id.slice(0, 6);
        await DB.put('files', { id, owner: p.id, kind: 'photo', name: n + '.webp', mime: 'image/webp', size: blob.size, blob, thumb: blob });
        p.media.push({ id, kind: 'photo', name: n + '.webp', mime: 'image/webp', size: blob.size });
      }
      p.cover = p.media[0].id;
      await DB.saveRec('properties', p);
    }
  }, { map, base });
  await page.reload(); await page.waitForTimeout(1500);
}

module.exports = { install, login, addPhotos, ME };
