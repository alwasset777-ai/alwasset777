// مراحل الدليل التعليمي (الترتيب = ترتيب التعلم). كل مرحلة: عنوان + شعار + الدروس المرتبطة فـ guide-data.js + سيناريو التصوير
// E.cap(نص, async () => {...}) = النص كيبان تحت الهاتف طول مدة هاد الحركات
module.exports = [
  {
    n: 1, t: 'ثبّت التطبيق وادخل بحسابك', tag: 'دقيقة واحدة وتكون جاهزا', lessons: [1, 2, 49], go: '#/settings',
    intro: 'التطبيق يعمل من الهاتف أو الحاسوب بلا متجر تطبيقات: رابط واحد، ثم «إضافة إلى الشاشة الرئيسية»، فيصبح أيقونة كباقي التطبيقات.',
    async film(E) {
      await E.cap('افتح رابط التطبيق ← «إضافة إلى الشاشة الرئيسية»', async () => { await E.hold(1600); await E.scroll(380, 1500); await E.hold(500); });
      await E.cap('من «الإعدادات» أدخل رمزك (agence001…) وكلمة السر', async () => {
        await E.go('#/settings', 900);
        await E.eval(() => ['url', 'key'].forEach(n => { const i = document.querySelector(`#cl-form [name=${n}]`); if (i) (i.closest('.field, label, div') || i).style.display = 'none'; }));
        await E.scrollTo('#cl-form [name=email]', 1200);
        await E.type('#cl-form [name=email]', 'agence001'); await E.type('#cl-form [name=password]', '••••••••');
      });
      await E.cap('اضغط «دخول» — حسابك محمي ومنفصل عن الجميع', async () => { await E.tap('#cl-in', 1800); await E.hold(900); });
    },
  },
  {
    n: 2, t: 'الشاشة الرئيسية وزر «+»', tag: 'يومك كله في نظرة واحدة', lessons: [3, 4], go: '#/',
    intro: 'الشاشة الرئيسية هي لوحة القيادة: الأرقام المهمة، مواعيد اليوم، الأخبار، والدخول السريع لكل الأقسام.',
    async film(E) {
      await E.cap('لوحة القيادة: كل أرقام المكتب أمامك', async () => { await E.go('#/'); await E.hold(1400); await E.scroll(700, 2400); await E.hold(600); });
      await E.cap('زر «+» الأحمر: أي عملية في ضغطتين', async () => { await E.tap('#fab', 1500); await E.hold(900); });
      await E.cap('أزرار «خدمات المجموعة» و«شبكة الوسيط 777» تفتح كل الأقسام', async () => {
        await E.page.keyboard.press('Escape'); await E.go('#/'); await E.scrollTo('[data-hm="svc"]', 900); await E.tap('[data-hm="svc"]', 1500); await E.hold(800);
      });
    },
  },
  {
    n: 3, t: 'أضف عقارك الأول', tag: 'ملف احترافي لكل عقار', lessons: [5, 6], go: '#/property/new',
    intro: 'كل عقار له ملف كامل: العملية، النوع، الموقع، المساحة، الثمن، الصور والوثائق. الخانات تتغير حسب نوع العقار.',
    async film(E) {
      await E.cap('اختر العملية ونوع العقار', async () => { await E.go('#/property/new', 1300); await E.hold(1300); await E.scroll(520, 1800); await E.hold(500); });
      await E.cap('حدد المدينة والحي والمساحة والثمن', async () => { await E.scroll(900, 2600); await E.hold(600); });
      await E.cap('أضف الصور: الشعار والهاتف يُطبعان عليها تلقائيا', async () => { await E.scroll(1100, 2600); await E.hold(900); });
    },
  },
  {
    n: 4, t: 'العقارات: القائمة، العرض والملصق', tag: 'اعرض عقاراتك كالمحترفين', lessons: [7, 8, 36, 37, 38], go: '#/properties',
    intro: 'ابحث وصفّ ورتّب عقاراتك في ثوان، ثم افتح أي عقار لتعرضه على الزبون بالشاشة الكاملة أو تصنع له ملصقا إعلانيا برمز QR.',
    async film(E) {
      await E.cap('قائمة العقارات: فلترة حسب العملية والحالة والثمن', async () => { await E.go('#/properties', 1300); await E.hold(1200); await E.scroll(600, 2000); });
      await E.cap('افتح العقار: الصور، التفاصيل، والمشاركة', async () => { await E.go('#/properties', 900); await E.tap('a[href^="#/property/"]:not([href$="/new"])', 1500); await E.hold(700); await E.scroll(800, 2400); });
      await E.cap('أزرار العرض للزبون، الملصق + QR، وواتساب', async () => { await E.scroll(700, 2000); await E.hold(1000); });
    },
  },
  {
    n: 5, t: 'الزبناء والطلبات والمطابقة الذكية', tag: 'لن يضيع منك أي زبون', lessons: [9, 10, 11], go: '#/requests',
    intro: 'سجّل طلب كل زبون (ماذا يبحث، أين، وبكم)، والتطبيق يقترح عليه العقارات المناسبة تلقائيا.',
    async film(E) {
      await E.cap('طلبات الزبناء في مكان واحد', async () => { await E.go('#/requests', 1200); await E.hold(1300); });
      await E.cap('ملف الزبون: الميزانية، الأحياء، والعقارات المقترحة', async () => { await E.tap('a[href^="#/request/"]:not([href$="/new"])', 1400); await E.scroll(700, 2200); await E.hold(600); });
      await E.cap('«المطابقة»: التطبيق يربط كل زبون بالعقار المناسب', async () => { await E.go('#/matching', 1300); await E.hold(1200); await E.scroll(500, 1800); });
    },
  },
  {
    n: 6, t: 'المواعيد والزيارات', tag: 'كل زيارة في وقتها', lessons: [12, 40], go: '#/appointments',
    intro: 'نظّم زياراتك مع التذكير، وسجّل كل زيارة مع توقيع الزبون لتحمي عمولتك.',
    async film(E) {
      await E.cap('موعد جديد: الزبون، العقار، اليوم والساعة', async () => { await E.go('#/appointment/new', 1200); await E.hold(1300); await E.scroll(500, 1800); });
      await E.cap('قائمة المواعيد مع التذكيرات', async () => { await E.go('#/appointments', 1200); await E.hold(1600); });
    },
  },
  {
    n: 7, t: 'تقدير الأثمان', tag: 'أرقام تقنع الجميع', lessons: [13, 39], go: '#/estimate',
    intro: 'قارن ثمن العقار بالأثمان المرجعية للحي والمدينة قبل أن تعطي رأيك للبائع أو المشتري.',
    async film(E) {
      await E.cap('اختر المدينة والحي ونوع العقار', async () => { await E.go('#/estimate', 1300); await E.hold(1300); await E.scroll(500, 1800); });
      await E.cap('النتيجة: ثمن المتر والمقارنة مع السوق', async () => { await E.scroll(700, 2200); await E.hold(900); });
    },
  },
  {
    n: 8, t: 'العقود ومراحل التملك', tag: 'أكثر من 20 عقدا جاهزا', lessons: [14, 15], go: '#/contracts',
    intro: 'مكتبة عقود جاهزة للتعبئة والطباعة، ودليل مراحل شراء العقار من الوعد بالبيع حتى التحفيظ.',
    async film(E) {
      await E.cap('مكتبة العقود: بيع، كراء، وعد بالبيع، وكالة…', async () => { await E.go('#/contracts', 1300); await E.hold(1200); await E.scroll(800, 2400); });
      await E.cap('مراحل تملك العقار خطوة بخطوة', async () => { await E.go('#/ownership', 1300); await E.hold(1200); await E.scroll(700, 2200); });
    },
  },
  {
    n: 9, t: 'التمويل العقاري', tag: 'البنوك وشركات التمويل في جيبك', lessons: [35], go: '#/tamwil',
    intro: 'احسب القسط الشهري في ثوان، وتعرّف على جهات التمويل السكني والتجاري بالمغرب وخارجه، مع مراحل الملف خطوة بخطوة.',
    async film(E) {
      await E.cap('حساب القسط الشهري والدخل اللازم', async () => { await E.go('#/loan', 1300); await E.hold(1200); await E.scroll(500, 1800); });
      await E.cap('«التمويل العقاري»: كل الجهات بشعاراتها', async () => { await E.go('#/tamwil', 1500); await E.hold(1300); await E.scroll(900, 2600); });
      await E.cap('بطاقة الجهة: الموقع، المعلومات، ومراحل الملف', async () => { await E.go('#/tamwil/awb', 1500); await E.hold(1000); await E.scroll(900, 2600); await E.hold(600); });
    },
  },
  {
    n: 10, t: 'الكراء والمحفظة والتقرير الشهري', tag: 'مداخيلك تحت السيطرة', lessons: [41, 42, 43], go: '#/finance',
    intro: 'تابع الكراء الشهري والوصولات، المداخيل والمصاريف والربح، واطبع تقرير الشهر بضغطة.',
    async film(E) {
      await E.cap('تدبير الكراء: الأداءات والوصولات', async () => { await E.go('#/rentals', 1300); await E.hold(1500); });
      await E.cap('المحفظة المالية: الدخل، المصاريف والربح', async () => { await E.go('#/finance', 1300); await E.hold(1200); await E.scroll(600, 2000); });
      await E.cap('التقرير الشهري جاهز للطباعة PDF', async () => { await E.go('#/report', 1300); await E.hold(1200); await E.scroll(600, 2000); });
    },
  },
  {
    n: 11, t: 'منير، الأكاديمية ولعبة «وصلة العقار»', tag: 'مساعد ذكي يتكلم الدارجة', lessons: [17, 16], go: '#/learn',
    intro: 'منير مساعدك الذكي: يجيب بالصوت والكتابة، ويفهم الدارجة. والأكاديمية واللعبة لتعلم مصطلحات العقار بمتعة.',
    async film(E) {
      await E.cap('اضغط على منير: اسأله بالصوت أو الكتابة', async () => { await E.go('#/', 900); await E.tap('#agent-fab', 1800); await E.hold(1200); });
      await E.cap('الأكاديمية: دروس لفريقك', async () => { await E.eval(() => { const c = document.querySelector('#ag-close'); if (c) c.click(); }); await E.go('#/learn', 1300); await E.hold(1200); await E.scroll(600, 2000); });
      await E.cap('لعبة «وصلة العقار»: تعلّم وأنت تلعب', async () => { await E.go('#/game', 1800); await E.hold(1500); await E.scroll(400, 1500); });
    },
  },
  {
    n: 12, t: 'بوابة شبكة الوسيط 777', tag: 'أكبر شبكة عقارية مترابطة', lessons: [18, 19, 20, 21], go: '#/agencies',
    intro: 'شارك عقاراتك مع كل أعضاء الشبكة، وتصفّح عقاراتهم، وابحث في دليل الوكالات داخل المغرب وخارجه.',
    async film(E) {
      await E.cap('زر «شبكة الوسيط 777» يفتح كل الأقسام', async () => { await E.go('#/', 900); await E.scrollTo('[data-hm="net"]', 900); await E.tap('[data-hm="net"]', 1500); await E.hold(900); });
      await E.cap('عقارات الشبكة: آلاف العقارات بين يديك', async () => { await E.page.keyboard.press('Escape'); await E.go('#/agencies', 1800); await E.hold(800); await E.scroll(900, 2600); });
      await E.cap('دليل الوكالات: داخل المغرب وخارجه', async () => { await E.go('#/agencies/dir', 1500); await E.hold(900); await E.scroll(900, 2400); });
    },
  },
  {
    n: 13, t: 'الوسطاء والمقاولات والتشطيب', tag: 'من الأساس إلى آخر لمسة', lessons: [22, 23], go: '#/brokers',
    intro: 'كل مهن العقار في شبكة واحدة: وسطاء، شركات بناء، وشركات تشطيب — تواصل معهم مباشرة.',
    async film(E) {
      await E.cap('الوسطاء العقاريون في مدينتك', async () => { await E.go('#/brokers', 1500); await E.hold(1000); await E.scroll(600, 2000); });
      await E.cap('شركات المقاولات', async () => { await E.go('#/contractors', 1500); await E.hold(1000); await E.scroll(500, 1600); });
      await E.cap('شركات التشطيب والديكور', async () => { await E.go('#/finishing', 1500); await E.hold(1000); await E.scroll(500, 1600); });
    },
  },
  {
    n: 14, t: 'المشاريع والمستثمرون', tag: 'فكرتك تستحق مستثمرا', lessons: [24, 25], go: '#/projects',
    intro: 'اعرض مشروعك العقاري لتجد ممولا أو شريكا، وتابع مشاريعك، وتعرّف على المستثمرين في الشبكة.',
    async film(E) {
      await E.cap('المشاريع المنشورة الباحثة عن تمويل', async () => { await E.go('#/projects', 1500); await E.hold(1000); await E.scroll(800, 2400); });
      await E.cap('اعرض مشروعك في دقيقة', async () => { await E.go('#/projects/new', 1300); await E.hold(1000); await E.scroll(600, 2000); });
      await E.cap('المستثمرون في الشبكة', async () => { await E.go('#/investors', 1500); await E.hold(1000); await E.scroll(500, 1600); });
    },
  },
  {
    n: 15, t: 'الستوري والرسائل والتقييم', tag: 'تواصل كالشبكات الاجتماعية', lessons: [45, 46, 47], go: '#/inbox',
    intro: 'انشر ستوري لعروضك، واجمع الإعجابات والتعليقات، وراسل أي عضو داخل التطبيق، وقيّم تعاملك مع الشركاء.',
    async film(E) {
      await E.cap('الستوري: انشر عروضك اليومية', async () => { await E.go('#/', 1200); await E.tap('[data-st]:not([data-st=""]) >> nth=1', 2200); await E.live(1200); });
      await E.cap('إعجاب ❤️ وتعليق مثل الشبكات الاجتماعية', async () => { await E.tap('.st-foot button >> nth=0', 900); await E.hold(1200); });
      await E.cap('الرسائل بين الأعضاء داخل التطبيق', async () => {
        await E.page.keyboard.press('Escape'); await E.eval(() => document.querySelectorAll('.st-ov, .st-view, .story-ov').forEach(x => x.remove()));
        await E.go('#/inbox', 1500); await E.hold(1200); await E.tap('#main a, main a.card, main .row >> nth=0', 1400); await E.hold(1000);
      });
    },
  },
  {
    n: 16, t: 'الأخبار والمناسبات والهبة', tag: 'العقار في خدمة الإنسان', lessons: [26, 27, 28], go: '#/events',
    intro: 'أخبار العقار تتجدد كل يوم، ومعارض وملتقيات لا تفوّتها، و«الهبة» لمساعدة أسر محتاجة على السكن.',
    async film(E) {
      await E.cap('الأخبار العقارية: المغرب والعالم', async () => { await E.go('#/news', 1500); await E.hold(1000); await E.scroll(600, 2000); });
      await E.cap('المناسبات: المعارض والملتقيات القادمة', async () => { await E.go('#/events', 1500); await E.hold(1000); await E.scroll(700, 2200); });
      await E.cap('«الهبة»: سقف لكل عائلة', async () => { await E.go('#/donations', 1500); await E.hold(1000); await E.scroll(700, 2200); });
    },
  },
  {
    n: 17, t: 'النزاعات والحلول القانونية', tag: 'اعرف حقك في دقيقة', lessons: [29, 30, 31], go: '#/disputes',
    intro: 'صف مشكلتك العقارية فتحصل على الحل القانوني الأولي، ويمكن تحويل الملف لمحام أو موثق أو عدل.',
    async film(E) {
      await E.cap('اختر نوع النزاع واكتب المشكل', async () => { await E.go('#/disputes', 1500); await E.hold(1200); await E.scroll(700, 2200); });
      await E.cap('الدليل القانوني وملفاتك', async () => { await E.go('#/disputes/guide', 1500); await E.hold(1000); await E.scroll(700, 2200); });
    },
  },
  {
    n: 18, t: 'التسويق: الكتالوج وكراء العطلة', tag: 'زبناء جدد كل يوم', lessons: [44], go: '#/stays',
    intro: 'صفحة عمومية لعقاراتك تشاركها مع الزبناء، وكراء الشقق المفروشة للعطلة مع الحجز من الموقع.',
    async film(E) {
      await E.cap('«كراء العطلة»: شقق مفروشة وحجوزات', async () => { await E.go('#/stays', 1500); await E.hold(1200); await E.scroll(600, 2000); });
      await E.cap('الكتالوج العمومي: رابط عقاراتك للزبناء', async () => { await E.go('#/settings', 1300); await E.scrollTo('#catalog, [data-sec="catalog"], .catalog-card', 1600); await E.hold(1200); });
    },
  },
  {
    n: 19, t: 'لوحة المدير', tag: 'كل الشبكة تحت سيطرتك', lessons: [32, 33, 34, 48], go: '#/agencies/manage',
    intro: 'للمدير فقط: إدارة الحسابات، مراجعة المشاريع والهبات قبل النشر، معالجة النزاعات، وحسابات الموظفين.',
    async film(E) {
      await E.cap('إدارة الحسابات والاشتراكات', async () => { await E.go('#/agencies/manage', 1600); await E.hold(1200); await E.scroll(700, 2200); });
      await E.cap('مراجعة المشاريع قبل النشر', async () => { await E.go('#/projects/review', 1500); await E.hold(1200); await E.scroll(500, 1600); });
      await E.cap('معالجة النزاعات', async () => { await E.go('#/disputes/all', 1500); await E.hold(1200); });
    },
  },
];
