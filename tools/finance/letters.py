# PDF 2 — طلبات إبرام اتفاقيات الشراكة (رسالة بالفرنسية + نسخة عربية لكل جهة) + مشروع اتفاقية + جدول تتبع
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = json.load(open(os.path.join(HERE, 'institutions.json')))
INST = D['inst']; CATS = D['cats']; DATE = D['date']
HAS = {os.path.splitext(f)[0] for f in os.listdir(f'{APP}/icons/fin')}
logo = lambda i: f'{FIN}/{i}.webp' if i in HAS else None
order = [i for c in CATS for i in INST if i['cat'] == c[0]]

OBJ = {
 'bank': ("Demande de convention de partenariat — financement immobilier de nos clients", "طلب إبرام اتفاقية شراكة في مجال التمويل العقاري لعملائنا"),
 'part': ("Demande de convention de partenariat — financement participatif immobilier (Mourabaha)", "طلب إبرام اتفاقية شراكة في مجال التمويل التشاركي العقاري (المرابحة)"),
 'window': ("Demande de convention de partenariat — financement participatif immobilier", "طلب إبرام اتفاقية شراكة في مجال التمويل التشاركي العقاري"),
 'finco': ("Demande de convention de partenariat — financement et crédit-bail immobilier", "طلب إبرام اتفاقية شراكة في مجال التمويل والإيجار التمويلي العقاري"),
 'micro': ("Demande de partenariat — accès au logement des ménages à revenus modestes", "طلب شراكة لتيسير ولوج الأسر ذات الدخل المحدود إلى السكن"),
 'state': ("Demande de partenariat d'information et d'accompagnement de nos clients", "طلب شراكة في مجال الإخبار ومواكبة عملائنا"),
 'mre': ("Demande de partenariat — accompagnement des Marocains du Monde dans leur projet immobilier au Maroc", "طلب شراكة لمواكبة مغاربة العالم في مشاريعهم العقارية بالمغرب"),
 'intl': ("Demande de mise en relation — financement de projets immobiliers et touristiques", "طلب ربط علاقة مهنية — تمويل المشاريع العقارية والسياحية"),
}
ASK = {
 'state': ["la documentation officielle et les conditions d'éligibilité à jour, afin d'informer correctement nos clients ;", "la liste des établissements partenaires et la procédure à suivre ;", "la désignation d'un interlocuteur pour les questions de nos clients ;", "la possibilité d'une réunion d'information avec notre équipe."],
 'intl': ["les critères d'éligibilité et les seuils d'intervention de votre institution ;", "les canaux d'accès (lignes de crédit via des banques marocaines, financement direct, prise de participation) ;", "la désignation d'un interlocuteur pour le Maroc ;", "la possibilité d'une réunion de présentation de projets."],
}
ASK_DEF = ["la désignation d'un interlocuteur dédié (au niveau de Meknès et/ou de la direction centrale) ;", "vos conditions actuelles de financement et la liste des pièces requises par profil de client ;",
           "les modalités d'un éventuel programme d'apporteur d'affaires ou de recommandation de clients, ainsi que le cadre réglementaire applicable et, le cas échéant, les conditions de rémunération ;",
           "l'autorisation écrite d'utiliser votre logo à des fins d'information dans notre application ;", "l'organisation d'une réunion de présentation, en présentiel ou à distance."]
ASK_AR = {
 'state': ['الوثائق الرسمية وشروط الاستفادة المحيَّنة لإخبار عملائنا بدقة؛', 'لائحة المؤسسات الشريكة والمسطرة المتبعة؛', 'تعيين مخاطَب للإجابة عن أسئلة عملائنا؛', 'إمكانية تنظيم اجتماع إخباري مع فريقنا.'],
 'intl': ['معايير الأهلية وسقوف التدخل لدى مؤسستكم؛', 'قنوات الولوج (خطوط تمويل عبر البنوك المغربية، تمويل مباشر، مساهمة في رأس المال)؛', 'تعيين مخاطَب خاص بالمغرب؛', 'إمكانية تنظيم اجتماع لعرض المشاريع.'],
}
ASK_DEF_AR = ['تعيين مخاطَب خاص (على مستوى مكناس و/أو الإدارة المركزية)؛', 'شروطكم الحالية للتمويل ولائحة الوثائق المطلوبة حسب فئة العميل؛', 'كيفيات برنامج محتمل لتقديم أو إحالة العملاء، والإطار القانوني المعمول به، وشروط المكافأة إن وُجدت؛', 'الإذن الكتابي باستعمال شعاركم لأغراض إخبارية داخل تطبيقنا؛', 'تنظيم اجتماع تعريفي حضورياً أو عن بُعد.']
PJ = ["Registre de commerce (RC)", "Identifiant fiscal (IF) et ICE", "Attestation de taxe professionnelle", "Copie de la CIN du représentant légal", "Présentation de l'agence et de l'application AL WASSET 777"]
PJ_AR = ['السجل التجاري', 'التعريف الضريبي والمعرف الموحد للمقاولة (ICE)', 'شهادة الضريبة المهنية', 'نسخة من البطاقة الوطنية للممثل القانوني', 'تقديم المكتب وتطبيق الوسيط 777']

CSS = BASE_CSS + f"""
@page {{ margin: 14mm 16mm 18mm; }}
.cover {{ height: 265mm; display: flex; flex-direction: column; break-after: page; }}
.cover .field {{ margin: 8mm auto 6mm; }}
.cover h1 {{ font-size: 25pt; font-weight: 800; line-height: 1.25; direction: ltr; text-align: left; }}
.cover h1 em {{ font-style: normal; color: {RED}; }}
.cover h2 {{ font-size: 17pt; font-weight: 800; margin-top: 8px; }}
.cover .top {{ display: flex; justify-content: space-between; align-items: center; }}
.cover .top img {{ width: 70px; }}
.cover .bot {{ margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid {INK}; padding-top: 10px; font-size: 9pt; }}
.letter {{ break-before: page; height: 262mm; overflow: hidden; display: flex; flex-direction: column; font-size: 10pt; line-height: 1.55; }}
.letter.fr {{ font-size: 9.4pt; line-height: 1.5; }}
.letter.fr p {{ margin-bottom: 6px; }}
.letter.fr {{ direction: ltr; text-align: left; }}
.lh {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid {INK}; padding-bottom: 8px; }}
.lh .me {{ display: flex; align-items: center; gap: 10px; }}
.lh .me img {{ width: 54px; height: 54px; }}
.lh .me b {{ display: block; font-size: 11pt; letter-spacing: .1em; }}
.lh .me small {{ display: block; font-size: 8pt; color: #444; line-height: 1.45; }}
.lh .to-logo {{ max-height: 40px; max-width: 120px; object-fit: contain; }}
.lh .to-ph {{ font-size: 7.5pt; color: {GREY}; border: 1px dashed #bbb; padding: 8px 10px; border-radius: 6px; }}
.redbar {{ height: 3px; width: 54px; background: {RED}; margin: 6px 0 12px; }}
.meta {{ display: flex; justify-content: space-between; gap: 20px; margin: 10px 0 8px; font-size: 9.4pt; }}
.dest {{ margin-inline-start: auto; max-width: 62%; font-size: 9.6pt; line-height: 1.5; }}
.obj {{ margin: 12px 0 10px; font-weight: 800; }}
.obj span {{ color: {RED}; }}
.letter p {{ margin: 0 0 8px; text-align: justify; }}
.letter ul {{ margin: 2px 0 8px; padding-inline-start: 20px; }} .letter li {{ margin: 2px 0; }}
.sign {{ margin-top: 14px; display: flex; justify-content: space-between; gap: 30px; }}
.sign div {{ flex: 1; }} .sign .box {{ height: 52px; border: 1px dashed #bbb; border-radius: 6px; margin-top: 4px; }}
.pj {{ margin-top: auto; font-size: 8.4pt; color: #333; border-top: 1px solid #ddd; padding-top: 6px; }}
.fill {{ display: inline-block; min-width: 120px; border-bottom: 1px dotted #888; }}
.idx td {{ font-size: 8.6pt; }}
.conv h3 {{ font-size: 10.5pt; margin: 10px 0 3px; color: {RED}; }}
.conv p {{ margin: 0 0 6px; text-align: justify; font-size: 9.6pt; }}
.conv.fr {{ direction: ltr; text-align: left; }}
.track th, .track td {{ font-size: 7.6pt; }} .track td {{ height: 21px; }}
"""


def header(i, fr=True):
    to = f'<img class="to-logo" src="{logo(i["id"])}" alt="">' if logo(i['id']) else f'<span class="to-ph">{"Logo destinataire" if fr else "شعار الجهة"}</span>'
    me = f'<div class="me"><img src="{LOGO}" alt=""><div><b class="ltr">{OFFICE["fr"]}</b><small>{OFFICE["ar"]}</small><small class="ltr">{OFFICE["city"]} · {OFFICE["tel1"]} · {OFFICE["tel2"]}</small><small class="ltr">{OFFICE["mail"]} · RC <span class="fill" style="min-width:60px"></span> · ICE <span class="fill" style="min-width:80px"></span></small></div></div>'
    return f'<div class="lh">{me}{to}</div><div class="redbar"></div>'


def letter_fr(i, k):
    obj = OBJ[i['cat']][0]
    prod = i['products'][0][0] if i['products'] else ''
    hook = f"Nous avons pris connaissance avec intérêt de votre offre « {e(prod)} », qui répond directement aux besoins de nombreux clients que nous accompagnons." if prod and i['cat'] not in ('intl',) else "Nous suivons avec intérêt l'action de votre institution en faveur du financement de l'immobilier au Maroc."
    asks = ASK.get(i['cat'], ASK_DEF)
    addr = f'<br>{e(i["addr"])}' if i['addr'] else ''
    grp = f'<br><small>{e(i["group"])}</small>' if i['group'] and 'confirmer' not in i['group'] else ''
    return f'''<section class="letter fr" id="l{k}">{header(i)}
<div class="meta"><span>Réf. : <b>777/CONV/2026/{k:02d}</b></span><span>Meknès, le <span class="fill"></span></span></div>
<div class="dest"><b>À l'attention de Monsieur / Madame le Directeur Général</b><br>Direction du Crédit Immobilier / Direction des Partenariats<br><b>{e(i['name'])}</b>{grp}{addr}</div>
<div class="obj"><span>Objet :</span> {e(obj)}</div>
<p>Madame, Monsieur le Directeur Général,</p>
<p>Nous avons l'honneur de vous présenter <b>AL WASSET 777 IMMOBILIER</b>, agence d'intermédiation immobilière basée à Meknès, active dans la vente, la location résidentielle et commerciale, l'accompagnement des investisseurs et des Marocains du Monde, ainsi que la commercialisation de projets immobiliers. Notre agence anime également le réseau professionnel « Al Wasset 777 » (agences, courtiers, promoteurs, entreprises de finition, notaires, investisseurs et associations d'habitat) au moyen de sa propre application de gestion.</p>
<p>{hook} Dans le cadre du lancement de notre service « <b>Financement immobilier</b> », nous souhaitons ouvrir la voie à une collaboration structurée avec votre institution.</p>
<p><b>Ce que nous proposons :</b></p>
<ul><li>l'orientation vers vos services de clients au projet clair et aux dossiers pré-qualifiés et complets ;</li><li>un point de contact unique et réactif à Meknès pour le suivi des dossiers ;</li><li>la présentation de vos offres, dans le strict respect de leurs conditions officielles, au sein de notre application et auprès de notre réseau ;</li><li>une démarche transparente envers les clients et conforme à la loi 09-08 relative à la protection des données personnelles.</li></ul>
<p><b>Afin d'étudier ce partenariat, nous vous serions reconnaissants de bien vouloir nous communiquer :</b></p>
<ul>{''.join(f'<li>{a}</li>' for a in asks)}</ul>
<p>Cette démarche constitue une première prise de contact en vue d'une éventuelle convention non exclusive ; elle n'engage aucune des deux parties à ce stade. Nous restons à votre entière disposition pour vous rencontrer à votre convenance.</p>
<p>Nous vous prions d'agréer, Madame, Monsieur le Directeur Général, l'expression de notre haute considération.</p>
<div class="sign"><div><b>Pour AL WASSET 777 IMMOBILIER</b><br>{OFFICE['rep']} — Directeur<div class="box"></div><small>Signature et cachet</small></div><div><b>Accusé de réception — {e(i['name'].split(' – ')[0].split(' (')[0])}</b><br>Nom et qualité : <span class="fill"></span><div class="box"></div><small>Signature et cachet</small></div></div>
<div class="pj"><b>Pièces jointes :</b> {' · '.join(PJ)}</div></section>'''


def letter_ar(i, k):
    obj = OBJ[i['cat']][1]
    prod = i['products'][0][0] if i['products'] else ''
    hook = f'وقد اطلعنا باهتمام على عرضكم «<span class="ltr">{e(prod)}</span>» الذي يستجيب مباشرة لحاجيات عدد كبير من العملاء الذين نواكبهم.' if prod and i['cat'] != 'intl' else 'ونتابع باهتمام دور مؤسستكم في تمويل العقار بالمغرب.'
    asks = ASK_AR.get(i['cat'], ASK_DEF_AR)
    addr = f'<br><span class="ltr">{e(i["addr"])}</span>' if i['addr'] else ''
    return f'''<section class="letter">{header(i, False)}
<div class="meta"><span>المرجع: <b class="ltr">777/CONV/2026/{k:02d}</b></span><span>مكناس في: <span class="fill"></span></span></div>
<div class="dest"><b>إلى السيد(ة) المدير(ة) العام(ة) المحترم(ة)</b><br>مديرية القروض العقارية / مديرية الشراكات<br><b>{e(i['ar'])}</b> — <span class="ltr">{e(i['name'].split(' – ')[0])}</span>{addr}</div>
<div class="obj"><span>الموضوع:</span> {e(obj)}</div>
<p>تحية طيبة وبعد،</p>
<p>يشرفنا أن نقدم لكم <b>مكتب الوسيط 777 للعقارات</b>، مكتب وساطة عقارية مقره بمكناس، ينشط في البيع والكراء السكني والتجاري، ومواكبة المستثمرين ومغاربة العالم، وتسويق المشاريع العقارية. كما يدير المكتب شبكة «الوسيط 777» المهنية (وكالات، وسطاء، منعشون، مقاولات التشطيب، موثقون، مستثمرون وجمعيات سكنية) عبر تطبيقه الخاص للتدبير.</p>
<p>{hook} وفي إطار إطلاق خدمتنا «<b>التمويل العقاري</b>»، نرغب في فتح باب تعاون منظم مع مؤسستكم الموقرة.</p>
<p><b>ما نقترحه:</b></p>
<ul><li>توجيه عملاء ذوي مشاريع واضحة وملفات مكتملة ومدروسة مسبقاً نحو خدماتكم؛</li><li>نقطة اتصال واحدة وسريعة بمكناس لتتبع الملفات؛</li><li>التعريف بعروضكم وفق شروطها الرسمية فقط داخل تطبيقنا ولدى شبكتنا؛</li><li>الشفافية مع العملاء واحترام القانون 09-08 المتعلق بحماية المعطيات الشخصية.</li></ul>
<p><b>ولدراسة هذه الشراكة، نرجو التفضل بموافاتنا بما يلي:</b></p>
<ul>{''.join(f'<li>{a}</li>' for a in asks)}</ul>
<p>تُعدّ هذه المراسلة مبادرة أولى لفتح باب التفاوض حول اتفاقية غير حصرية، ولا تُلزم أي طرف في هذه المرحلة. ونبقى رهن إشارتكم للقاء في الموعد الذي يناسبكم.</p>
<p>وتفضلوا بقبول فائق عبارات التقدير والاحترام.</p>
<div class="sign"><div><b>عن مكتب الوسيط 777 للعقارات</b><br>{OFFICE['rep_ar']} — المدير<div class="box"></div><small>التوقيع والخاتم</small></div><div><b>إشعار بالتوصل</b><br>الاسم والصفة: <span class="fill"></span><div class="box"></div><small>التوقيع والخاتم</small></div></div>
<div class="pj"><b>المرفقات:</b> {' · '.join(PJ_AR)}</div></section>'''


ART = [
 ("Parties", "La présente convention est conclue entre AL WASSET 777 IMMOBILIER, Meknès (RC ____, ICE ____), représentée par M. Mounir RADOUI, ci-après « l'Intermédiaire », et ____________________, représenté(e) par ____________________, ci-après « l'Organisme ».", "الأطراف", "تُبرم هذه الاتفاقية بين مكتب الوسيط 777 للعقارات بمكناس (السجل التجاري ____، ICE ____) ويمثله السيد منير رادوي، ويُشار إليه بـ«الوسيط»، و ____________________ ويمثلها ____________________، ويُشار إليها بـ«الجهة»."),
 ("Objet", "Définir les conditions dans lesquelles l'Intermédiaire oriente vers l'Organisme des clients souhaitant financer l'acquisition, la construction ou l'aménagement d'un bien immobilier.", "الموضوع", "تحديد الشروط التي يوجّه بموجبها الوسيط إلى الجهة عملاء يرغبون في تمويل اقتناء أو بناء أو تهيئة عقار."),
 ("Champ d'application", "Financements résidentiels, commerciaux et professionnels proposés par l'Organisme, au Maroc et pour les Marocains du Monde, selon ses produits en vigueur.", "مجال التطبيق", "التمويلات السكنية والتجارية والمهنية التي تقدمها الجهة بالمغرب ولمغاربة العالم، وفق منتجاتها الجاري بها العمل."),
 ("Engagements de l'Intermédiaire", "Présenter des dossiers complets et sincères ; informer le client des conditions officielles sans s'y substituer ; ne percevoir aucune somme du client au titre du crédit sans accord écrit ; respecter la charte et l'image de l'Organisme.", "التزامات الوسيط", "تقديم ملفات كاملة وصادقة؛ إخبار العميل بالشروط الرسمية دون الحلول محل الجهة؛ عدم تسلّم أي مبلغ من العميل بشأن القرض دون اتفاق مكتوب؛ احترام ميثاق الجهة وصورتها."),
 ("Engagements de l'Organisme", "Désigner un interlocuteur ; communiquer ses conditions et documents requis ; informer l'Intermédiaire de la décision sur chaque dossier transmis, dans un délai indicatif de ____ jours ; fournir sa documentation commerciale.", "التزامات الجهة", "تعيين مخاطَب؛ موافاة الوسيط بالشروط والوثائق المطلوبة؛ إخباره بالقرار في كل ملف داخل أجل إرشادي قدره ____ يوماً؛ توفير الوثائق التعريفية."),
 ("Rémunération", "Le cas échéant et dans le respect de la réglementation applicable : ____ % du montant débloqué ou montant forfaitaire de ____ DH par dossier, payable après déblocage effectif, sur facture TTC.", "المكافأة", "عند الاقتضاء ووفق القوانين الجاري بها العمل: ____ % من المبلغ المصروف أو مبلغ جزافي قدره ____ درهم عن كل ملف، يُؤدى بعد الصرف الفعلي بناءً على فاتورة متضمنة للضريبة."),
 ("Protection des données", "Les parties traitent les données des clients conformément à la loi 09-08 et aux exigences de la CNDP, avec le consentement préalable du client.", "حماية المعطيات", "يعالج الطرفان معطيات العملاء طبقاً للقانون 09-08 ومتطلبات اللجنة الوطنية لمراقبة حماية المعطيات، وبعد موافقة العميل."),
 ("Confidentialité", "Les informations échangées restent confidentielles pendant la durée de la convention et trois (3) ans après son terme.", "السرية", "تظل المعلومات المتبادلة سرية طيلة مدة الاتفاقية وثلاث (3) سنوات بعد انتهائها."),
 ("Transparence", "Les parties respectent la loi 31-08 édictant des mesures de protection du consommateur ; aucune condition non confirmée n'est présentée comme officielle.", "الشفافية", "يحترم الطرفان القانون 31-08 المتعلق بحماية المستهلك، ولا يُقدَّم أي شرط غير مؤكد على أنه رسمي."),
 ("Communication", "Toute utilisation du nom ou du logo de l'Organisme est soumise à son accord écrit préalable.", "التواصل", "يخضع كل استعمال لاسم الجهة أو شعارها لموافقتها الكتابية المسبقة."),
 ("Durée — résiliation", "Convention non exclusive, conclue pour douze (12) mois renouvelables tacitement, résiliable par chaque partie moyennant un préavis de ____ jours.", "المدة والفسخ", "اتفاقية غير حصرية لمدة اثني عشر (12) شهراً قابلة للتجديد الضمني، ويجوز لكل طرف فسخها بإشعار مسبق قدره ____ يوماً."),
 ("Litiges", "Les parties recherchent une solution amiable ; à défaut, compétence est attribuée aux tribunaux de ____________.", "النزاعات", "يسعى الطرفان إلى حل ودي، وفي حال تعذره يُعقد الاختصاص لمحاكم ____________."),
]


def convention():
    fr = ''.join(f'<h3>Article {n} — {t}</h3><p>{x}</p>' for n, (t, x, _, _) in enumerate(ART, 1))
    ar = ''.join(f'<h3>المادة {n} — {t}</h3><p>{x}</p>' for n, (_, _, t, x) in enumerate(ART, 1))
    sig_fr = '<div class="sign"><div><b>Pour l\'Intermédiaire</b><div class="box"></div></div><div><b>Pour l\'Organisme</b><div class="box"></div></div></div>'
    sig_ar = '<div class="sign"><div><b>عن الوسيط</b><div class="box"></div></div><div><b>عن الجهة</b><div class="box"></div></div></div>'
    return (f'<section class="pb conv fr"><div class="sec-title"><span class="num">II</span><div><h2>Projet de convention de partenariat</h2><small>Modèle à adapter avec chaque organisme — Fait à Meknès, le ____</small></div></div><div class="rule"></div>{fr}{sig_fr}</section>'
            f'<section class="pb conv"><div class="sec-title"><span class="num">II</span><div><h2>مشروع اتفاقية الشراكة</h2><small>نموذج يُكيَّف مع كل جهة — حُرر بمكناس في ____</small></div></div><div class="rule"></div>{ar}{sig_ar}</section>')


cover = f'''<section class="cover">
 <div class="top"><img src="{LOGO}" alt=""><span class="kicker ltr">777/CONV/2026 · {DATE}</span></div>
 <div class="field">{arcs(560, 300, n=16)}</div>
 <div class="rule red"></div>
 <h1>Demandes de conventions de partenariat<br><em>en financement immobilier</em></h1>
 <h2>طلبات إبرام اتفاقيات الشراكة في مجال التمويل العقاري</h2>
 <p class="ltr" style="margin-top:10px;display:block;text-align:left">{len(order)} lettres personnalisées (français + arabe) · projet de convention (12 articles) · tableau de suivi</p>
 <div class="bot"><div><b class="ltr">{OFFICE['fr']}</b><br>{OFFICE['ar']} · {OFFICE['city_ar']}</div><div class="ltr" style="text-align:left">{OFFICE['tel1']} · {OFFICE['tel2']}<br>{OFFICE['mail']}</div></div>
</section>'''

idx = '<section><div class="sec-title"><span class="num">I</span><div><h2>Index des lettres · فهرس الطلبات</h2></div></div><div class="rule"></div><table class="idx"><tr><th>Réf.</th><th>الجهة</th><th>Organisme</th><th>Objet</th></tr>' + ''.join(
    f'<tr><td class="ltr">777/CONV/2026/{k:02d}</td><td>{e(i["ar"])}</td><td class="ltr">{e(i["name"].split(" – ")[0].split(" (")[0])}</td><td class="ltr" style="font-size:7.8pt">{e(OBJ[i["cat"]][0].split(" — ")[-1])}</td></tr>' for k, i in enumerate(order, 1)) + '</table>'
idx += '<div class="note" style="background:#f6f6f6;border-inline-start:3px solid #c8102e;padding:8px 12px;font-size:8.8pt;margin-top:12px">Avant l\'envoi : compléter RC / ICE, dater et signer chaque lettre ; joindre les pièces listées. Les lettres ne présument d\'aucune convention existante. · قبل الإرسال: إتمام السجل التجاري وICE، وتأريخ وتوقيع كل طلب وإرفاق الوثائق.</div></section>'

letters = ''.join(letter_fr(i, k) + letter_ar(i, k) for k, i in enumerate(order, 1))
track = '<section class="pb"><div class="sec-title"><span class="num">III</span><div><h2>Suivi interne des dossiers · تتبع الملفات</h2></div></div><div class="rule"></div><table class="track"><tr><th>N° dossier</th><th>Client</th><th>Organisme</th><th>Date d\'envoi</th><th>Statut</th><th>Montant</th><th>Commission</th><th>Observations</th></tr>' + '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' * 32 + '</table></section>'

page = f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Conventions — Al Wasset 777</title><style>{CSS}</style></head><body>{cover}{idx}{letters}{convention()}{track}</body></html>'
out = os.path.join(HERE, 'letters.html'); open(out, 'w').write(page)
pdf = os.path.join(HERE, 'Demandes_Conventions_AlWasset777.pdf')
render_pdf(out, pdf, footer_text=f'AL WASSET 777 IMMOBILIER — Demandes de conventions de partenariat — {DATE}')
print(pdf, os.path.getsize(pdf))
