
import { Module, Language } from './types';

export const MODULES_DATA: Record<Language, Module[]> = {
  ar: [
    {
      id: 'm1',
      title: 'الوحدة 1: القانون، الأدوار والجبايات',
      icon: '🇲🇦',
      imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
      description: 'دليل شامل للنظام القانوني والضريبي المغربي المطبق على العقارات.',
      content: [
        {
          title: 'الساعة 1: نظام التحفيظ العقاري (قانون 14-07)',
          content: 'فهم الفروقات الجوهرية بين الرسم العقاري، مطلب التحفيظ، والملكية التقليدية.',
          subsections: [
            {
              title: "الرسم العقاري (Titre Foncier)",
              explanation: "هو الهوية النهائية للعقار. بمجرد تأسيسه، يصبح العقار 'مطهرًا' من أي نزاعات سابقة. في مكناس، أغلب العقارات في حمرية محفظة، بينما نجد 'الملكية' بكثرة في المدينة القديمة."
            },
            {
              title: "دراسة حالة: تحويل ملكية",
              explanation: "كيفية التعامل مع عقار غير محفظ يرغب صاحبه في بيعه لمشترٍ يطلب قرضًا بنكيًا. المسطرة تتطلب شهادة إدارية وبحثًا طبوغرافياً دقيقًا."
            }
          ]
        },
        {
          title: 'الساعة 2: المتدخلون القانونيون (الموثق والعدل)',
          content: 'تحديد أدوار الموثق العصري والعدول في توثيق العقود.',
          subsections: [
            {
              title: "الموثق (Notaire)",
              explanation: "يلعب دور الضامن للأموال عبر صندوق الإيداع والتدبير (CDG). هو المسؤول عن التحقق من خلو العقار من الرهون قبل إتمام البيع."
            }
          ]
        },
        {
          title: 'الساعة 3: الجبايات العقارية المعمقة',
          content: 'حساب ضريبة الأرباح العقارية (TPI) والضريبة على الخدمات الجماعية (TSC).',
          subsections: [
            {
              title: "حساب الـ TPI",
              explanation: "مثال تطبيقي: شراء شقة بـ 50 مليون وبيعها بـ 80 مليون بعد 4 سنوات. كيف نحتسب معامل التحيين ونستخلص الضريبة الصافية."
            }
          ]
        },
        {
          title: 'الساعة 4: أخلاقيات المهنة ومحاربة غسل الأموال',
          content: 'الالتزامات القانونية للوكيل العقاري تجاه الهيئة الوطنية للمعلومات المالية.',
          subsections: [
            {
              title: "قانون 43-05",
              explanation: "واجب التصريح بالاشتباه وتحديد هوية الزبون (KYC) لتجنب العقوبات الزجرية."
            }
          ]
        }
      ],
      resources: [
        { title: "دليل الجبايات 2024", type: "PDF", url: "#" },
        { title: "لائحة وثائق المحافظة", type: "CHECKLIST", url: "#" }
      ]
    },
    {
      id: 'm2',
      title: 'الوحدة 2: العقود والاتفاقات النموذجية',
      icon: '📜',
      imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1200&auto=format&fit=crop',
      description: 'إتقان صياغة العقود لضمان حقوق الوكيل والزبائن.',
      content: [
        {
          title: 'الساعة 1: عقود الوساطة (Mandats)',
          content: 'الفرق بين العقد الحصري والبسيط.',
          subsections: [
            {
              title: "العقد الحصري (Mandat Exclusif)",
              explanation: "لماذا هو مفتاح النجاح؟ يسمح للوكيل بالاستثمار في الإعلانات دون خوف من المنافسة غير الشريفة."
            }
          ]
        },
        {
          title: 'الساعة 2: وعد بالبيع وعقد البيع الابتدائي',
          content: 'كيفية تدبير "العربون" والشروط الواقفة.',
          subsections: []
        },
        {
          title: 'الساعة 3: عقود الكراء (قانون 67-12)',
          content: 'حماية المالك والمكتري في السكن المهني والسكني.',
          subsections: []
        },
        {
          title: 'الساعة 4: إدارة النزاعات التعاقدية',
          content: 'ماذا نفعل عند تراجع أحد الأطراف؟',
          subsections: []
        }
      ],
      resources: [
        { title: "نموذج عقد حصري 777", type: "PDF", url: "#" }
      ]
    },
    {
      id: 'm3',
      title: 'الوحدة 3: إطلاق المشروع والسمعة',
      icon: '🏗️',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
      description: 'بناء وكالة عقارية قوية من الصفر.',
      content: [
        {
          title: 'الساعة 1: الهيكلة القانونية للوكالة',
          content: 'الاختيار بين SARL AU والمقاول الذاتي.',
          subsections: []
        },
        {
          title: 'الساعة 2: بناء العلامة التجارية الشخصية',
          content: 'كيف تصبح "المرجع" في حيك بمكناس.',
          subsections: []
        },
        {
          title: 'الساعة 3: أدوات العمل الرقمية (CRM)',
          content: 'تنظيم قاعدة بيانات الزبناء والمنتجات.',
          subsections: []
        },
        {
          title: 'الساعة 4: الشبكة المحلية',
          content: 'التعامل مع "العساس" والموثق والبنكي كشركاء.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm4',
      title: 'الوحدة 4: التنقيب وإقناع الملاك',
      icon: '📞',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
      description: 'أسرار الحصول على عقارات بأسعار تنافسية.',
      content: [
        {
          title: 'الساعة 1: تقنية "البيج" (Pige)',
          content: 'الاتصال الهاتفي البارد بالملاك الذين ينشرون إعلاناتهم بأنفسهم.',
          subsections: []
        },
        {
          title: 'الساعة 2: التقييم العقاري المهني',
          content: 'كيف تقنع المالك بالسعر الحقيقي للسوق وليس سعر أحلامه.',
          subsections: []
        },
        {
          title: 'الساعة 3: معالجة الاعتراضات',
          content: 'الرد على: "لا أريد التعامل مع الوكالات" أو "عمولتكم مرتفعة".',
          subsections: []
        },
        {
          title: 'الساعة 4: عرض القيمة 777',
          content: 'لماذا أنت وليس غيرك؟ تقديم خدمات التصوير والماركتينج.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm5',
      title: 'الوحدة 5: التسويق العقاري الحديث',
      icon: '🚀',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
      description: 'جذب الزبناء عبر الأدوات الرقمية المتطورة.',
      content: [
        {
          title: 'الساعة 1: التصوير الاحترافي',
          content: 'أهمية الزوايا والإضاءة في خلق "الرغبة" لدى المشتري.',
          subsections: []
        },
        {
          title: 'الساعة 2: كتابة الإعلانات المؤثرة',
          content: 'استخدام سيكولوجية البيع في وصف العقار.',
          subsections: []
        },
        {
          title: 'الساعة 3: إعلانات الفيسبوك والإنستغرام',
          content: 'استهداف الزبناء المحتملين بدقة (MRE، موظفين، مستثمرين).',
          subsections: []
        },
        {
          title: 'الساعة 4: إدارة الـ Leads',
          content: 'تحويل المكالمة الهاتفية إلى زيارة ميدانية.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm6',
      title: 'الوحدة 6: التفاوض وإتمام المعاملات',
      icon: '🤝',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2959210?q=80&w=1200&auto=format&fit=crop',
      description: 'فن تقريب وجهات النظر وإغلاق الصفقات.',
      content: [
        {
          title: 'الساعة 1: سيكولوجية المشتري',
          content: 'فهم الدوافع الخفية (الاستقرار، الاستثمار، الوجاهة).',
          subsections: []
        },
        {
          title: 'الساعة 2: تقنيات التفاوض المالي',
          content: 'كيف تدافع عن السعر وتصل لحل يرضي الطرفين.',
          subsections: []
        },
        {
          title: 'الساعة 3: مرافقة الزبون للبنك والموثق',
          content: 'دورك كوكيل لا ينتهي عند الزيارة، بل عند تسليم المفاتيح.',
          subsections: []
        },
        {
          title: 'الساعة 4: خدمة ما بعد البيع',
          content: 'تحويل الزبون إلى مصدر للتوصيات (Referral).',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm7',
      title: 'الوحدة 7: الاستثمار والكراء القصير (Airbnb)',
      icon: '🏠',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop',
      description: 'استغلال فرص العائد المرتفع في المدن السياحية ومكناس.',
      content: [
        {
          title: 'الساعة 1: حساب العائد على الاستثمار (ROI)',
          content: 'تحليل الجدوى الاقتصادية لشراء عقار بغرض الكراء.',
          subsections: []
        },
        {
          title: 'الساعة 2: إدارة شقق Airbnb',
          content: 'التجهيز، الاستقبال، والتنظيف (Standard 777).',
          subsections: []
        },
        {
          title: 'الساعة 3: التعامل مع مغاربة العالم (MRE)',
          content: 'فهم احتياجاتهم الخاصة وتوفير خدمات إدارة الأملاك عن بعد.',
          subsections: []
        },
        {
          title: 'الساعة 4: استراتيجيات الـ Off-Market',
          content: 'الحصول على صفقات قبل وصولها للعموم.',
          subsections: []
        }
      ],
      resources: [
        { title: "دليل إدارة Airbnb المغرب", type: "PDF", url: "#" }
      ]
    }
  ],
  fr: [
    {
      id: 'm1',
      title: 'Module 1 : Droit Foncier et Fiscalité',
      icon: '🇲🇦',
      imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
      description: 'Guide complet du système juridique et fiscal marocain appliqué à l\'immobilier.',
      content: [
        {
          title: 'Heure 1 : Le Système d\'Immatriculation (Loi 14-07)',
          content: 'Comprendre les différences entre Titre Foncier, Réquisition et Melkia.',
          subsections: [
            {
              title: "Titre Foncier et Force Probante",
              explanation: "Le Titre Foncier est définitif et inattaquable. À Meknès, la zone Hamria est presque totalement titrée, tandis que la Médina comporte beaucoup de Melkia."
            },
            {
              title: "Étude de cas : Sortie d'indivision",
              explanation: "Comment gérer la vente d'un bien appartenant à 12 héritiers ? Analyse des documents nécessaires (Adoul, acte d'hérédité)."
            }
          ]
        },
        {
          title: 'Heure 2 : Les Professionnels du Droit',
          content: 'Rôles respectifs du Notaire, de l\'Adoul et de l\'Avocat agréé.',
          subsections: [
            {
              title: "Le Notaire et le Séquestre",
              explanation: "Rôle crucial dans la sécurisation des fonds via la CDG. Le Notaire vérifie l'état hypothécaire du bien."
            }
          ]
        },
        {
          title: 'Heure 3 : Fiscalité Immobilière Avancée',
          content: 'Calcul de la TPI, TSC et droits d\'enregistrement.',
          subsections: [
            {
              title: "Simulateur TPI",
              explanation: "Exemple : Achat à 500k MAD, vente à 800k MAD après 4 ans. Calcul des frais d'acquisition forfaitaires et du profit imposable."
            }
          ]
        },
        {
          title: 'Heure 4 : Déontologie et Blanchiment d\'argent',
          content: 'Obligations légales de l\'agent envers l\'ANRF (Loi 43-05).',
          subsections: [
            {
              title: "KYC et Déclaration de soupçon",
              explanation: "Comment identifier ses clients et signaler les transactions atypiques pour éviter les sanctions."
            }
          ]
        }
      ],
      resources: [
        { title: "Barème TPI 2024", type: "PDF", url: "#" },
        { title: "Checklist Conservation", type: "CHECKLIST", url: "#" }
      ]
    },
    {
      id: 'm2',
      title: 'Module 2 : Contrats et Modèles Types',
      icon: '📜',
      imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1200&auto=format&fit=crop',
      description: 'Maîtriser la rédaction contractuelle pour sécuriser vos commissions.',
      content: [
        {
          title: 'Heure 1 : Les Mandats de Courtage',
          content: 'Différence entre mandat simple et exclusif.',
          subsections: [
            {
              title: "L'Exclusivité 777",
              explanation: "Pourquoi l'exclusivité est le seul moyen d'investir massivement en marketing sans risque."
            }
          ]
        },
        {
          title: 'Heure 2 : Compromis et Promesses de vente',
          content: 'Gestion de l\'Arrboun (arrhes) et clauses suspensives.',
          subsections: []
        },
        {
          title: 'Heure 3 : Le Bail d\'Habitation (Loi 67-12)',
          content: 'Sécuriser le bailleur et le preneur.',
          subsections: []
        },
        {
          title: 'Heure 4 : Contentieux Contractuels',
          content: 'Que faire en cas de désistement d\'une partie ?',
          subsections: []
        }
      ],
      resources: [
        { title: "Modèle Mandat Exclusif", type: "PDF", url: "#" }
      ]
    },
    {
      id: 'm3',
      title: 'Module 3 : Projet et Notoriété',
      icon: '🏗️',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
      description: 'Lancer son agence et devenir le référent de son quartier.',
      content: [
        {
          title: 'Heure 1 : Structure Juridique',
          content: 'Choisir entre SARL AU et Auto-entrepreneur.',
          subsections: []
        },
        {
          title: 'Heure 2 : Personal Branding Digital',
          content: 'Construire son autorité sur LinkedIn, Facebook et Instagram.',
          subsections: []
        },
        {
          title: 'Heure 3 : Outils Métiers (CRM)',
          content: 'Gérer sa base de données acquéreurs/vendeurs.',
          subsections: []
        },
        {
          title: 'Heure 4 : Réseau de Partenaires',
          content: 'Collaborer avec les gardiens, syndics et banquiers.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm4',
      title: 'Module 4 : Prospection Propriétaires',
      icon: '📞',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
      description: 'L\'art de convaincre les vendeurs de vous confier leur bien.',
      content: [
        {
          title: 'Heure 1 : La Pige Immobilière',
          content: 'Techniques d\'appels sortants sur les annonces de particuliers.',
          subsections: []
        },
        {
          title: 'Heure 2 : L\'Avis de Valeur Expert',
          content: 'Comment estimer un bien au juste prix du marché.',
          subsections: []
        },
        {
          title: 'Heure 3 : Traitement des Objections',
          content: 'Répondre au "Je vends seul" et aux frais d\'agence.',
          subsections: []
        },
        {
          title: 'Heure 4 : Le Closing Mandat',
          content: 'Signer l\'exclusivité dès le premier rendez-vous.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm5',
      title: 'Module 5 : Marketing Immobilier',
      icon: '🚀',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
      description: 'Générer un flux constant de prospects qualifiés.',
      content: [
        {
          title: 'Heure 1 : Photographie Pro & Vidéo',
          content: 'Créer un impact visuel immédiat.',
          subsections: []
        },
        {
          title: 'Heure 2 : Copywriting d\'Annonce',
          content: 'Rédiger des textes qui vendent le style de vie.',
          subsections: []
        },
        {
          title: 'Heure 3 : Social Ads (Meta)',
          content: 'Ciblage précis des investisseurs et MRE.',
          subsections: []
        },
        {
          title: 'Heure 4 : Lead Management',
          content: 'Qualifier les appels pour ne faire que des visites utiles.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm6',
      title: 'Module 6 : Négociation et Transaction',
      icon: '🤝',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2959210?q=80&w=1200&auto=format&fit=crop',
      description: 'Conclure les ventes et sécuriser le passage chez le notaire.',
      content: [
        {
          title: 'Heure 1 : Psychologie de l\'Acheteur',
          content: 'Identifier les freins et les motivations d\'achat.',
          subsections: []
        },
        {
          title: 'Heure 2 : Techniques de Négociation de Prix',
          content: 'Défendre la valeur du bien et ses honoraires.',
          subsections: []
        },
        {
          title: 'Heure 3 : Accompagnement Notarial',
          content: 'Suivre le dossier jusqu\'à la signature finale.',
          subsections: []
        },
        {
          title: 'Heure 4 : Fidélisation Post-Vente',
          content: 'Transformer un client en ambassadeur.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm7',
      title: 'Module 7 : Investissement et Airbnb',
      icon: '🏠',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop',
      description: 'Exploiter le marché de la courte durée et des investisseurs.',
      content: [
        {
          title: 'Heure 1 : Calcul de Rentabilité (ROI)',
          content: 'Savoir conseiller un investisseur sur son rendement.',
          subsections: []
        },
        {
          title: 'Heure 2 : Gestion Opérationnelle Airbnb',
          content: 'Setup, ménage et accueil voyageurs.',
          subsections: []
        },
        {
          title: 'Heure 3 : Clientèle MRE',
          content: 'Gérer les biens des Marocains du monde à distance.',
          subsections: []
        },
        {
          title: 'Heure 4 : Stratégies Off-Market',
          content: 'Trouver les "pépites" avant tout le monde.',
          subsections: []
        }
      ],
      resources: [
        { title: "Guide Airbnb Maroc", type: "PDF", url: "#" }
      ]
    }
  ],
  en: [
    {
      id: 'm1',
      title: 'Module 1: Real Estate Law and Taxation',
      icon: '🇲🇦',
      imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
      description: 'Comprehensive guide to the Moroccan legal and tax system applied to real estate.',
      content: [
        {
          title: 'Hour 1: The Land Registry System (Law 14-07)',
          content: 'Understanding the differences between Land Title, Requisition, and Traditional Ownership (Melkia).',
          subsections: [
            {
              title: "Land Title and Legal Certainty",
              explanation: "The Land Title is definitive and unchallengeable. In Meknes, the Hamria area is almost entirely registered, while the Medina has many Melkia properties."
            },
            {
              title: "Case Study: Inheritance Sale",
              explanation: "How to handle a sale involving multiple heirs? Analysis of required documents like the deed of heredity."
            }
          ]
        },
        {
          title: 'Hour 2: Legal Professionals',
          content: 'Respective roles of Notaries, Adouls, and certified Lawyers.',
          subsections: [
            {
              title: "The Notary and Escrow",
              explanation: "Crucial role in securing funds via the CDG. The Notary verifies the mortgage status of the property."
            }
          ]
        },
        {
          title: 'Hour 3: Advanced Real Estate Taxation',
          content: 'Calculating TPI, TSC, and registration fees.',
          subsections: [
            {
              title: "TPI Calculator",
              explanation: "Example: Purchase at 500k MAD, sale at 800k MAD after 4 years. Calculating profit tax."
            }
          ]
        },
        {
          title: 'Hour 4: Ethics and Anti-Money Laundering',
          content: 'Legal obligations of the agent toward the ANRF (Law 43-05).',
          subsections: [
            {
              title: "KYC and Suspicious Activity Reports",
              explanation: "How to identify clients and report unusual transactions to avoid sanctions."
            }
          ]
        }
      ],
      resources: [
        { title: "Taxation Guide 2024", type: "PDF", url: "#" },
        { title: "Land Registry Checklist", type: "CHECKLIST", url: "#" }
      ]
    },
    {
      id: 'm2',
      title: 'Module 2: Contracts and Templates',
      icon: '📜',
      imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1200&auto=format&fit=crop',
      description: 'Master legal drafting to secure your commissions.',
      content: [
        {
          title: 'Hour 1: Brokerage Mandates',
          content: 'Difference between simple and exclusive mandates.',
          subsections: []
        },
        {
          title: 'Hour 2: Preliminary Sale Agreements',
          content: 'Managing deposits (Arrboun) and condition precedents.',
          subsections: []
        },
        {
          title: 'Hour 3: Residential Lease (Law 67-12)',
          content: 'Securing the landlord and the tenant.',
          subsections: []
        },
        {
          title: 'Hour 4: Contractual Disputes',
          content: 'What to do when a party withdraws from the deal?',
          subsections: []
        }
      ],
      resources: [
        { title: "Exclusive Mandate Template", type: "PDF", url: "#" }
      ]
    },
    {
      id: 'm3',
      title: 'Module 3: Project and Reputation',
      icon: '🏗️',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
      description: 'Launching your agency and becoming the neighborhood expert.',
      content: [
        {
          title: 'Hour 1: Legal Structure',
          content: 'Choosing between SARL AU and Auto-entrepreneur status.',
          subsections: []
        },
        {
          title: 'Hour 2: Digital Personal Branding',
          content: 'Building authority on LinkedIn, Facebook, and Instagram.',
          subsections: []
        },
        {
          title: 'Hour 3: Professional Tools (CRM)',
          content: 'Managing your buyer/seller database.',
          subsections: []
        },
        {
          title: 'Hour 4: Partner Network',
          content: 'Collaborating with security guards, syndics, and bankers.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm4',
      title: 'Module 4: Owner Prospecting',
      icon: '📞',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
      description: 'The art of convincing sellers to trust you with their property.',
      content: [
        {
          title: 'Hour 1: Cold Prospecting (Pige)',
          content: 'Techniques for outgoing calls on private listings.',
          subsections: []
        },
        {
          title: 'Hour 2: Expert Valuation',
          content: 'How to estimate a property at the right market price.',
          subsections: []
        },
        {
          title: 'Hour 3: Objection Handling',
          content: 'Responding to "I will sell alone" and agency fees concerns.',
          subsections: []
        },
        {
          title: 'Hour 4: Closing the Mandate',
          content: 'Signing exclusivity at the first meeting.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm5',
      title: 'Module 5: Real Estate Marketing',
      icon: '🚀',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
      description: 'Generating a constant flow of qualified prospects.',
      content: [
        {
          title: 'Hour 1: Pro Photography & Video',
          content: 'Creating immediate visual impact.',
          subsections: []
        },
        {
          title: 'Hour 2: Ad Copywriting',
          content: 'Writing texts that sell the lifestyle.',
          subsections: []
        },
        {
          title: 'Hour 3: Social Ads (Meta)',
          content: 'Precise targeting for investors and expats.',
          subsections: []
        },
        {
          title: 'Hour 4: Lead Management',
          content: 'Qualifying calls to only perform useful visits.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm6',
      title: 'Module 6: Negotiation and Transaction',
      icon: '🤝',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2959210?q=80&w=1200&auto=format&fit=crop',
      description: 'Closing sales and securing the notary process.',
      content: [
        {
          title: 'Hour 1: Buyer Psychology',
          content: 'Identifying barriers and buying motivations.',
          subsections: []
        },
        {
          title: 'Hour 2: Price Negotiation Techniques',
          content: 'Defending the property value and agency fees.',
          subsections: []
        },
        {
          title: 'Hour 3: Notary Coordination',
          content: 'Following the case until final signature.',
          subsections: []
        },
        {
          title: 'Hour 4: Post-Sale Retention',
          content: 'Turning a client into an ambassador.',
          subsections: []
        }
      ],
      resources: []
    },
    {
      id: 'm7',
      title: 'Module 7: Investment and Airbnb',
      icon: '🏠',
      imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop',
      description: 'Exploiting the short-term rental market and working with investors.',
      content: [
        {
          title: 'Hour 1: ROI Calculation',
          content: 'Knowing how to advise an investor on yield.',
          subsections: []
        },
        {
          title: 'Hour 2: Airbnb Operational Management',
          content: 'Setup, cleaning, and guest check-in.',
          subsections: []
        },
        {
          title: 'Hour 3: Working with Expats (MRE)',
          content: 'Managing properties for Moroccans abroad remotely.',
          subsections: []
        },
        {
          title: 'Hour 4: Off-Market Strategies',
          content: 'Finding "gems" before everyone else.',
          subsections: []
        }
      ],
      resources: [
        { title: "Morocco Airbnb Guide", type: "PDF", url: "#" }
      ]
    }
  ]
};

export const UI_STRINGS: Record<Language, any> = {
  ar: {
    academy: "الأكاديمية",
    resources: "المصادر والشركاء",
    location: "حمرية - مكناس",
    bannerTitle: "الشبكة رقم 1 لخبراء العقار",
    bannerDesc: "تدرب مع قادة السوق. دورة مدتها 28 ساعة لإتقان الميدان المغربي.",
    progress: "تقدمك الدراسي",
    reset: "إعادة تعيين",
    moduleTitle: "وحدات الإتقان العالي",
    moduleDesc: "وحدات استراتيجية تجمع بين النظرية القانونية وسيكولوجية البيع.",
    completed: "وحدة مكتملة",
    enter: "دخول الدرس",
    testimonials: "شهادات النجاح 777",
    return: "العودة إلى الأكاديمية",
    resourcesExpert: "موارد الخبير",
    download: "تحميل"
  },
  fr: {
    academy: "Académie",
    resources: "Ressources & Partenaires",
    location: "Hamria - Meknès",
    bannerTitle: "Le Réseau N°1 des Experts de l'Immobilier",
    bannerDesc: "Formez-vous avec les leaders du marché. Un cursus de 28 heures pour maîtriser le terrain.",
    progress: "Votre Progression",
    reset: "Réinitialiser",
    moduleTitle: "Modules de Haute Maîtrise",
    moduleDesc: "Des modules stratégiques combinant théorie juridique et psychologie de vente.",
    completed: "Module Terminé",
    enter: "Accéder au cours",
    testimonials: "Témoignages de Réussite 777",
    return: "Retour à l'Académie",
    resourcesExpert: "Ressources de l'Expert",
    download: "Télécharger"
  },
  en: {
    academy: "Academy",
    resources: "Resources & Partners",
    location: "Hamria - Meknes",
    bannerTitle: "The #1 Network for Real Estate Experts",
    bannerDesc: "Train with market leaders. A 28-hour course to master the field.",
    progress: "Your Progress",
    reset: "Reset",
    moduleTitle: "Mastery Modules",
    moduleDesc: "Strategic modules combining legal theory and sales psychology.",
    completed: "Completed",
    enter: "Start Lesson",
    testimonials: "777 Success Stories",
    return: "Back to Academy",
    resourcesExpert: "Expert Resources",
    download: "Download"
  }
};
