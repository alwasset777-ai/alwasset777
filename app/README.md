# Al Wasset 777 — Système de gestion immobilière

Application **local-first** pour l'agence : le Mac est la base de données centrale (SQLite chiffrée), les téléphones et autres ordinateurs s'y appairent par **QR code** et se synchronisent sur le Wi-Fi de l'agence, même sans internet.

| Mac (arabe) | Appareils + QR code | iPhone (PWA) |
|---|---|---|
| ![](docs/screenshots/02-dashboard-ar.png) | ![](docs/screenshots/04-devices-qr.png) | ![](docs/screenshots/05-mobile-dashboard.png) |

## État d'avancement

| Étape | Contenu | État |
|---|---|---|
| **P0 — Socle** | Monorepo, Electron, base chiffrée + migrations + démo, connexion et rôles, i18n ar/fr/en + RTL, thème, écran « Appareils » + QR, synchro LAN, `build:mac` | ✅ |
| M1 Biens | Liste + recherche (lecture) livrées ; création/modification, médias, géolocalisation à venir | 🟡 |
| M2 → M12 | Schéma de base déjà créé pour tous les modules ; écrans à venir, module par module | ⏳ |

## Prérequis

- macOS 12+ (Apple Silicon ou Intel) pour construire le `.dmg`
- Node.js ≥ 22 et npm ≥ 10

## Installation et développement

```bash
cd app
npm install
npm run build -w mobile   # la PWA mobile est servie par le Mac
npm run dev               # lance Vite + Electron avec rechargement à chaud
```

Autres commandes :

```bash
npm test            # 46 tests : calculs financiers, synchro, appairage LAN, chiffrement
npm run typecheck   # TypeScript strict sur les 3 paquets
npm run dev:mobile  # PWA seule sur http://localhost:5174/m/ (proxy /api → Mac)
```

## Construire le .dmg

```bash
cd app
npm run build:mac
# → desktop/release/AlWasset777-0.1.0-arm64.dmg et -x64.dmg
```

- **Sans compte Apple Developer** (configuration actuelle) : le `.dmg` n'est pas signé. Au premier lancement : clic droit sur l'app → **Ouvrir** → **Ouvrir**.
- **Avec un compte Apple Developer** : dans `desktop/electron-builder.yml`, supprimer `identity: null`, passer `notarize: true`, puis définir `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` et `APPLE_TEAM_ID` avant `npm run build:mac`.

Le module SQLCipher est livré précompilé (N-API) pour macOS arm64/x64 : aucune compilation native n'est nécessaire.

## Premier lancement

1. L'écran **« إعداد الوكالة لأول مرة »** demande le nom de l'agence, l'administrateur et son mot de passe.
2. Cocher **« بيانات تجريبية »** pour charger la démo : 10 biens, 10 personnes, 3 contrats avec échéanciers et paiements, et 4 utilisateurs de démo (`manager`, `commercial`, `comptable`, `maintenance`).
3. Les utilisateurs de démo ont le même mot de passe provisoire que l'administrateur et doivent le changer à la première connexion.

## Appairer un téléphone ou un autre ordinateur (QR code)

1. Le Mac et le téléphone sont sur le **même Wi-Fi**.
2. Sur le Mac : **الأجهزة / Appareils** → choisir l'utilisateur → **إنشاء رمز QR**.
3. Scanner avec l'appareil photo du téléphone : l'application s'ouvre et se synchronise. Le QR code est valable 10 minutes et ne sert qu'une fois.
4. Pour « installer » l'app : Safari → Partager → **Sur l'écran d'accueil**.
5. Un appareil perdu se révoque en un clic ; il est alors déconnecté et sa base locale est effacée.

Au premier lancement, macOS demande l'autorisation « réseau local » : il faut l'accepter.

## Où sont les données ? Sauvegarde

| Élément | Emplacement (macOS) |
|---|---|
| Base chiffrée | `~/Library/Application Support/Al Wasset 777/data/alwasset.db` |
| Clé de la base | `…/data/alwasset.key`, elle-même chiffrée par le **Trousseau macOS** |

⚠️ La base n'est lisible qu'avec sa clé, et la clé n'est lisible que sur ce Mac. Copier ces fichiers sur un autre Mac ne suffit **pas** pour restaurer.

La sauvegarde chiffrée automatique et la restauration (export d'une archive protégée par un mot de passe que vous choisissez) arrivent avec le module M6. D'ici là, faire une sauvegarde **Time Machine** complète du Mac.

## Architecture

```
app/
├── shared/              # code commun desktop + mobile
│   ├── src/db/          # pilotes SQLite, migrations (schéma M1→M12), store journalisé
│   ├── src/sync/        # horloge HLC, moteur de fusion champ par champ, protocole
│   ├── src/finance/     # montants en centimes, échéanciers, imputation, pénalités, CGNC
│   ├── src/auth/        # rôles et permissions
│   ├── src/services/    # setup, démo, tableau de bord, biens…
│   ├── src/i18n/        # ar (par défaut), fr, en
│   └── src/ui/          # interface React + Tailwind (RTL, thème blanc/rouge)
├── desktop/             # Electron : base SQLCipher, IPC, serveur LAN, packaging .dmg
└── mobile/              # PWA : même schéma sur sql.js (WebAssembly) + IndexedDB
```

### Synchronisation

- Toute écriture passe par `shared/src/db/store.ts`, qui journalise chaque champ modifié avec un horodatage **HLC** dans `change_log`.
- Les appareils envoient leurs changements au Mac (`/api/sync/push`) et récupèrent ceux des autres (`/api/sync/pull`).
- **Règle de conflit :** pour chaque champ, la modification la plus récente l'emporte. Deux personnes qui modifient deux champs différents d'une même fiche ne se gênent pas.
- **Sécurité :**
  - les mots de passe ne quittent jamais le Mac ;
  - chaque changement reçu est vérifié contre les droits du rôle de l'appareil (un commercial ne peut pas modifier les utilisateurs) ;
  - chaque appareil a un secret unique, révocable.

### Choix techniques notables

| Choix | Raison |
|---|---|
| Electron (plutôt que Tauri) | SQLCipher natif et Chromium intégré (PDF arabes corrects) |
| sql.js sur mobile (plutôt que Dexie) | Même schéma SQL et mêmes services partout ; stocké dans IndexedDB |
| Montants en centimes (entiers) | Aucune erreur d'arrondi |
| Comptabilité en partie double (CGNC) | Écritures automatiques à chaque paiement. Les loyers des biens de mandants sont crédités au compte de tiers 4487 ; seule la commission est un produit de l'agence |

## Limites connues de P0

- **iPhone hors de l'agence :** le téléphone ne se synchronise que sur le Wi-Fi de l'agence. Le relais internet chiffré (Supabase) sera ajouté ensuite ; les données locales restent consultables hors ligne.
- **Mode hors ligne sur iPhone :** servie en `http://` depuis le Mac, la PWA ne peut pas activer son service worker. Une fois le relais en place, elle sera aussi publiée en HTTPS (installable et 100 % hors ligne).
- **Copie des données :** chaque appareil appairé reçoit toutes les données, sauf les mots de passe. Un filtrage par rôle (par exemple la comptabilité masquée aux commerciaux sur mobile) est prévu.
- **Modules M1 à M12 :** leurs écrans de création/modification arrivent module par module.
