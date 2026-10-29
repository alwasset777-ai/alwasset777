/* ============================================================
   وصلة العقار — لعبة كلمات متقاطعة بأسلوب «وصلة»: مجموعات ← مراحل ← أسئلة (بالصور)
   كيتخدم فالتطبيق (#/game) وفالصفحة العمومية game.html. المراحل فـ wasla-levels.js (W777_WL).
   W777_CW.mount(root, host) — host: { logo, onFinish({points, words}), loadBoard(), shareUrl }
   ============================================================ */
(function () {
  'use strict';
  const LS = 'w777_wasla';
  const IMG = 'game/img/';
  const MOUNIR = 'game/mounir.webp?v=1'; // منير بلباس اللعبة
  const START_HELPS = 6;

  const T = {
    ar: {
      title: 'وصلة العقار', play: 'العب', groups: 'المجموعات', stage: 'المرحلة', helps: 'مساعدات', stars: 'نجوم', pts: 'نقطة',
      settings: 'الإعدادات', lang: 'اللغة', close: 'إغلاق', back: 'رجوع', remove: 'إحذف حرف', reveal: 'إكشف حرف', clear: 'مسح',
      locked: 'كمل المجموعة اللي قبل باش تتفتح', lockedStage: 'حل المرحلة اللي قبل أولاً', noHelps: 'ما بقاتش مساعدات — حل مراحل باش تربح مساعدات جديدة',
      wrong: 'جواب غالط، عاود', good: 'برافو!', stageDone: 'كملتي المرحلة', next: 'المرحلة الموالية', toGroup: 'لائحة المراحل', earned: 'ربحتي',
      board: 'ترتيب المشتركين', noBoard: 'الترتيب كيبان غير للمشتركين فتطبيق الوسيط 777.', empty: 'حتى واحد ما لعب مازال — كون الأول!', me: 'أنت',
      share: 'شارك اللعبة', shareTxt: 'جرب «وصلة العقار» — لعبة الأسئلة العقارية ديال مكتب الوسيط 777 🧩🏠', saved: 'تسجلات النقط فالترتيب ✓',
      credits: 'حقوق الصور', pick: 'ختار سؤال من الشبكة', picQ: 'سؤال بالصورة', how: 'كيفاش تلعب؟',
      howTxt: 'ختار خانات كلمة فالشبكة باش يبان السؤال (بالصورة أحياناً)، ومن بعد ركّب الجواب بالحروف المقترحة. الحروف المشتركة مع كلمات محلولة كتبان بالأصفر. «حذف حرف» كيحيد حرف زايد، و«كشف حرف» كيعطيك حرف من الجواب. حل المرحلة بلا مساعدات = 3 نجوم.',
      allDone: 'سالييتي جميع المراحل! 🏆', puzzle: 'لغز رقم', ask: 'إسأل منير', askT: 'منير — مساعد اللعبة', askPh: 'سول منير على أي حاجة فالعقار…', chips: ['شنو الجواب؟', 'شرح ليا هاد الكلمة', 'عطيني مثال من المغرب'], thinking: 'منير كيفكر…', aiErr: 'وقع مشكل فالاتصال، عاود من بعد شوية.', aiQuota: 'وصلتي للحد ديال الأسئلة اليوم، رجع غدا إن شاء الله.', send: 'صيفط', aiHi: 'مرحبا! أنا منير 🤖 سولني على هاد السؤال ولا على أي كلمة عقارية بغيتي تفهمها.', whatIs: 'ما هذا؟', info: 'معلومات عقارية', helpsInfo: 'كتربح مساعدة مع كل لغز كتحلو، وزوج إلا حليتيه بلا مساعدات ⭐⭐⭐',
    },
    fr: {
      title: 'Wasla Immo', play: 'Jouer', groups: 'Groupes', stage: 'Étape', helps: 'Aides', stars: 'étoiles', pts: 'points',
      settings: 'Réglages', lang: 'Langue', close: 'Fermer', back: 'Retour', remove: 'Retirer une lettre', reveal: 'Révéler une lettre', clear: 'Effacer',
      locked: 'Terminez le groupe précédent pour le débloquer', lockedStage: 'Résolvez d’abord l’étape précédente', noHelps: 'Plus d’aides — résolvez des étapes pour en gagner',
      wrong: 'Mauvaise réponse, réessayez', good: 'Bravo !', stageDone: 'Étape terminée', next: 'Étape suivante', toGroup: 'Liste des étapes', earned: 'Gagné',
      board: 'Classement des membres', noBoard: 'Le classement est réservé aux membres d’Al Wasset 777.', empty: 'Personne n’a encore joué — soyez le premier !', me: 'Vous',
      share: 'Partager le jeu', shareTxt: 'Essayez « Wasla Immo », le jeu de questions immobilières d’Al Wasset 777 🧩🏠', saved: 'Points enregistrés au classement ✓',
      credits: 'Crédits photos', pick: 'Choisissez une question dans la grille', picQ: 'Question en image', how: 'Comment jouer ?',
      howTxt: 'Touchez un mot dans la grille pour voir sa question (parfois en image), puis composez la réponse avec les lettres proposées. Les lettres partagées avec des mots déjà trouvés apparaissent en jaune. « Retirer une lettre » enlève une lettre inutile, « Révéler une lettre » en donne une. Sans aide = 3 étoiles.',
      allDone: 'Vous avez terminé toutes les étapes ! 🏆', puzzle: 'Énigme n°', ask: 'Demander à Mounir', askT: 'Mounir — l’assistant du jeu', askPh: 'Posez votre question sur l’immobilier…', chips: ['Quelle est la réponse ?', 'Explique-moi ce mot', 'Un exemple au Maroc'], thinking: 'Mounir réfléchit…', aiErr: 'Problème de connexion, réessayez dans un instant.', aiQuota: 'Limite de questions atteinte pour aujourd’hui, revenez demain.', send: 'Envoyer', aiHi: 'Bonjour ! Je suis Mounir 🤖 Posez-moi une question sur cette énigme ou sur n’importe quel mot de l’immobilier.', whatIs: 'Qu’est-ce que c’est ?', info: 'Culture immobilière', helpsInfo: 'Chaque énigme résolue rapporte 1 aide, 2 si vous la résolvez sans aide ⭐⭐⭐',
    },
    en: {
      title: 'Real-Estate Wasla', play: 'Play', groups: 'Groups', stage: 'Stage', helps: 'Helps', stars: 'stars', pts: 'points',
      settings: 'Settings', lang: 'Language', close: 'Close', back: 'Back', remove: 'Remove a letter', reveal: 'Reveal a letter', clear: 'Clear',
      locked: 'Finish the previous group to unlock it', lockedStage: 'Solve the previous stage first', noHelps: 'No helps left — solve stages to earn more',
      wrong: 'Wrong answer, try again', good: 'Well done!', stageDone: 'Stage complete', next: 'Next stage', toGroup: 'Stage list', earned: 'Earned',
      board: 'Members ranking', noBoard: 'The ranking is for Al Wasset 777 members.', empty: 'Nobody has played yet — be the first!', me: 'You',
      share: 'Share the game', shareTxt: 'Try “Real-Estate Wasla”, the property quiz game by Al Wasset 777 🧩🏠', saved: 'Points saved to the ranking ✓',
      credits: 'Photo credits', pick: 'Pick a question in the grid', picQ: 'Picture question', how: 'How to play?',
      howTxt: 'Tap a word in the grid to see its question (sometimes a picture), then build the answer with the suggested letters. Letters shared with solved words show in yellow. “Remove a letter” takes out a wrong letter, “Reveal a letter” gives you one. No help = 3 stars.',
      allDone: 'You finished every stage! 🏆', puzzle: 'Puzzle', ask: 'Ask Mounir', askT: 'Mounir — game assistant', askPh: 'Ask anything about real estate…', chips: ['What is the answer?', 'Explain this word', 'An example in Morocco'], thinking: 'Mounir is thinking…', aiErr: 'Connection problem, please try again shortly.', aiQuota: 'Daily question limit reached, come back tomorrow.', send: 'Send', aiHi: 'Hi! I’m Mounir 🤖 Ask me about this puzzle or any real-estate word you want to understand.', whatIs: 'What is this?', info: 'Real-estate knowledge', helpsInfo: 'Each solved puzzle gives 1 help, 2 if solved with no help ⭐⭐⭐',
    },
  };
  const LANG_NAMES = { ar: 'العربية', en: 'English', fr: 'Français' };
  const GROUPS = {
    house: ['🏠', 'أجزاء المنزل', 'La maison', 'The house'], types: ['🏘️', 'أنواع العقارات', 'Types de biens', 'Property types'],
    sale: ['🤝', 'البيع والشراء', 'Vente & achat', 'Buying & selling'], rent: ['🔑', 'الكراء', 'Location', 'Renting'],
    build: ['🏗️', 'البناء والأشغال', 'Construction', 'Construction'], deco: ['🛋️', 'الديكور والتجهيز', 'Déco & équipement', 'Decor & fittings'],
    city: ['🏙️', 'المدينة والحي', 'Ville & quartier', 'City & neighbourhood'], meknes: ['🕌', 'مكناس والمغرب', 'Meknès & Maroc', 'Meknes & Morocco'],
    money: ['💰', 'المال والتمويل', 'Argent & financement', 'Money & finance'], law: ['⚖️', 'القانون والتوثيق', 'Droit & actes', 'Law & deeds'],
    jobs: ['👔', 'مهن العقار', 'Métiers de l’immobilier', 'Real-estate jobs'], mix: ['🎲', 'منوعات', 'Divers', 'Mixed'],
  };
  const gName = (g, lang) => (GROUPS[g] || ['🎲', g, g, g])[lang === 'ar' ? 1 : lang === 'fr' ? 2 : 3];
  const ALPHA = {
    ar: 'اااللليييووومممنننررربببتتتعععهههددسسقكفحجطصشزخذضظغثة',
    fr: 'EEEEEAAAIIISSSNNNRRRTTTOOOULLDDCCMMPPGBVHFQJXYZK',
    en: 'EEEEETTTAAAOOIIINNNSSSRRRHHLLDDCCUUMMFPGWYBVKXJQZ',
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // مولد أرقام عشوائية ثابت (نفس الحروف لنفس السؤال)
  function rng(seed) { let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }

  const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } };
  const store = s => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { /* */ } };

  function css() {
    if (document.getElementById('wl-css')) return;
    const st = document.createElement('style');
    st.id = 'wl-css';
    st.textContent = `
.wl,.wl-mod{--r:#c8102e;--k:#111;--w:#fff;--y:#ffd54a}
.wl{max-width:980px;margin:0 auto;font-family:inherit;color:var(--k)}
.wl *{box-sizing:border-box}
.wl-top{display:flex;align-items:center;gap:10px;background:var(--k);color:#fff;border-radius:18px;padding:10px 12px;border-bottom:4px solid var(--r)}
.wl-top img.lg{width:52px;height:52px;border-radius:50%;background:#fff;border:2px solid var(--r);object-fit:cover}
.wl-top h2{margin:0;font-size:19px;flex:1;line-height:1.2;min-width:0}.wl-top h2 small{display:block;font-size:12px;opacity:.75;font-weight:600}
.wl-chip{background:#fff;color:var(--k);border-radius:999px;padding:5px 10px;font-weight:800;font-size:13px;white-space:nowrap}
.wl-ib{background:var(--r);color:#fff;border:0;border-radius:12px;min-width:40px;height:40px;font-size:18px;cursor:pointer;font-weight:800;padding:0 10px}
.wl-ib.w{background:#fff;color:var(--k)}
.wl-groups{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:14px}
.wl-g{position:relative;border:0;border-radius:18px;overflow:hidden;min-height:132px;background:#222 center/cover;color:#fff;text-align:start;cursor:pointer;padding:0;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.wl-g .ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.82))}
.wl-g .in{position:absolute;inset:auto 0 0 0;padding:10px 12px}
.wl-g b{display:block;font-size:17px}.wl-g .em{position:absolute;top:8px;inset-inline-start:10px;font-size:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.wl-bar{height:7px;background:rgba(255,255,255,.3);border-radius:9px;margin-top:6px;overflow:hidden}.wl-bar i{display:block;height:100%;background:var(--r)}
.wl-g .meta{font-size:12px;opacity:.9;margin-top:3px}
.wl-g.wl-lock{filter:grayscale(1);opacity:.7}.wl-g.wl-lock::after{content:'🔒';position:absolute;top:8px;inset-inline-end:10px;font-size:22px}
.wl-stages{display:flex;flex-wrap:wrap;gap:14px;margin-top:16px;justify-content:center}
.wl-s{width:78px;height:78px;flex:0 0 78px;padding:0;border-radius:50%;border:3px solid var(--k);background:#fff;font-size:24px;font-weight:900;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--k)}
.wl-s small{font-size:12px;letter-spacing:1px;color:#e0a800}.wl-s.done{background:var(--k);color:#fff}.wl-s.cur{background:var(--r);color:#fff;border-color:var(--r);box-shadow:0 0 0 4px rgba(200,16,46,.25)}
.wl-s.wl-lock{opacity:.45;cursor:not-allowed}
.wl-play{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}
@media(min-width:860px){.wl-play{grid-template-columns:1.1fr 1fr;align-items:start}}
.wl-board{background:var(--k);border-radius:16px;padding:10px;display:flex;justify-content:center;overflow:auto}
.wl-grid{display:grid;gap:3px}
.wl-c{border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;position:relative;user-select:none}
.wl-c.on{background:#fff;color:var(--k);cursor:pointer}.wl-c.ok{background:#e8f5e9;color:#0a7a2f}
.wl-c.sel{background:var(--y)!important;color:var(--k)}.wl-c.sel.ok{background:#ffe680!important}
.wl-c .pic{position:absolute;top:0;inset-inline-start:1px;font-size:9px;line-height:1}
.wl-q{background:#fff;border:2px solid var(--k);border-radius:18px;padding:12px;box-shadow:0 6px 18px rgba(0,0,0,.08)}
.wl-qimg{width:100%;max-height:230px;object-fit:cover;border-radius:14px;display:block;background:#eee;cursor:zoom-in}
.wl-cred{font-size:10px;color:#777;margin:3px 2px 0;direction:ltr;text-align:left;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.wl-qt{font-size:18px;font-weight:800;margin:10px 2px;line-height:1.5}
.wl-qt .tag{display:inline-block;background:var(--r);color:#fff;border-radius:8px;font-size:12px;padding:2px 8px;margin-inline-end:6px;vertical-align:middle}
.wl-slots{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:10px 0}
.wl-slot{width:40px;height:46px;border-radius:9px;border:2px solid var(--k);background:#fff;font-size:22px;font-weight:900;display:flex;align-items:center;justify-content:center;cursor:pointer}
.wl-slot.lk{background:var(--y);cursor:default}.wl-slot.rv{background:#ffe0e5;border-color:var(--r);cursor:default}
.wl-slot.ok{background:#0a7a2f;color:#fff;border-color:#0a7a2f}
.wl-bank{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:6px;margin-top:6px}
.wl-t{height:48px;border-radius:12px;border:0;background:var(--k);color:#fff;font-size:22px;font-weight:900;cursor:pointer;box-shadow:0 3px 0 var(--r)}
.wl-t:active{transform:translateY(2px);box-shadow:none}.wl-t.used,.wl-t.gone{visibility:hidden}
.wl-acts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.wl-acts button{flex:1 1 30%;min-height:44px;border-radius:12px;border:2px solid var(--k);background:#fff;font-weight:800;cursor:pointer;font-size:14px}
.wl-acts .h{background:var(--r);color:#fff;border-color:var(--r)}
.wl-shake{animation:wl-sh .4s}@keyframes wl-sh{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
.wl-msg{min-height:22px;text-align:center;font-weight:800;margin-top:8px}.wl-msg.bad{color:var(--r)}.wl-msg.okm{color:#0a7a2f}
.wl-panel{background:#fff;border-radius:16px;padding:12px;margin-top:14px;border:2px solid #eee}
.wl-panel h3{margin:0 0 8px;font-size:16px}.wl-rank{display:flex;gap:8px;padding:6px 4px;border-bottom:1px solid #eee}.wl-rank.me{background:#fff3f5;font-weight:800}
.wl-rank b{width:30px}.wl-rank span{flex:1}
.wl-mod{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
.wl-mod>div{background:#fff;border-radius:20px;max-width:440px;width:100%;padding:18px;max-height:88vh;overflow:auto;border-top:6px solid var(--r);text-align:center}
.wl-mod h3{margin:0 0 10px}.wl-big{font-size:44px;letter-spacing:4px;color:#e0a800}.wl-mod img.full{max-width:100%;border-radius:12px}
.wl-mod .row{display:flex;gap:8px;margin-top:12px}.wl-mod .row button{flex:1}
.wl-lng{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.wl-lng button{padding:10px 14px;border-radius:12px;border:2px solid var(--k);background:#fff;font-weight:800;cursor:pointer}
.wl-lng button.on{background:var(--r);border-color:var(--r);color:#fff}
.wl-btn{padding:11px 14px;border-radius:12px;border:0;background:var(--r);color:#fff;font-weight:800;cursor:pointer;font-size:15px}.wl-btn.k{background:var(--k)}.wl-btn.w{background:#fff;color:var(--k);border:2px solid var(--k)}
.wl-pl{max-width:640px}
.wl-pbar{display:flex;align-items:center;gap:8px;background:var(--k);color:#fff;border-radius:16px;padding:8px;border-bottom:4px solid var(--r)}
.wl-pbar b{flex:1;text-align:center;font-size:17px;line-height:1.2}.wl-pbar b small{display:block;font-size:11px;opacity:.7;font-weight:600}
.wl-pb{background:#fff;color:var(--k);border:0;border-radius:12px;padding:8px 12px;font-weight:800;cursor:pointer;white-space:nowrap;font-size:14px}
.wl-pb.hp{background:var(--r);color:#fff}.wl-pb.hp i{font-style:normal;margin-inline-start:2px}
.wl-pl .wl-board{margin-top:12px;background:repeating-linear-gradient(45deg,#f7f7f7 0 14px,#efefef 14px 28px);border:2px solid #e3e3e3;border-radius:18px;padding:14px 8px;min-height:300px;align-items:center}
.wl-pl .wl-grid{gap:4px}
.wl-pl .wl-c{background:var(--k);border-radius:5px;cursor:pointer;color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.25)}
.wl-pl .wl-c.ok{background:#fff;color:var(--k);border:2px solid var(--k)}.wl-pl .wl-c.rv{background:var(--y);color:var(--k)}
.wl-pl .wl-c.sel{background:var(--r)!important;color:#fff}.wl-pl .wl-c.fl{animation:wl-fl 1.1s}
@keyframes wl-fl{0%,60%{background:#2ecc71;color:#fff;transform:scale(1.1)}}
.wl-pl .wl-c .pic{font-size:9px;top:1px}
.wl-hint{text-align:center;font-weight:800;margin-top:10px;color:#444}
.wl-card{margin:14px auto 0;max-width:420px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,.18);border:2px solid var(--k)}
.wl-card-h{background:var(--k);color:#fff;text-align:center;font-weight:800;padding:8px;font-size:15px;border-bottom:3px solid var(--r)}
.wl-card-img{position:relative;background:#eee}.wl-card-img img{display:block;width:100%;height:230px;object-fit:cover;cursor:zoom-in}
.wl-card-img .wl-cred{position:absolute;bottom:0;left:0;right:0;margin:0;padding:2px 6px;background:rgba(0,0,0,.45);color:#fff;font-size:10px;direction:ltr}
.wl-card-q{padding:10px 12px;font-weight:800;font-size:17px;text-align:center;line-height:1.5}
.wl-card-t{background:var(--r);color:#fff;min-height:170px;display:flex;align-items:center;justify-content:center;text-align:center;padding:18px;font-size:21px;font-weight:800;line-height:1.6}
.wl-card-f{display:flex;border-top:2px solid var(--k)}.wl-card-f button{flex:1;border:0;background:#fff;padding:11px 6px;font-weight:800;cursor:pointer;font-size:14px;color:var(--k)}
.wl-card-f button+button{border-inline-start:2px solid var(--k)}.wl-card-f button:active{background:#ffe9ec}
.wl-pl .wl-slots{margin:16px 0 4px}.wl-pl .wl-slot{background:var(--k);color:#fff;border:0;border-radius:8px;width:44px;height:46px}
.wl-pl .wl-slot.in{background:#fff;color:var(--k);border:3px solid var(--k)}.wl-pl .wl-slot.lk,.wl-pl .wl-slot.rv{background:var(--y);color:var(--k)}
.wl-pl .wl-slot.ok{background:#0a7a2f}
.wl-pl .wl-bank{max-width:520px;margin:6px auto 0;gap:6px}.wl-pl .wl-t{background:var(--r);box-shadow:0 3px 0 #7a0a1c;height:46px;border-radius:9px}
@media(max-width:520px){.wl-pl .wl-slot{width:36px;height:42px}.wl-pl .wl-t{height:42px;font-size:19px;padding:0}.wl-card-img img{height:200px}.wl-pb{padding:7px 9px;font-size:13px}.wl-card-t{font-size:19px;min-height:150px}}
.wl-ask{margin-top:12px;background:var(--k);color:#fff;border:0;border-radius:999px;padding:5px 18px;padding-inline-start:6px;font-weight:800;cursor:pointer;font-size:15px;box-shadow:0 3px 0 var(--r);display:inline-flex;align-items:center;gap:8px}
.wl-ask img{width:38px;height:38px;border-radius:50%;border:2px solid var(--r);object-fit:cover;background:#fff}
.wl-ai-h{margin:0 0 8px;display:flex;align-items:center;gap:10px}.wl-ai-h img{width:58px;height:58px;border-radius:50%;border:3px solid var(--r);object-fit:cover}
.wl-ai-log .bw{display:flex;gap:6px;align-items:flex-end;align-self:flex-start;max-width:92%}.wl-ai-log .bw img{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:0 0 30px;border:2px solid var(--r)}.wl-ai-log .bw .b{max-width:none}
.wl-mod>div.wl-ai{max-width:520px;text-align:start}.wl-ai-q{background:#f4f4f4;border-radius:10px;padding:8px 10px;font-weight:700;font-size:14px}
.wl-ai-log{height:min(46vh,340px);overflow:auto;display:flex;flex-direction:column;gap:8px;margin:10px 0;padding:4px}
.wl-ai-log .u,.wl-ai-log .b{max-width:86%;padding:9px 12px;border-radius:14px;line-height:1.6;white-space:pre-wrap;font-size:15px}
.wl-ai-log .b{background:#111;color:#fff;align-self:flex-start;border-end-start-radius:4px}.wl-ai-log .u{background:#ffe9ec;color:#111;align-self:flex-end;border-end-end-radius:4px}
.wl-ai-log .dots{opacity:.7}.wl-ai-chips{display:flex;gap:6px;flex-wrap:wrap}.wl-ai-chips button{border:2px solid var(--r);background:#fff;color:var(--r);border-radius:999px;padding:6px 10px;font-weight:800;cursor:pointer;font-size:13px}
.wl-ai-f{display:flex;gap:6px;margin-top:8px}.wl-ai-f input{flex:1;min-width:0;border:2px solid #111;border-radius:12px;padding:10px;font:inherit}
.wl-credits{text-align:start;font-size:12px;direction:ltr}.wl-credits div{padding:4px 0;border-bottom:1px solid #eee}
.wl-sub{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}
@media(max-width:520px){.wl-top{gap:6px;padding:8px}.wl-top img.lg{width:42px;height:42px}.wl-chip{padding:4px 7px;font-size:12px}.wl-ib{min-width:36px;height:36px;padding:0 6px}.wl-slot{width:34px;height:42px;font-size:19px}.wl-t{height:44px;font-size:19px}.wl-top h2{font-size:16px}.wl-g{min-height:118px}}
`;
    document.head.appendChild(st);
  }

  function mount(root, host) {
    host = host || {};
    css();
    const DATA = window.W777_WL || {};
    let S = load();
    S.lang = S.lang && DATA[S.lang] ? S.lang : 'ar';
    if (S.helps == null) S.helps = START_HELPS;
    S.prog = S.prog || {};
    S.pts = S.pts || 0;
    let view = { name: 'home' };
    let play = null; // { gi, si, sel, cur:{slots, used}, msg }
    const L = () => T[S.lang];
    const lang = () => S.lang;
    const groups = () => DATA[S.lang] || [];
    const prog = () => (S.prog[S.lang] = S.prog[S.lang] || {});
    const key = (gi, si) => gi + '-' + si;
    const save = () => store(S);
    const dir = () => (S.lang === 'ar' ? 'rtl' : 'ltr');

    const stageDone = (gi, si) => !!(prog()[key(gi, si)] || {}).done;
    const groupDone = gi => groups()[gi].s.every((_, si) => stageDone(gi, si));
    const groupOpen = gi => gi === 0 || groupDone(gi - 1);
    const stageOpen = (gi, si) => groupOpen(gi) && (si === 0 || stageDone(gi, si - 1));
    const totalStars = () => Object.values(prog()).reduce((a, p) => a + (p.stars || 0), 0);

    function modal(html, onReady) {
      const m = document.createElement('div');
      m.className = 'wl-mod';
      m.dir = dir();
      m.innerHTML = `<div>${html}</div>`;
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
      document.body.appendChild(m);
      if (onReady) onReady(m);
      return m;
    }
    function top(sub, backBtn) {
      return `<div class="wl-top">${backBtn ? `<button class="wl-ib w" data-back aria-label="${esc(L().back)}">${S.lang === 'ar' ? '➜' : '←'}</button>` : ''}
        <img class="lg" src="${esc(host.logo || 'icons/hub/games.webp?v=1')}" alt="">
        <h2>${esc(L().title)}<small>${esc(sub || '')}</small></h2>
        <span class="wl-chip" title="${esc(L().stars)}">⭐ ${totalStars()}</span>
        <span class="wl-chip" title="${esc(L().helps)}">💡 ${S.helps}</span>
        <button class="wl-ib" data-set aria-label="${esc(L().settings)}">⚙️</button></div>`;
    }
    function bindTop() {
      const b = root.querySelector('[data-back]');
      if (b) b.onclick = () => { if (view.name === 'play') view = { name: 'group', gi: view.gi }; else view = { name: 'home' }; render(); };
      root.querySelector('[data-set]').onclick = settings;
    }

    function settings() {
      modal(`<h3>⚙️ ${esc(L().settings)}</h3><p style="margin:4px 0 8px;font-weight:800">${esc(L().lang)}</p>
        <div class="wl-lng">${Object.keys(T).filter(k => DATA[k]).map(k => `<button data-l="${k}" class="${k === S.lang ? 'on' : ''}">${LANG_NAMES[k]}</button>`).join('')}</div>
        <div class="row"><button class="wl-btn w" data-how>❓ ${esc(L().how)}</button><button class="wl-btn w" data-cr>📷 ${esc(L().credits)}</button></div>
        <div class="row"><button class="wl-btn k" data-x>${esc(L().close)}</button></div>`, m => {
        m.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { S.lang = b.dataset.l; save(); m.remove(); view = { name: 'home' }; play = null; render(); });
        m.querySelector('[data-how]').onclick = () => { m.remove(); howTo(); };
        m.querySelector('[data-cr]').onclick = () => { m.remove(); credits(); };
      });
    }
    const howTo = () => modal(`<h3>❓ ${esc(L().how)}</h3><p style="text-align:start;line-height:1.8">${esc(L().howTxt)}</p><div class="row"><button class="wl-btn" data-x>${esc(L().play)}</button></div>`);
    function credits() {
      const C = DATA.credits || {};
      modal(`<h3>📷 ${esc(L().credits)}</h3><div class="wl-credits">${Object.keys(C).sort().map(k => { const c = C[k]; return `<div><b>${esc(k)}</b> — ${esc(c.by || '?')} · ${esc(c.lic || '')}${c.page ? ` · <a href="${esc(c.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>` : ''}</div>`; }).join('') || '—'}</div><div class="row"><button class="wl-btn k" data-x>${esc(L().close)}</button></div>`);
    }

    /* ---------- الرئيسية: المجموعات ---------- */
    function cover(g) {
      for (const st of g.s) for (const w of st.w) if (w[2]) return w[2];
      return '';
    }
    function home() {
      const gs = groups();
      root.innerHTML = `<div class="wl" dir="${dir()}">${top(L().groups)}
        <div class="wl-groups">${gs.map((g, gi) => {
          const n = g.s.length, d = g.s.filter((_, si) => stageDone(gi, si)).length, img = cover(g);
          return `<button class="wl-g ${groupOpen(gi) ? '' : 'wl-lock'}" data-g="${gi}" style="${img ? `background-image:url('${IMG}${esc(img)}.webp')` : ''}">
            <span class="ov"></span><span class="em">${(GROUPS[g.g] || ['🎲'])[0]}</span>
            <span class="in"><b>${esc(gName(g.g, S.lang))}</b><span class="meta">${d}/${n} · ⭐ ${g.s.reduce((a, _, si) => a + ((prog()[key(gi, si)] || {}).stars || 0), 0)}/${n * 3}</span>
            <span class="wl-bar"><i style="width:${Math.round(d / n * 100)}%"></i></span></span></button>`;
        }).join('')}</div>
        ${gs.length && gs.every((_, gi) => groupDone(gi)) ? `<div class="wl-panel" style="text-align:center;font-weight:900">${esc(L().allDone)}</div>` : ''}
        <div class="wl-sub"><button class="wl-btn w" data-how>❓ ${esc(L().how)}</button>${host.shareUrl ? `<button class="wl-btn k" data-share>📤 ${esc(L().share)}</button>` : ''}
          <span class="wl-chip" style="border:2px solid #111">🏅 ${S.pts} ${esc(L().pts)}</span></div>
        <div class="wl-panel" id="wl-board"><h3>🏆 ${esc(L().board)}</h3><div class="muted">${host.loadBoard ? '…' : esc(L().noBoard)}</div></div></div>`;
      bindTop();
      root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
        const gi = +b.dataset.g;
        if (!groupOpen(gi)) return toast(L().locked);
        view = { name: 'group', gi }; render();
      });
      root.querySelector('[data-how]').onclick = howTo;
      const sh = root.querySelector('[data-share]');
      if (sh) sh.onclick = share;
      if (!S.seenHow) { S.seenHow = 1; save(); howTo(); }
      board();
    }
    async function board() {
      const el = root.querySelector('#wl-board > div');
      if (!el || !host.loadBoard) return;
      try {
        const rows = await host.loadBoard();
        if (!Array.isArray(rows)) throw new Error('x');
        el.className = '';
        el.innerHTML = rows.length ? rows.map(r => `<div class="wl-rank ${r.me ? 'me' : ''}"><b>${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : '#' + esc(r.rank)}</b><span>${esc(r.name)}${r.me ? ` (${esc(L().me)})` : ''}</span><strong>${esc(r.points)}</strong></div>`).join('') : esc(L().empty);
      } catch (e) { el.textContent = '—'; }
    }
    function share() {
      const url = host.shareUrl, txt = L().shareTxt;
      if (navigator.share) navigator.share({ title: L().title, text: txt, url }).catch(() => {});
      else window.open('https://wa.me/?text=' + encodeURIComponent(txt + '\n' + url), '_blank', 'noopener');
    }

    /* ---------- المراحل ---------- */
    function group() {
      const gi = view.gi, g = groups()[gi];
      const cur = g.s.findIndex((_, si) => !stageDone(gi, si));
      root.innerHTML = `<div class="wl" dir="${dir()}">${top(gName(g.g, S.lang), true)}
        <div class="wl-stages">${g.s.map((_, si) => {
          const p = prog()[key(gi, si)] || {}, open = stageOpen(gi, si);
          return `<button class="wl-s ${p.done ? 'done' : ''} ${si === cur ? 'cur' : ''} ${open ? '' : 'wl-lock'}" data-s="${si}">${si + 1}<small>${p.done ? '★'.repeat(p.stars || 1) + '☆'.repeat(3 - (p.stars || 1)) : open ? '' : '🔒'}</small></button>`;
        }).join('')}</div></div>`;
      bindTop();
      root.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
        const si = +b.dataset.s;
        if (!stageOpen(gi, si)) return toast(L().lockedStage);
        startStage(gi, si);
      });
    }

    /* ---------- اللعب ---------- */
    function stateOf(gi, si) {
      const k = key(gi, si), p = prog();
      p[k] = p[k] || {};
      const st = p[k];
      st.sol = st.sol || {};   // idx -> 1
      st.rev = st.rev || {};   // idx -> [positions]
      st.rm = st.rm || {};     // idx -> [bank positions]
      st.used = st.used || 0;  // مساعدات مستعملة
      return st;
    }
    function startStage(gi, si) {
      view = { name: 'play', gi, si };
      const st = stateOf(gi, si);
      play = { gi, si, sel: -1, open: false };
      const stage = groups()[gi].s[si];
      const first = stage.w.findIndex((_, i) => !st.sol[i]);
      if (first >= 0 && !st.done) select(first, true);
      render();
    }
    const stageObj = () => groups()[play.gi].s[play.si];
    const cells = w => Array.from(w[6]).map((ch, i) => [w[5] === 'a' ? w[3] : w[3] + i, w[5] === 'a' ? w[4] + i : w[4], ch]);
    function known() {
      const st = stateOf(play.gi, play.si), m = new Map();
      stageObj().w.forEach((w, i) => {
        const rv = st.rev[i] || [];
        cells(w).forEach(([r, c, ch], p) => { if (st.sol[i]) m.set(r + ',' + c, { ch, ok: 1 }); else if (rv.includes(p) && !m.has(r + ',' + c)) m.set(r + ',' + c, { ch, rv: 1 }); });
      });
      return m;
    }
    function bankOf(i) {
      const w = stageObj().w[i], word = Array.from(w[6]);
      const n = word.length, size = n <= 10 ? 14 : n <= 12 ? 16 : 18;
      const r = rng(S.lang + key(play.gi, play.si) + ':' + i + w[6]);
      const pool = Array.from(ALPHA[S.lang]);
      const out = word.slice();
      while (out.length < size) out.push(pool[Math.floor(r() * pool.length)]);
      for (let k = out.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [out[k], out[j]] = [out[j], out[k]]; }
      return out;
    }
    function select(i, silent) {
      const st = stateOf(play.gi, play.si), w = stageObj().w[i];
      play.sel = i; play.msg = ''; play.open = !silent;
      const kn = known(), cs = cells(w);
      const bank = bankOf(i), used = new Array(bank.length).fill(false);
      (st.rm[i] || []).forEach(b => { used[b] = 'gone'; });
      const slots = cs.map(([r, c, ch], p) => {
        const k = kn.get(r + ',' + c);
        if (st.sol[i]) return { ch, lock: 'ok' };
        if (k) {
          const b = bank.findIndex((x, bi) => x === ch && !used[bi]);
          if (b >= 0) used[b] = true;
          return { ch, lock: k.rv && (st.rev[i] || []).includes(p) ? 'rv' : 'lk', b };
        }
        return null;
      });
      play.bank = bank; play.used = used; play.slots = slots;
      if (!silent) render();
    }
    function tap(bi) {
      if (play.used[bi]) return;
      const p = play.slots.findIndex(s => !s);
      if (p < 0) return;
      play.used[bi] = true;
      play.slots[p] = { ch: play.bank[bi], b: bi };
      if (play.slots.every(Boolean)) return check();
      render();
    }
    function untap(p) {
      const s = play.slots[p];
      if (!s || s.lock) return;
      play.used[s.b] = false;
      play.slots[p] = null;
      render();
    }
    function check() {
      const st = stateOf(play.gi, play.si), w = stageObj().w[play.sel];
      const guess = play.slots.map(s => s.ch).join('');
      if (guess === w[6]) {
        st.sol[play.sel] = 1;
        save();
        play.msg = '✓ ' + L().good;
        play.msgCls = 'okm';
        const stg = stageObj();
        if (stg.w.every((_, i) => st.sol[i])) { play.open = false; play.flash = play.sel; render(); return finishStage(); }
        // السؤال الموالي اللي باقي
        const nxt = stg.w.findIndex((_, i) => i > play.sel && !st.sol[i]);
        const pick = nxt >= 0 ? nxt : stg.w.findIndex((_, i) => !st.sol[i]);
        const msg = play.msg, done = play.sel;
        select(pick, true);
        play.msg = msg; play.msgCls = 'okm'; play.flash = done;
        render();
        return;
      }
      play.msg = L().wrong; play.msgCls = 'bad';
      play.slots = play.slots.map(s => (s && s.lock ? s : null));
      play.used = play.used.map((u, bi) => (u === 'gone' ? u : play.slots.some(s => s && s.b === bi)));
      render();
      const sl = root.querySelector('.wl-slots');
      if (sl) { sl.classList.add('wl-shake'); }
      if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) { /* */ }
    }
    function useHelp(kind) {
      const st = stateOf(play.gi, play.si), i = play.sel;
      if (i < 0 || st.sol[i]) return;
      if (S.helps <= 0) return toast(L().noHelps);
      const w = stageObj().w[i], word = Array.from(w[6]);
      if (kind === 'rm') {
        // حرف زايد ماشي من الجواب
        const need = {};
        word.forEach(ch => { need[ch] = (need[ch] || 0) + 1; });
        const cnt = {};
        const extra = [];
        play.bank.forEach((ch, bi) => { cnt[ch] = (cnt[ch] || 0) + 1; if (cnt[ch] > (need[ch] || 0) && play.used[bi] !== 'gone') extra.push(bi); });
        const cand = extra.filter(bi => !play.used[bi]);
        if (!cand.length) return;
        const bi = cand[0];
        st.rm[i] = (st.rm[i] || []).concat(bi);
        play.used[bi] = 'gone';
      } else {
        const p = play.slots.findIndex(s => !s || !s.lock);
        if (p < 0) return;
        if (play.slots[p]) { play.used[play.slots[p].b] = false; }
        st.rev[i] = (st.rev[i] || []).concat(p);
        const b = play.bank.findIndex((x, bi) => x === word[p] && !play.used[bi]);
        if (b >= 0) play.used[b] = true;
        play.slots[p] = { ch: word[p], lock: 'rv', b };
        // إلا كان الحرف مستعمل فخانة أخرى غالطة، نحيدوها
        if (b < 0) {
          const q = play.slots.findIndex((s, k) => s && !s.lock && k !== p && s.ch === word[p]);
          if (q >= 0) { play.slots[q] = null; }
        }
      }
      S.helps--; st.used++;
      save();
      if (play.slots.every(Boolean)) return check();
      render();
    }
    function finishStage() {
      const st = stateOf(play.gi, play.si), stg = stageObj();
      const stars = st.used === 0 ? 3 : st.used <= 2 ? 2 : 1;
      const first = !st.done;
      const prevStars = st.stars || 0;
      st.done = true;
      st.stars = Math.max(prevStars, stars);
      let pts = 0, bonus = 0;
      if (first) {
        pts = Math.min(300, stg.w.length * 10 + stars * 10);
        bonus = 1 + (stars === 3 ? 1 : 0);
        S.helps += bonus;
        S.pts += pts;
        S.pend = (S.pend || 0) + pts;
        S.pendN = (S.pendN || 0) + 1;
      }
      save();
      flush();
      const g = groups()[play.gi];
      const hasNext = play.si + 1 < g.s.length || play.gi + 1 < groups().length;
      modal(`<h3>🎉 ${esc(L().stageDone)} — ${esc(L().puzzle)} ${play.si + 1}</h3>
        <div class="wl-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        ${first ? `<p style="font-weight:800">${esc(L().earned)}: +${pts} ${esc(L().pts)} · +${bonus} 💡</p>` : ''}
        <div class="row"><button class="wl-btn w" data-gl>${esc(L().toGroup)}</button>${hasNext ? `<button class="wl-btn" data-nx>${esc(L().next)} ➜</button>` : ''}</div>`, m => {
        m.querySelector('[data-gl]').onclick = () => { m.remove(); view = { name: 'group', gi: play.gi }; render(); };
        const nx = m.querySelector('[data-nx]');
        if (nx) nx.onclick = () => {
          m.remove();
          if (play.si + 1 < g.s.length) startStage(play.gi, play.si + 1);
          else startStage(play.gi + 1, 0);
        };
      });
    }
    // النقط كتتصيفط للترتيب بلا ما نفوتو حد السيرفر (45 ثانية بين كل إرسال)
    let flushT = null;
    async function flush() {
      if (!host.onFinish || !S.pend) return;
      const wait = 47000 - (Date.now() - (S.lastSub || 0));
      if (wait > 0) { clearTimeout(flushT); flushT = setTimeout(flush, wait); return; }
      const p = Math.min(300, S.pend), n = S.pendN || 1;
      try {
        S.lastSub = Date.now(); save();
        const r = await host.onFinish({ points: p, words: n });
        if (r && (r.code || r.message) && !r.points) throw new Error(r.message || 'x');
        S.pend -= p; S.pendN = 0; save();
        toast(L().saved);
        if (S.pend > 0) { flushT = setTimeout(flush, 47000); }
      } catch (e) { flushT = setTimeout(flush, 60000); }
    }

    function playView() {
      const st = stateOf(play.gi, play.si), stg = stageObj();
      const kn = known(), H = stg.H, W = stg.W, rtl = S.lang === 'ar';
      const nSol = Object.keys(st.sol).length;
      const bar = `<div class="wl-pbar"><button class="wl-pb" data-pback>${S.lang === 'ar' ? '' : '↩ '}${esc(L().back)}${S.lang === 'ar' ? ' ↪' : ''}</button>
        <b>${esc(L().puzzle)} ${play.si + 1}<small>${esc(gName(groups()[play.gi].g, S.lang))} · ${nSol}/${stg.w.length}</small></b>
        <button class="wl-pb hp" data-hinfo title="${esc(L().helps)}">💡 ${S.helps} <i>⊕</i></button></div>`;
      const w = play.open && play.sel >= 0 ? stg.w[play.sel] : null;
      if (!w) {
        // الشبكة فالشاشة كاملة (بحال وصلة)
        const selCells = new Set(play.sel >= 0 && !st.sol[play.sel] ? cells(stg.w[play.sel]).map(([r, c]) => r + ',' + c) : []);
        const flash = new Set(play.flash != null ? cells(stg.w[play.flash]).map(([r, c]) => r + ',' + c) : []);
        const picAt = new Map();
        stg.w.forEach((x, i) => { if (x[2] && !st.sol[i]) picAt.set(x[3] + ',' + x[4], 1); });
        const all = new Set();
        stg.w.forEach(x => cells(x).forEach(([r, c]) => all.add(r + ',' + c)));
        const maxW = Math.min(root.clientWidth || 360, 760) - 24;
        const cs = Math.max(22, Math.min(46, Math.floor((maxW - W * 4) / W)));
        let grid = '';
        for (let r = 0; r < H; r++) for (let vc = 0; vc < W; vc++) {
          const c = rtl ? W - 1 - vc : vc, k = r + ',' + c;
          if (!all.has(k)) { grid += '<div></div>'; continue; }
          const kk = kn.get(k);
          grid += `<div class="wl-c ${kk && kk.ok ? 'ok' : ''} ${kk && kk.rv ? 'rv' : ''} ${selCells.has(k) ? 'sel' : ''} ${flash.has(k) ? 'fl' : ''}" data-k="${k}" style="font-size:${Math.round(cs * 0.56)}px">${picAt.has(k) ? '<span class="pic">📷</span>' : ''}${kk ? esc(kk.ch) : ''}</div>`;
        }
        play.flash = null;
        root.innerHTML = `<div class="wl wl-pl" dir="${dir()}">${bar}
          <div class="wl-board"><div class="wl-grid" style="grid-template-columns:repeat(${W},${cs}px);grid-auto-rows:${cs}px" dir="ltr">${grid}</div></div>
          <div class="wl-hint">${esc(play.msg || L().pick)}</div></div>`;
        root.querySelectorAll('.wl-c').forEach(el => el.onclick = () => {
          const k = el.dataset.k;
          const hits = stg.w.map((x, i) => i).filter(i => cells(stg.w[i]).some(([r, c]) => r + ',' + c === k));
          if (!hits.length) return;
          let i = hits.find(h => !st.sol[h] && h !== play.sel);
          if (i == null) i = hits.find(h => !st.sol[h]);
          if (i == null) i = hits[0];
          select(i);
        });
      } else {
        // بطاقة السؤال: العنوان + الصورة/النص + كشف/حذف حرف، ومن تحت الخانات والحروف
        const C = (DATA.credits || {})[w[2]];
        const solved = st.sol[play.sel];
        const cols = play.bank ? play.bank.length / 2 : 7;
        root.innerHTML = `<div class="wl wl-pl" dir="${dir()}">${bar}
          <div class="wl-card">
            <div class="wl-card-h">${esc(w[2] ? L().whatIs : L().info)}</div>
            ${w[2] ? `<div class="wl-card-img"><img src="${IMG}${esc(w[2])}.webp" alt="" data-zoom onerror="this.parentNode.style.display='none'">${C && C.page ? `<span class="wl-cred">© ${esc(C.by || '')} · ${esc(C.lic || '')}</span>` : ''}</div><div class="wl-card-q">${esc(w[1])}</div>`
              : `<div class="wl-card-t">${esc(w[1])}</div>`}
            ${solved ? '' : `<div class="wl-card-f"><button data-h="rv">✏️ ${esc(L().reveal)}</button><button data-h="rm">🧽 ${esc(L().remove)}</button></div>`}
          </div>
          <div style="text-align:center"><button class="wl-ask" data-ask><img src="${MOUNIR}" alt="">${esc(L().ask)}</button></div>
          ${solved ? `<div class="wl-slots">${Array.from(w[6]).map(ch => `<span class="wl-slot ok">${esc(ch)}</span>`).join('')}</div>` : `
          <div class="wl-slots" dir="${dir()}">${play.slots.map((s, p) => `<span class="wl-slot ${s ? (s.lock ? s.lock : 'in') : ''}" data-p="${p}">${s ? esc(s.ch) : ''}</span>`).join('')}</div>
          <div class="wl-msg ${play.msgCls || ''}">${esc(play.msg || '')}</div>
          <div class="wl-bank" style="--n:${cols}" dir="${dir()}">${play.bank.map((ch, bi) => `<button class="wl-t ${play.used[bi] === 'gone' ? 'gone' : play.used[bi] ? 'used' : ''}" data-b="${bi}">${esc(ch)}</button>`).join('')}</div>`}
        </div>`;
        root.querySelectorAll('[data-b]').forEach(b => b.onclick = () => tap(+b.dataset.b));
        root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => untap(+b.dataset.p));
        root.querySelectorAll('[data-h]').forEach(b => b.onclick = () => useHelp(b.dataset.h));
        root.querySelector('[data-ask]').onclick = () => askMounir(play.sel);
        const z = root.querySelector('[data-zoom]');
        if (z) z.onclick = () => modal(`<img class="full" src="${z.src}" alt=""><div class="row"><button class="wl-btn k" data-x>${esc(L().close)}</button></div>`);
      }
      root.querySelector('[data-pback]').onclick = () => {
        if (play.open) { play.open = false; play.msg = ''; render(); return; }
        view = { name: 'group', gi: play.gi }; render();
      };
      root.querySelector('[data-hinfo]').onclick = () => toast(L().helpsInfo);
      if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' });
    }

    /* ---------- منير: مساعد اللعبة بالذكاء الاصطناعي (كيشرح ويعطي الجواب) ---------- */
    const CHATS = {};
    // كيرجع النص كامل؛ onText كيتعيط مع كل جزء (البث المباشر: الكلمات كيبانو فثانية)
    async function aiCall(game, messages, onText) {
      const body = { game, messages, lang: S.lang === 'ar' ? 'darija' : S.lang, stream: true };
      let res;
      if (host.askAI) res = await host.askAI(body);
      else {
        const C = window.__ALWASSET_SUPABASE__ || {};
        if (!C.url || !C.anonKey) throw new Error('cfg');
        res = await fetch(C.url.replace(/\/+$/, '') + '/functions/v1/w777-agent', {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: C.anonKey, Authorization: 'Bearer ' + C.anonKey }, body: JSON.stringify(body),
        });
      }
      if (!/event-stream/.test(res.headers.get('content-type') || '') || !res.body) { const j = await res.json().catch(() => ({})); if (j.text) onText(j.text); return j; }
      const rd = res.body.getReader(), dec = new TextDecoder();
      let buf = '', text = '';
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i).split('\n').find(l => l.startsWith('data:')); buf = buf.slice(i + 2);
          if (!line) continue;
          let j; try { j = JSON.parse(line.slice(5)); } catch (e) { continue; }
          if (j.t) { text += j.t; onText(j.t); } else if (j.error) return { error: j.error };
        }
      }
      return { text };
    }
    function askMounir(i) {
      const st = stateOf(play.gi, play.si), w = stageObj().w[i], ck = S.lang + key2(i);
      const chat = CHATS[ck] = CHATS[ck] || [];
      let busy = false;
      const game = { q: w[1], a: w[0], group: gName(groups()[play.gi].g, S.lang), solved: !!st.sol[i] };
      const m = modal(`<h3 class="wl-ai-h"><img src="${MOUNIR}" alt="">${esc(L().askT)}</h3><div class="wl-ai-q">❓ ${esc(w[1])}</div>
        <div class="wl-ai-log" id="wl-ai-log"></div><div class="wl-ai-chips">${L().chips.map(c => `<button type="button">${esc(c)}</button>`).join('')}</div>
        <form class="wl-ai-f" id="wl-ai-f"><input id="wl-ai-in" maxlength="400" placeholder="${esc(L().askPh)}" autocomplete="off"><button class="wl-btn">${esc(L().send)}</button></form>
        <div class="row"><button class="wl-btn k" data-x>${esc(L().close)}</button></div>`);
      m.firstElementChild.classList.add('wl-ai');
      const log = m.querySelector('#wl-ai-log');
      const paint = () => {
        const bot = t => `<div class="bw"><img src="${MOUNIR}" alt=""><div class="b">${t}</div></div>`;
        log.innerHTML = bot(esc(L().aiHi)) + chat.map(x => x.role === 'user' ? `<div class="u">${esc(x.content)}</div>` : bot(esc(String(x.content).replace(/\*\*?([^*]+)\*\*?/g, '$1')))).join('') + (busy ? `<div class="bw"><img src="${MOUNIR}" alt=""><div class="b dots">${esc(L().thinking)}</div></div>` : '');
        log.scrollTop = log.scrollHeight;
      };
      const send = async txt => {
        txt = String(txt || '').trim();
        if (!txt || busy) return;
        const um = { role: 'user', content: txt };
        chat.push(um);
        busy = true; paint();
        const hist = chat.slice(-12);
        const drop = () => { [live, um].forEach(x => { const k = chat.indexOf(x); if (k >= 0) chat.splice(k, 1); }); };
        let live = null, raf = 0;
        try {
          const r = await aiCall(game, hist, d => {
            if (!live) { live = { role: 'assistant', content: '' }; chat.push(live); busy = false; }
            live.content += d;
            if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); });
          });
          if (r && r.text) { if (!live) chat.push({ role: 'assistant', content: r.text }); else live.content = r.text; }
          else { drop(); toast(r && r.error === 'quota' ? L().aiQuota : L().aiErr); }
        } catch (e) { drop(); toast(L().aiErr); }
        busy = false; paint();
      };
      m.querySelectorAll('.wl-ai-chips button').forEach(b => b.onclick = () => send(b.textContent));
      m.querySelector('#wl-ai-f').onsubmit = e => { e.preventDefault(); const inp = m.querySelector('#wl-ai-in'); const v = inp.value; inp.value = ''; send(v); };
      paint();
    }
    const key2 = i => key(play.gi, play.si) + ':' + i;

    let toastT;
    function toast(msg) {
      let t = document.getElementById('wl-toast');
      if (!t) { t = document.createElement('div'); t.id = 'wl-toast'; t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:12px;z-index:10000;font-weight:800;border-bottom:3px solid #c8102e;max-width:90vw;text-align:center'; document.body.appendChild(t); }
      t.textContent = msg; t.style.display = 'block';
      clearTimeout(toastT); toastT = setTimeout(() => { t.style.display = 'none'; }, 2600);
    }

    function render() {
      if (!groups().length) { root.innerHTML = '<div class="wl">—</div>'; return; }
      if (view.name === 'group') group();
      else if (view.name === 'play' && play) playView();
      else home();
    }
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (view.name === 'play' && root.isConnected) render(); }, 200); });
    render();
    flush();
  }

  // فالتطبيق: ملي نخرجو من اللعبة، النوافذ ديالها كتسد
  window.addEventListener('hashchange', () => { document.querySelectorAll('.wl-mod').forEach(m => m.remove()); });
  window.W777_CW = { mount };
})();
