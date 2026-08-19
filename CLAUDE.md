# CLAUDE.md — SnapLover

## What this is
SnapLover (nom de code technique/dossier : `snaproom`, voir note de nommage plus bas) est une app
web où deux personnes à distance rejoignent une room, activent leur caméra, et prennent une bande
photo ensemble via un compte à rebours synchronisé (WebRTC P2P) — faites une bande photo ensemble,
même à distance. Aucun compte requis. Une version de base est gratuite, et le cœur technique est
open source, FR-first. Spécification complète : `docs/SNAPROOM-SPEC.md`.

**Positionnement** : ne jamais présenter SnapLover principalement comme "gratuit et open source" —
ce n'est pas la promesse centrale. Message principal : "Faites une bande photo ensemble, même à
distance." Message secondaire seulement : "Une version de base est gratuite, et le cœur technique
est open source." (La stratégie produit/growth/monétisation détaillée vit dans le repo privé
`snaplover-private`, pas ici.)

**Nommage** : le produit s'appelle **SnapLover** (marque affichée partout dans l'UI — logo,
titres, footer de la bande composée). Le nom de code technique reste `snaproom`/`SnapRoom` dans
certains chemins et docs historiques déjà existants (`docs/SNAPROOM-SPEC.md`, `snaproom-spike/`,
`docs/design/snaproom-*.dc.html`, le dossier racine du repo) — ne pas les renommer, seulement le
texte visible par l'utilisateur et les identifiants neufs. Le repo GitHub est `Pikatchu99/snaplover`.

**Statut** : faisabilité technique validée par un spike (`snaproom-spike/`, ne pas déployer,
référence pour l'algorithme temps réel — voir docs/SNAPROOM-SPEC.md §19).

**Modèle de diffusion** : projet **open source**, mais **auto-hébergé** par l'auteur (VPS perso —
pas de service tiers géré). Ce n'est pas un simple repo public jetable : le repo public EST
l'infra en prod. Voir §"Open source & auto-hébergement" ci-dessous avant tout push public.

## Technical stack
- **Language** : TypeScript strict (pas de `any` non justifié)
- **Frontend/Fullstack** : Next.js (App Router) + React 19, dans `web/`
- **Signaling** : service Node séparé (`ws`), dans `signaling/` — WebSocket uniquement, Vercel ne
  gère pas les WS persistants donc ce service se déploie sur un host/VPS distinct
- **Styling** : Tailwind CSS v4, mobile-first
- **Composants** : shadcn/ui (Radix, preset Nova) — jamais `alert()`/`confirm()`/`prompt()` natifs
- **Data fetching REST** : TanStack Query (rare : ex. `/api/turn-credentials`)
- **Animations** : Framer Motion, sobres (150–300 ms, ease-out)
- **Icônes** : Lucide — jamais d'emoji dans l'UI
- **Temps réel** : WebRTC natif (vidéo P2P + data channel), STUN Google + TURN via env
- **Persistance** : aucune BDD au MVP — rooms éphémères en mémoire côté `signaling/`
- **Package manager** : pnpm, workspace racine (`web` + `signaling`)
- **Hosting** : `web/` sur Vercel (SSR) ; `signaling/` sur VPS (WSS)

## Directory structure
```
snaproom/
├─ web/                         # Next.js (App Router)
│  ├─ src/app/
│  │  ├─ page.tsx               # Landing (SSR)
│  │  ├─ create/page.tsx        # Créer une room
│  │  ├─ join/page.tsx          # Rejoindre
│  │  ├─ r/[code]/page.tsx      # Room : lobby → capture → résultat
│  │  └─ api/turn-credentials/route.ts
│  ├─ src/components/
│  │  ├─ ui/                    # shadcn
│  │  ├─ providers/             # QueryProvider (TanStack Query)
│  │  ├─ room/                  # RoomClient, Lobby, CameraTile, Countdown, CaptureStage
│  │  ├─ strip/                 # PhotoStrip, Frame, composer
│  │  └─ landing/
│  ├─ src/hooks/                # use-user-media, use-room-connection, use-capture-session
│  ├─ src/i18n/
│  │  └─ messages.ts            # tous les textes UI (fr) — voir "i18n" ci-dessous
│  ├─ src/lib/
│  │  ├─ config.ts               # constantes tunables centralisées (jamais éparpillées)
│  │  ├─ webrtc/                # peer-connection, use-ice-servers, turn-credentials
│  │  ├─ signaling/             # client WS
│  │  ├─ realtime/              # clock-sync, capture scheduling
│  │  ├─ capture/               # capture-frame, compose-strip, filters, image-transfer
│  │  ├─ frames/                # registre des cadres (config pure, pas de labels)
│  │  ├─ room-code.ts           # génération/validation du code de room
│  │  └─ room-config.ts         # parse la config room (poses/cadre/style) depuis l'URL
│  └─ src/types/                # types partagés (jamais inline)
├─ signaling/                   # service Node WebSocket
│  ├─ src/server.ts
│  └─ src/types.ts
├─ e2e/                         # tests de régression bout en bout (Playwright)
│  ├─ playwright.config.ts      # lance web+signaling sur des ports dédiés (3100/8090)
│  └─ tests/                    # happy-path, room-full, invalid-room, reconnect
├─ snaproom-spike/               # spike de faisabilité (référence, ne pas déployer)
├─ docs/
│  ├─ SNAPROOM-SPEC.md          # spec produit/technique de référence
│  └─ design/                   # maquettes Pencil (.dc.html) — rendu exact des écrans
│     └─ previews/              # captures des packs de cadres
└─ pnpm-workspace.yaml
```

## Key commands
```bash
# Install (racine du workspace)
pnpm install

# Dev
cd web && pnpm dev          # http://localhost:3000
cd signaling && pnpm dev    # ws://localhost:8080

# Build
cd web && pnpm build
cd signaling && pnpm build

# Ajouter un composant shadcn
cd web && pnpm dlx shadcn@latest add <component>

# Tests de régression bout en bout (voir "Tests" ci-dessous)
cd e2e && pnpm test
```

## Tests
Suite Playwright dans `e2e/` — régression bout en bout, pas des tests unitaires. `playwright.config.ts`
démarre lui-même `web` (port 3100) et `signaling` (port 8090) — **ports dédiés, différents du dev
quotidien (3000/8080)** pour ne jamais entrer en collision avec un `pnpm dev` déjà lancé à côté.
Navigateurs headless avec caméra/micro factices (`--use-fake-device-for-media-stream`), `workers: 1`
(les tests partagent les mêmes serveurs et font de la vraie synchro WebRTC temps réel — plusieurs
navigateurs concurrents rendaient les délais flaky, priorité à la fiabilité sur la vitesse).
- `tests/happy-path.spec.ts` : connexion 2 pairs → séance complète → composition → changement de
  filtre → Reprendre.
- `tests/room-full.spec.ts` / `tests/invalid-room.spec.ts` : états "room pleine" / "lien invalide"
  (§12) avec leurs CTA.
- `tests/reconnect.spec.ts` : coupure brutale d'un pair en pleine séance (ferme son `BrowserContext`,
  pas juste sa page) → overlay "on attend Partenaire" → reconnexion (nouveau contexte, même code de
  room) → reprise complète et bande composée des deux côtés.
- `tests/participant-names.spec.ts` : prénoms saisis sur `/create`/`/join` → vérifie que le lien
  copié ne contient jamais le prénom de l'hôte → séance complète des deux côtés.
- **Piège Turbopack** : `webServer` utilisait d'abord un simple check TCP (`port:`), qui considère le
  serveur prêt dès que Next écoute — mais Turbopack compile chaque route à la demande, donc la toute
  première navigation vers `/r/[code]` tombait parfois sur un vrai 404 le temps que la route finisse
  de compiler. Fix : `url: http://localhost:3100/r/WARMUP` à la place de `port:`, qui force Playwright
  à attendre une vraie réponse HTTP sur cette route précise avant de démarrer les tests.
- **Un vrai bug de course trouvé en écrivant `reconnect.spec.ts`** : la reprise d'une pose suspendue
  se déclenchait sur `channel.onOpen` côté hôte (dès que **son propre** data channel s'ouvre), sans
  garantie que le listener du partenaire (une instance React toute neuve après la coupure) soit déjà
  attaché à ce moment précis — recréait exactement la course que le handshake `hello`/`config`
  existant avait été conçu pour éviter au tout premier lancement de séance. Fix dans
  `use-capture-session.ts` : la reprise se déclenche maintenant dans le handler du message `hello`
  (preuve que le partenaire écoute) au lieu de `channel.onOpen`.
- Installation du navigateur Chromium de Playwright : si `pnpm exec playwright install` semble ne
  rien faire, vérifier que la commande n'est pas interceptée par un hook shell (ex. `rtk`) qui avale
  sa sortie — lancer depuis `e2e/` (pas `web/`, la résolution du binaire diffère selon le package) et
  laisser tourner, ou télécharger le zip via navigateur (souvent bien plus rapide qu'en CLI) et
  l'extraire à la main dans `~/Library/Caches/ms-playwright/` — dans ce cas, ne pas oublier
  `xattr -rd com.apple.quarantine` sur le binaire extrait (macOS Gatekeeper bloque sinon
  silencieusement son exécution, contrairement à l'installeur officiel qui gère ça lui-même).

## Conventions
- **TypeScript strict**, types dans `src/types/`, jamais éparpillés/inline.
- **TanStack Query** pour toute requête REST (queryKeys en tableau, invalidation ciblée).
- **Jamais** `alert()`/`confirm()`/`prompt()` → composants shadcn (Dialog/AlertDialog/Alert).
- **Jamais d'emoji** dans l'UI/titres/boutons → icônes Lucide.
- Animations Framer Motion sobres, uniquement si feedback UX réel — pas d'animation gadget.
- Mobile-first, responsive ascendant, accessibilité (aria, HTML sémantique).
- Nommage : composants PascalCase, hooks `useXxx`, dossiers kebab-case, constantes SCREAMING_SNAKE_CASE.
- Sécurité : validation zod des entrées API, aucun secret dans le client/repo (creds TURN via
  `/api/turn-credentials` uniquement — voir docs/SNAPROOM-SPEC.md §11), permissions vérifiées.
- Traiter **tous** les états UI : loading / empty / error / success (voir docs/SNAPROOM-SPEC.md §12).

### Aucune valeur d'infra en dur — toujours via env
**Règle absolue, à ne jamais transgresser** : toute valeur qui peut varier selon l'environnement
ou le déploiement (URL de serveur — STUN, TURN, signaling —, hostname, port, origine autorisée,
credentials, clé/API key) **doit** venir d'une variable d'env, jamais écrite en dur dans un
fichier source. Ça inclut les valeurs "publiques"/non-secrètes comme les URLs STUN Google : ce
n'est pas une question de confidentialité mais de configurabilité par déploiement.
- Si une valeur d'env est absente, **avertir** (`console.warn`) plutôt que de retomber
  silencieusement sur une valeur codée en dur (voir `signaling/src/server.ts` pour
  `ALLOWED_ORIGIN`, `web/src/lib/webrtc/turn-credentials.ts` pour `STUN_URLS`/`TURN_URLS`).
- Toute nouvelle variable d'env doit être documentée dans le `.env.example` correspondant
  (`web/.env.example` ou `signaling/.env.example`), avec un commentaire expliquant son rôle.
- **Ce qui N'EST PAS concerné** (pas besoin d'env, c'est le comportement attendu) : tokens de
  design (couleurs, polices — §13), constantes d'algorithme/produit qui ne varient jamais selon
  l'environnement (délai de déclenchement, tailles de cellule de la bande, nombre de poses
  proposées — toutes centralisées dans `web/src/lib/config.ts`, jamais éparpillées fichier par
  fichier). La distinction : "est-ce que ça peut légitimement changer entre deux déploiements/
  environnements de ce projet ?" — si oui, env ; si non, constante dans `config.ts`.
- **Seule exception tolérée** : une valeur que le process **doit** avoir pour démarrer (ex : le
  port d'écoute d'un serveur — `signaling/src/server.ts` `PORT`) peut garder un fallback en dur,
  mais doit toujours `console.warn` quand elle bascule dessus (jamais un fallback silencieux).
- **Vérification systématique** : à la fin de chaque passe de code (avant de commit), relancer un
  passage dédié (agent ou revue manuelle) qui grep les fichiers modifiés pour des URLs/hostnames/
  ports en dur (`http://`, `https://`, `ws://`, `wss://`, `stun:`, `turn:`, IPs, noms de domaine)
  hors fichiers `.env.example`/documentation, et confirme qu'ils sont bien lus depuis `process.env`.
  Ne pas se fier à un seul run manuel : ça doit être un réflexe systématique, pas ponctuel.
- Le code prouvé du spike (clock-sync, scheduling de capture, composition) doit être **réutilisé
  et durci**, pas réinventé (docs/SNAPROOM-SPEC.md §9, §10, §19).

## Conventions de commit
- **Conventional Commits avec scope métier** : `feat(room): ...`, `fix(signaling): ...`,
  `chore(web): ...`, `refactor(capture): ...`, `docs(spec): ...`. Scopes = dossier ou domaine
  concerné (`room`, `signaling`, `capture`, `strip`, `webrtc`, `design`, `web`, `spec`...).
- **Standardiser dès le premier commit** — ne jamais mixer avec un style bracket (`[INIT]`,
  `[ADD]`) ou des messages libres non conventionnels dans ce repo.
- **Ne jamais s'ajouter comme co-auteur ou contributeur** dans les commits (pas de trailer
  `Co-Authored-By: Claude ...` ni équivalent) — cette règle s'applique à **tous** les commits de
  ce repo, y compris ceux générés par un assistant IA.
- Toujours committer le lockfile (`pnpm-lock.yaml`) après un `pnpm install` — ne jamais mixer les
  package managers sur ce repo (pnpm uniquement).
- Un commit = un changement cohérent. Pas de commit "wip"/"fix" vague sur les branches partagées.

## Checklist sécurité (OWASP) — à chaque passe de code
À revalider systématiquement avant de considérer une modification terminée, pas seulement en fin
de projet :
1. **Injection** : entrées utilisateur (code room, query params, body API) validées avec zod côté
   serveur, jamais de concaténation brute dans une commande/requête.
2. **Auth/contrôle d'accès cassé** : capacité de room stricte à 2 vérifiée côté `signaling/`
   (jamais seulement côté client) ; aucune route API n'expose de données au-delà de son besoin.
3. **Exposition de données sensibles** : aucun secret (TURN_SECRET, TURN_CREDENTIAL...) dans le
   bundle client, les logs, ou une réponse API — uniquement via `/api/turn-credentials` côté
   serveur (voir docs/SNAPROOM-SPEC.md §11).
4. **Configuration de sécurité** : `ALLOWED_ORIGIN` vérifié en prod sur `signaling/` (jamais
   `*`/désactivé hors dev local) ; headers/CORS cohérents entre `web/` et `signaling/`.
5. **XSS** : jamais de `dangerouslySetInnerHTML` sur du contenu non maîtrisé ; toute donnée
   affichée (prénom, code room) traitée comme non fiable côté rendu.
6. **Composants vulnérables** : pas de dépendance ajoutée sans vérifier son entretien/CVEs connues
   (`pnpm audit` avant de merger une dépendance nouvelle ou mise à jour majeure).
7. **Journalisation/monitoring** : pas de PII ni de secret dans les logs (`console.log` de debug à
   retirer avant merge) ; erreurs serveur loguées sans fuiter la stack au client.
8. **DoS/abus** : toute limite déjà en place (`MAX_ROOMS`, TTL room orpheline, heartbeat) reste
   respectée quand on touche `signaling/` — ne pas la contourner "pour tester".

## Open source & auto-hébergement
Ce repo est destiné à être public **et** à tourner en prod sur l'infra perso de l'auteur (pas un
service géré tiers). Le repo public EST directement l'infra en prod — donc plus strict qu'un
simple "scrub avant de rendre public" :
- **Aucun secret en dur, jamais** — tout passe par variables d'env (`.env`, jamais committé,
  `.env.example` documente les clés sans valeurs). Ça inclut les creds TURN, tout token futur,
  toute URL d'infra privée (VPS, domaines internes, IP).
- **Avant tout premier push public** : `git ls-files --cached | xargs grep -lE '<patterns
  sensibles>'` (clés API, tokens, IP internes, `TURN_SECRET=`, etc.) — stop si match.
- Si un secret finit par fuiter dans un commit poussé publiquement : **le considérer compromis et
  le faire tourner immédiatement** (rotation) — un nettoyage d'historique après coup n'annule pas
  l'exposition déjà survenue.
- **Licence** : à trancher avant le premier push public (par défaut, AGPL-3.0 est cohérent pour un
  service que l'auteur exploite lui-même — empêche un fork fermé/concurrent ; à confirmer avec
  l'auteur avant d'ajouter le fichier `LICENSE`).
- Pas de docs de stratégie business/growth ni de captures d'écran perso dans le repo public.

## Déploiement
Voir `docs/DEPLOY.md` pour la procédure complète, étape par étape, et `docs/PREVIEW.md` pour les
previews par PR (une URL de test par PR ouverte, `pr-<N>.snaplover-preview.hbdwall.xyz`, avant de
merger — Traefik + sous-domaine wildcard sur le même VPS, complètement séparé de la prod). Résumé
de l'archi : **tout sur un seul VPS** (l'auteur a pointé le domaine dessus dès le départ, pas de
Vercel) :
- **`web/`** ET **`signaling/`** tournent chacun dans un conteneur Docker sur le même VPS, bindés
  uniquement sur `127.0.0.1` — **zéro port entrant ouvert**. `web/` utilise la sortie `standalone`
  de Next.js (`next.config.ts` : `output: "standalone"` + `outputFileTracingRoot` fixé à la racine
  du monorepo — sans ça le build imbriquait `.next/standalone` sous le chemin absolu complet de la
  machine, cassé une fois en conteneur). Domaines : `snaplover.hbdwall.xyz` (web),
  `snaplover-signaling.hbdwall.xyz` (signaling), même zone Cloudflare.
- Exposition via **Cloudflare Tunnel** (`cloudflared`, service système sur le VPS, hors Docker) — le
  VPS se connecte lui-même en sortant vers Cloudflare, qui gère le TLS et route les deux domaines
  vers les bons ports locaux (`deploy/cloudflared/config.yml.example`, un seul tunnel, deux règles
  d'ingress).
- CI/CD : deux workflows GitHub Actions (`.github/workflows/deploy-web.yml`,
  `deploy-signaling.yml`), déclenchés indépendamment selon les chemins modifiés. Chacun build son
  image Docker (`web/Dockerfile` ou `signaling/Dockerfile`, multi-stage, utilisateur non-root,
  `signaling/` via `pnpm deploy --legacy` pour un artefact de prod isolé sans deps des packages
  voisins du workspace), la pousse sur GHCR (`ghcr.io/pikatchu99/snaplover/{web,signaling}`), puis
  SSH sur le VPS avec une clé de déploiement dédiée (jamais la clé perso de l'auteur) pour
  `docker compose pull <service> && up -d <service>` (`deploy/docker-compose.yml`, un seul fichier
  pour les deux services).
- **Piège build-arg vs runtime** : les variables `NEXT_PUBLIC_*` (URL site/signaling/Umami) sont
  figées dans le bundle client par Next.js **au build**, pas à l'exécution — elles passent donc en
  `--build-arg` dans le workflow (secrets GitHub — non sensibles par construction, mais stockées là
  pour tout centraliser au même endroit), jamais en variable d'env runtime seule. Les variables
  serveur (`STUN_URLS`, `TURN_*`, `ALLOWED_ORIGIN`) restent runtime-only (`deploy/web.env`/
  `deploy/signaling.env` sur le VPS, jamais dans l'image).
- Le bootstrap initial (Docker/cloudflared, utilisateur de déploiement dédié, clé SSH, tunnel
  Cloudflare, secrets/variables GitHub) est manuel et unique — voir `docs/DEPLOY.md` pour les 9
  étapes exactes dans l'ordre — après quoi chaque push sur `main` redéploie le service concerné
  automatiquement, sans intervention.

## Design system
- Voir docs/SNAPROOM-SPEC.md §13. Couleurs : `--ink #1c1712`, `--paper #fbf7f1`, `--muted #8c8378`,
  `--line #ece4d8`, `--coral #fb5a46`, `--coral2 #ff7d54`, `--violet #6a48f4`, `--dark #161319`.
  Typo : titres Bricolage Grotesque (700/800), corps Plus Jakarta Sans. Écran de capture en sombre.
- Maquettes de référence (rendu exact) dans `docs/design/*.dc.html` : design-system, wireframes,
  snaproom-hifi, snaproom-session, snaproom-etats.
- **Passe de fidélité design faite.** Note technique : `docs/design/*.dc.html` ne sont **pas** des
  fichiers `.pen` (les outils MCP `pencil` ne s'y connectent pas — document vide à l'ouverture).
  Ce sont des pages HTML autonomes ("créées avec Claude Design"/dc-runtime) : on les inspecte en
  les servant en local (`python3 -m http.server` depuis `docs/design/`) et en les capturant via
  Chrome headless + CDP (`Page.captureScreenshot`), pas via les tools `pencil`.
- Écrans alignés sur `snaproom-hifi.dc.html` (landing/join/create) et `snaproom-session.dc.html`
  (lobby/séance/résultat) : landing et résultat en fond **clair** (paper), lobby/séance en fond
  **sombre** (dark) ; `CameraTile` = dot de statut en haut à droite + pill de nom en bas à gauche
  (pas de badge icône+texte) ; bouton "Rejoindre" en **violet** (le violet marque le chemin
  "rejoindre", le corail l'action primaire) ; boutons à coins arrondis 16-18px, jamais `rounded-full`
  pilule sauf les chips/tags. Écran Créer une room : aperçu live de la bande (`RoomPreview`,
  réagit à poses/style/cadre) ajouté sur demande explicite, avant même la construction du J5.
- `StripPreview` (landing) accepte une prop `images` (paires par case, hôte/invité) pour de vraies
  photos plus tard — tant qu'aucune image n'est fournie, retombe sur des aplats de couleur.
- **Logo** : mark "the strip" — 3 barres empilées (corail/violet/corail2) dans une tuile blanche
  arrondie, **toute la tuile inclinée -6deg** (pas juste les barres individuellement). Favicon
  généré à partir du même mark via `app/icon.tsx`/`app/apple-icon.tsx` (`ImageResponse` de
  `next/og`, style inline `rotate(-6deg)` car rendu par Satori, pas du vrai CSS).
- **12 photos réelles** (animaux, choisies pour éviter tout droit à l'image de vraies personnes)
  câblées dans `web/public/preview/photo-01..12.jpeg`, 6 par bande décorative (`STRIP_A_IMAGES`/
  `STRIP_B_IMAGES` dans `app/page.tsx`). Sources brutes dans `/images/` à la racine, gitignore.
- **Landing responsive** : breakpoint `md` (au lieu de `lg`) pour mieux remplir le laptop ;
  `create/page.tsx` en grille 2 colonnes sur `md:` (aperçu sticky à gauche, config à droite).
- **Animation hero** (`HeroStrips.tsx`) : countdown 3·2·1 (450ms/étape) puis apparition en cascade
  des cases de chaque bande (Framer Motion, stagger ~120ms). Les deux bandes (avant + arrière,
  inclinées, superposées) doivent rester **toutes les deux visibles** ; bug corrigé : un `-z-10`
  sur la bande arrière la faisait passer sous le fond opaque de la page faute de stacking context
  sur le parent — fix : ordre DOM (arrière avant, avant après) + `isolate` sur le conteneur parent,
  sans z-index négatif.
- **Cadres étendus à 9** (`classic, noir, film, pop, kraft, vintage, gingham, checkers, denim`) —
  tous procéduraux (`FrameDefinition.paint(ctx, width, height, margin)` en Canvas 2D, pas
  d'assets image), voir `web/src/lib/frames/paint.ts`. `film` dessine de vraies perforations façon
  35mm le long des bords. Packs illustrés (cerise, cœurs, etc.) différés — demandent de vrais
  assets graphiques non fournis à ce jour.

## SEO & copy
- Passe de refonte copy déjà faite (landing passée d'une copy fonctionnelle "room"/mécanique WebRTC
  à une promesse claire de photobooth en ligne à deux) — l'audit détaillé et les recommandations de
  positionnement/growth vivent désormais dans le repo privé `snaplover-private`, pas ici.
- Les textes visibles restent centralisés dans `web/src/i18n/messages/{fr,en}.ts`. Ne pas disperser
  de nouvelles chaînes dans les composants.
- Ne jamais indexer les rooms privées `/r/[code]` : elles restent hors sitemap, bloquées par
  `robots.ts`, et en `noindex`.

## i18n (next-intl, fr + en)
Deux locales : `fr` (défaut, aucun préfixe d'URL — les liens déjà indexés/partagés ne changent
pas) et `en` (préfixe `/en`), voir `web/src/i18n/routing.ts` (`localePrefix: "as-needed"`).
- **Tous** les textes visibles par l'utilisateur vivent dans `web/src/i18n/messages/{fr,en}.ts`
  (même arborescence de clés dans les deux fichiers), jamais en dur dans un composant/hook/page.
  Composants client : `useTranslations("namespace")` puis `t("clé")` (voir n'importe quel
  composant sous `components/`). Server Components/metadata : `getTranslations({ locale, ... })`
  (voir `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`). Valeurs paramétrées en format ICU
  (`"Pose {current} / {total}"`, appelé `t("pose", { current, total })`) — jamais de fonction JS
  comme valeur de message (next-intl ne les supporte pas).
- Navigation interne : toujours `Link`/`redirect`/`useRouter`/`usePathname`/`getPathname` depuis
  `@/i18n/navigation` (jamais `next/link`/`next/navigation` bruts) — ils gèrent seuls le préfixe
  `/en` selon la locale courante.
- Détection de langue : middleware (`web/src/proxy.ts`, via `next-intl/middleware`) lit
  `Accept-Language` au premier chargement. Switch manuel en haut de chaque page
  (`components/layout/LanguageSwitcher.tsx`), change la locale sans perdre la page courante.
- Les registres de config (frames, filtres) ne contiennent **jamais** de label affiché — juste des
  IDs et de la config visuelle pure (couleurs, CSS). Le mapping ID → label affiché vit dans les
  dictionnaires (`frames`, `photoStrip.filters`), résolu au niveau du composant.
- `compose-strip.ts` (dessin canvas du footer de la bande) ne connaît pas la locale — l'appelant
  (`use-capture-session.ts`/`PhotoStrip.tsx`) lui passe un `footerText` déjà traduit et formaté
  (voir `lib/capture/format-footer-date.ts` pour le formatage de date par locale).
- Routes sous `app/[locale]/...` (localisées) ; `api/`, `icon.tsx`/`apple-icon.tsx`, `robots.ts`,
  `sitemap.ts` restent hors `[locale]` (pas de contenu textuel par langue). `opengraph-image.tsx`/
  `twitter-image.tsx` sont sous `[locale]` (aperçu de partage traduit).
- e2e (Playwright) : `locale: "fr-FR"` fixé dans `playwright.config.ts` — sans ça Chromium envoie
  un `Accept-Language` par défaut (souvent `en-US`), le middleware sert l'anglais, et tous les
  tests qui vérifient du texte français échouent silencieusement (piège rencontré en migrant).

## Séquencement du build
Voir docs/SNAPROOM-SPEC.md §17 pour les jalons J1–J6.
- **J1 (fondations)** fait : scaffold web/ + signaling/, endpoint turn-credentials, signaling
  testé bout en bout (join/peer-ready/signal).
- **J2 (cœur temps réel)** fait : client signaling (`lib/signaling/client.ts`), établissement
  WebRTC (`lib/webrtc/peer-connection.ts`, offer/answer/ICE + data channel `ctrl`), route
  `r/[code]` avec lobby (caméra locale + distante, états ready/connecting/off, room-full,
  invalid-room, camera-denied). Vérifié bout en bout : 2 onglets Chrome headless (caméra fake),
  connexion `connected` des deux côtés, flux vidéo réciproques confirmés.
- **J3 (la séance)** fait : clock-sync ping/pong (`lib/realtime/clock-sync.ts`), déclenchement
  synchronisé multi-poses (`lib/realtime/schedule-capture.ts`), capture locale
  (`lib/capture/capture-frame.ts` + `wait-for-video-ready.ts`), échange chunké
  (`lib/capture/image-transfer.ts`), composition de la bande (`lib/capture/compose-strip.ts`),
  orchestration dans `hooks/use-capture-session.ts`, UI `CaptureStage`/`Countdown`/`PhotoStrip`.
  Vérifié bout en bout : 2 onglets Chrome headless, bande complète 3 poses composée des deux
  côtés, écarts de synchro observés 11-30ms (seuil spec : <150ms).
- **J4 (le livrable)** fait : registre de cadres (`lib/frames/frame-registry.ts` — Classic/Noir/
  Film ; packs illustrés hearts/cherry/gingham/tulips/denim/meadow **pas encore implémentés**,
  faute d'assets réels dans le repo — structure prête à les accueillir), filtres Classic/N&B/Chaud
  (`lib/capture/filters.ts`, appliqués via `ctx.filter` à la composition pour un rendu identique
  aperçu/export), `compose-strip.ts` étendu (marges, footer "SNAPLOVER · DATE · À DEUX"), écran
  résultat (`PhotoStrip.tsx` : filtres, Télécharger PNG, Partager via Web Share API avec fallback
  téléchargement, Reprendre), message realtime `reset` pour resynchroniser les deux pairs sur
  "Reprendre". Vérifié bout en bout : bande composée des deux côtés, changement de filtre
  effectif sans erreur, Reprendre renvoie les deux pairs en salle d'attente en synchro.
- **Hors jalons, ajouté sur demande explicite** : pages E1 (landing, `app/page.tsx`), E2 (rejoindre,
  `app/join/page.tsx`), E3 (créer une room, `app/create/page.tsx`, poses/style/cadre encodés dans
  l'URL de la room — voir `lib/room-config.ts`). Config room diffusée par l'hôte à la connexion
  (protocole `hello`/`config` sur le data channel, voir `use-capture-session.ts`) : l'hôte fait
  autorité même si l'invité arrive via un code saisi sans les query params. Corrections faites en
  route : STUN/signaling URL en dur retirés (voir règle "Aucune valeur d'infra en dur" ci-dessus),
  et un vrai bug de closure React corrigé — le dispatcher du data channel est câblé une seule fois
  (l'effet ne dépend que de `[dataChannel, isInitiator]`), donc toute valeur qui change après coup
  (la config reçue de l'hôte) doit être lue via une **ref**, pas une variable de state fermée par
  la closure du dispatcher, sous peine de rester bloqué sur sa valeur initiale indéfiniment.
- **J5 (États & robustesse)** fait, les 7 états obligatoires de §12 :
  1. **Caméra bloquée** : `use-user-media.ts` expose `retry()` (relance `getUserMedia` via un
     compteur `attempt` en dep d'effet) ; `Lobby.tsx` ajoute l'explication "Comment autoriser" +
     bouton Réessayer.
  2. **Réseau faible** : nouveau statut `RoomConnectionStatus` `"reconnecting"` — mappé depuis
     `RTCPeerConnectionState === "disconnected"` (transitoire, l'ICE peut se rétablir seul, voir
     `use-room-connection.ts`), badge "Signal faible" dans `Lobby.tsx`. `"failed"`/`"closed"`
     restent mappés sur `"waiting-for-peer"` (rupture définitive).
  3. **Countdown suspendu** / 4. **Partenaire déconnecté** : même mécanisme dans
     `use-capture-session.ts` — `awaitingPeer` (+ `pendingPoseRef`) passe à `true` dès que
     `triggerCapture` ne trouve pas de data channel prêt, ou dès que `dataChannel` redevient `null`
     en cours de séance (effet dédié). Toute moitié de pose déjà capturée mais dont la moitié du
     partenaire n'est jamais arrivée est **invalidée** à la détection de la coupure (sinon on reste
     bloqué à vie à attendre une donnée qui ne viendra jamais) ; à la reconnexion, le message
     `hello` (preuve que le partenaire écoute — voir plus bas, pas `channel.onOpen` qui ne garantit
     rien côté partenaire) relance automatiquement `triggerCapture(pendingPoseRef.current)` côté
     hôte — la pose reprend entièrement à zéro pour les deux pairs. `CaptureStage.tsx` affiche le
     bon message ("on attend
     Partenaire" tant qu'aucune pose n'est faite, "Partenaire déconnecté·e" + bouton "Renvoyer le
     lien" sinon) selon `currentPose > 0`.
  5. **Lien introuvable/expiré** : en plus du cas déjà géré (code hors regex, `MAX_ROOMS`), le
     `SignalingClient` expose désormais `onClose(code)` — la fermeture serveur du sweep des rooms
     orphelines (`ws.close(4000, ...)` dans `signaling/src/server.ts`) est maintenant routée côté
     client vers le statut `"invalid-room"` (elle ne l'était pas avant, gap trouvé pendant ce
     passage). CTA "Créer une room" / "Saisir un code" ajoutés dans `Lobby.tsx`.
  6. **Room pleine** : CTA "Créer une nouvelle room" ajouté.
  7. **Composition (loading)** : nouveau statut `CaptureSessionStatus` `"composing"` (distinct de
     `"done"`, posé pendant l'attente de `composeStrip()`), overlay dédié dans `CaptureStage.tsx`.
  Vérifié bout en bout (2 onglets Chrome headless) : régression du flux nominal (connexion → 4
  poses → composition → changement de filtre → Reprendre, 0 exception) ; `room-full` et
  `invalid-room` avec leurs CTA respectifs ; coupure forcée d'un pair en cours de séance (process
  Chrome tué) → overlay "on attend Partenaire" affiché sans exception, **bug réel trouvé et corrigé
  pendant ce test** (le cas où la pose avait déjà été localement capturée et envoyée avant la
  coupure ne relançait jamais rien, `pendingPoseRef` restant à `null` — fix ci-dessus) → reconnexion
  du même pair sur le même code de room → séance reprise automatiquement et bande complète
  composée des deux côtés.
- **Hors jalons, ajouté sur demande explicite** :
  - **Analytics** : Umami auto-hébergé, entièrement optionnel (`NEXT_PUBLIC_UMAMI_SCRIPT_URL` /
    `NEXT_PUBLIC_UMAMI_WEBSITE_ID` — absentes en dev, aucune télémétrie envoyée). Injecté dans
    `app/layout.tsx` via `next/script` (`strategy="afterInteractive"`), pas de tracking d'événements
    custom pour l'instant (room créée/rejointe/etc.) — seulement les pageviews de base d'Umami.
  - **Prénoms hôte/invité** : saisis sur `/create` et `/join`, échangés via une extension du
    handshake `hello`/`config` du data channel (`hello` porte désormais le prénom de l'invité,
    `config` celui de l'hôte — voir `types/realtime.ts`, `use-capture-session.ts`) et affichés dans
    le footer de la bande composée (`SNAPLOVER · DATE · {hôte} & {invité}`, voir
    `lib/capture/compose-strip.ts`). **Jamais dans le lien partagé** (poses/style/cadre uniquement,
    voir `create/page.tsx`) — chaque pair l'ajoute en query param `name` sur sa propre navigation
    locale (`?name=...`). Le prénom est **obligatoire**, pas de secours silencieux : si absent
    (lien collé directement sans passer par `/join`), `app/r/[code]/page.tsx` redirige vers
    `/join?code=CODE` (code pré-rempli) plutôt que de retomber sur un prénom générique — `fr.participant.defaultHost`/`defaultGuest` ne servent que de filet de sécurité interne le temps
    que le prénom du partenaire arrive par le data channel, jamais affichés comme substitut d'un
    prénom jamais saisi. Le footer ayant une largeur fixe et les prénoms étant un texte utilisateur
    de longueur variable (jusqu'à
    `config.participant.nameMaxLength` = 24 caractères chacun), la police du footer se réduit
    automatiquement si le texte déborderait (`ctx.measureText` en boucle dans `compose-strip.ts`) —
    vérifié avec deux prénoms de 24 caractères, aucun débordement.
  - **Fix** : le bouton copier de la salle d'attente (`Lobby.tsx`) ne copiait que le code brut de la
    room, pas un lien partageable complet (poses/style/cadre) — corrigé.
  - **Fix caméra mobile** : `getUserMedia` ne précisait pas `facingMode`, donc la caméra déclenchée
    sur téléphone dépendait du navigateur/appareil (pas fiable, parfois la caméra arrière). Fix :
    `facingMode: { ideal: "user" }` (frontale préférée, souple — pas `exact`, qui ferait échouer
    `getUserMedia` sur un laptop/desktop à caméra unique) dans `use-user-media.ts`.
  - **Duo Doodle** : dessin collaboratif en direct, **sur l'écran de résultat** (`PhotoStrip.tsx`) —
    un calque unique partagé par-dessus la bande déjà composée, opt-in via un bouton crayon (désarmé
    par défaut), les deux pairs dessinent dessus et voient les traits de l'autre en direct, puis le
    trait est **incrusté dans le PNG téléchargé/partagé** (`lib/capture/doodle.ts` `flattenDoodle`,
    appelé à la demande au clic Télécharger/Partager, pas en continu — recomposer un PNG plein format
    à chaque point tracé serait coûteux et inutile tant que personne n'exporte). **Repositionné après
    un premier essai raté** : la toute première version dessinait en direct pendant la séance
    elle-même (sur chaque CameraTile, incrusté à l'instant du déclic) — retour utilisateur réel après
    déploiement : le 3·2·1 chronométré (`config.capture.leadMs` = 3.2s) ne laisse quasiment aucun
    temps pour dessiner quoi que ce soit d'utile. Déplacé sur l'écran de résultat : zéro pression de
    temps, c'est une retouche à deux après coup plutôt qu'un geste "en direct pendant la prise".
    Protocole réseau minimal, 2 messages (`doodle-points`/`doodle-clear`, voir `types/realtime.ts`) :
    `hooks/use-doodle.ts` écoute/envoie en `dataChannel.addEventListener("message", …)` plutôt que via
    `RealtimeChannel` (qui s'assigne sur `dc.onmessage` — un second wrapper la remplacerait ; les deux
    mécanismes DOM coexistent sans conflit sur le même canal), toujours vivant sur l'écran de résultat
    tant que le partenaire n'a pas quitté (`dataChannel` passé de `RoomClient.tsx` à `PhotoStrip.tsx`,
    absent en solo — pas de pair). "Effacer" vide le calque entier pour les deux pairs (pas seulement
    les traits de celui qui clique), sinon les deux calques finiraient désynchronisés. Points
    normalisés `[0,1]×[0,1]` (plus de correction de miroir : ce n'est plus une vidéo de caméra, juste
    une image) — `flattenDoodle` les remet à l'échelle de la résolution native de la bande, pas celle,
    réduite, du canvas affiché à l'écran. Vérifié bout en bout : `e2e/tests/doodle.spec.ts` (synchro
    live + effacement partagé) et export PNG téléchargé inspecté à l'œil (trait présent sur toute la
    largeur de la bande, à pleine résolution).
- Prochaine étape : **J6** — voir docs/SNAPROOM-SPEC.md §17 (purge complète des rooms orphelines
  déjà en place côté signaling depuis J1 ; reste à confirmer le périmètre exact de J6 avec l'auteur).

## Doodle Duel
Mini-jeu Pictionary à deux, ajouté sur demande explicite comme évolution de Duo Doodle — pas un
outil de retouche mais une vraie activité répétable à distance, séparée de la bande photo (routes
`/duel`, `/duel/join`, `/duel/r/[code]`, composant racine `DuelClient.tsx`). Positionnement : donner
aux duos à distance une raison de revenir sur l'appli entre deux vraies séances photo (la bande
photo reste plus "occasion spéciale"), avec un ressort de partage similaire à Wordle/GeoGuessr — un
résultat court et drôle qu'on a envie de montrer/défier, pas une fonctionnalité qu'on utilise puis
oublie.
- **Règles** : `config.duel.rounds` manches (3), `config.duel.roundDurationMs` par manche (60s —
  volontairement généreux, voir plus bas pourquoi). Dessinateur·rice alterné·e à chaque manche par
  pure parité de l'index (manches paires = hôte, impaires = invité·e, voir
  `drawerIsInitiatorForRound` dans `hooks/use-duel-session.ts`) : jamais transmis sur le réseau, les
  deux côtés le déduisent identiquement.
- **Une seule autorité par manche** : qui dessine choisit le mot (jamais envoyé sur le réseau avant
  la fin de la manche — seul·e le·la dessinateur·rice le connaît), évalue chaque essai du·de la
  deveneur·euse, et décide seul·e de la fin de manche (bonne réponse ou chrono écoulé). Ça évite
  toute course entre les deux pairs sur "qui décide" — même principe que `triggerCapture`
  (hôte-only) côté photo, mais ici l'autorité change de main à chaque manche plutôt que de rester
  toujours côté hôte.
- **Protocole réseau** (`types/duel-realtime.ts`) : réutilise le canal `dataChannel` existant
  (`useRoomConnection`, inchangé) mais avec son propre petit jeu de messages
  (`duel-round-start`/`duel-points`/`duel-clear`/`duel-guess`/`duel-guess-result`/`duel-round-end`),
  jamais mélangés avec `RealtimeMessage` — une room `/duel/r/[code]` n'instancie jamais
  `useCaptureSession`, donc ce canal ne porte jamais que ces messages.
- **Leçon directement héritée du placement raté de Duo Doodle** (voir plus haut) : ne jamais faire
  démarrer un chrono par surprise. La phase "drawer-prep" affiche le mot SANS lancer le chrono —
  c'est le clic explicite sur "Dessiner !" qui envoie `duel-round-start` et démarre vraiment les 60s
  des deux côtés. Le·la deveneur·euse a son propre tick local (`tickCountdown`, démarré à la
  réception du message) — sans lui, son compte à rebours affiché resterait figé à la valeur de
  départ pendant toute la manche (bug réel trouvé en écrivant ce fichier, avant tout test).
- **Bug de closure React réel trouvé en écrivant ce hook** : le listener réseau (`handleMessage`,
  dans un effet à deps `[dataChannel]`, monté une seule fois) lisait initialement `word`/`roundIndex`
  directement depuis le state — closures figées sur leur valeur au montage, jamais mises à jour
  après la première manche. Fix : tout ce que `handleMessage` lit passe par une ref
  (`wordRef`/`roundIndexRef`/`myStrokesRef`/`peerStrokesRef`), tenue à jour par des effets dédiés —
  même précaution déjà documentée dans `use-capture-session.ts`.
- **Aucun prénom, aucune config à saisir** (contrairement à `/create`) : `/duel` ne demande rien,
  juste un bouton "Créer un duel" — labels génériques "Toi"/"Partenaire" partout. Choix de scope
  volontaire pour ce MVP, pas un oubli — l'échange de prénom existant (`hello`/`config`) est
  spécifique au protocole photo, le dupliquer ici aurait ajouté de la complexité réseau pour un gain
  cosmétique. Enrichissement possible plus tard si demandé.
- **Récap** (`lib/doodle-duel/compose-recap.ts`, `components/duel/DuelRecap.tsx`) : une carte par
  manche (dessin final + mot + résultat), score en en-tête, footer de marque — composé sur canvas
  comme la bande photo (`compose-strip.ts`), téléchargeable/partageable via le même helper
  `lib/share-or-download.ts` (extrait de `PhotoStrip.tsx` à cette occasion, pour éviter la
  duplication maintenant qu'il a un second appelant). Piège évité : `redrawStrokes` commence par un
  `clearRect` (nécessaire pour le calque live, qui doit rester transparent entre deux redraws) —
  l'appliquer directement sur le canvas du récap aurait effacé le fond blanc de chaque carte tout
  juste peint ; fix : dessiner chaque manche sur un canvas transparent séparé, puis le composer
  par-dessus le fond blanc déjà peint sur le canvas final.
- **Rejouer** (`replay()` dans le hook) repart pour une partie fraîche sur la MÊME connexion, sans
  recharger la page ni renégocier WebRTC — chaque côté l'appelle indépendamment, pas de message
  réseau nécessaire (round 0 redevient l'hôte, exactement comme au tout premier lancement).
- Vérifié bout en bout : `e2e/tests/duel.spec.ts` (3 manches jouées, rôles alternés, synchro du
  trait en direct, bonne réponse insensible aux accents/casse, récap téléchargeable) + partie
  complète rejouée à la main plusieurs fois, carte récap inspectée à l'œil (mots, résultats, dessins
  miniatures et footer de marque tous corrects à pleine résolution).

## Room codes : préfixe par type de jeu
En préparant l'ajout d'un second jeu, un bug latent est apparu : `signaling/` range toutes les
rooms dans une seule `Map<code, RoomEntry>`, sans aucune notion de type — un code de room photo et
un code de duel pouvaient collisionner (le premier arrivé "possède" ce code, peu importe la route
par laquelle il est arrivé), et le champ générique "coller le lien / code" de la landing
(`InlineJoinField.tsx`) redirigeait toujours vers `/r/`, quel que soit le type de code collé. Fix
choisi (voir `lib/room-code.ts`) : chaque code généré commence désormais par un caractère qui
encode son type (`P`=photo, `D`=duel, `W`=word-sonar, table `ROOM_KIND_PREFIX`), décodé côté client
par `roomKindFromCode()` — aucun changement du protocole signaling nécessaire (qui reste inconscient
du concept de "type"), et aucune requête réseau pour la landing (dispatch purement local). Les
pages de jonction dédiées (`/join`, `/duel/join`, `/word-sonar/join`) vérifient maintenant aussi
que le code collé correspond bien au type attendu (sinon même message d'erreur générique "code
invalide"), pas seulement son format. Compromis accepté : ce changement de format invalide tout lien
de room partagé avant cette date — acceptable, les rooms étant déjà conçues comme éphémères
(§"Aucune BDD" plus haut), pas destinées à être conservées en favoris.

## Word Sonar
Deuxième mini-jeu à deux (après Doodle Duel), né d'une vraie soirée jeux de l'auteur — plusieurs
petits jeux à deux (Bingo, Tic-Tac-Toe Ultimate, "un mot en commun", "bataille navale de lettres")
partagent la même mécanique de fond : deux pairs, un salon éphémère, un protocole réseau minimal sur
le `dataChannel` existant. Vision produit : faire de SnapLover un "hub" de jeux rapides pour ami·es
à distance, pas juste une cabine photo. **Un premier jeu ("Mind Match", convergence de mots) a été
construit puis abandonné sans merger** — retour direct de l'auteur après test : ce n'était pas le
bon mécanisme, celui vraiment joué en soirée était la bataille navale de lettres décrite ci-dessous.
Leçon retenue : quand l'auteur délègue le choix du jeu ("choisis toi-même"), reconfirmer le
mécanisme exact avant de construire plutôt que de deviner à partir d'une liste vague — un jeu
entièrement fonctionnel mais hors-sujet ne vaut rien s'il ne correspond pas à l'expérience réelle
que l'auteur avait en tête.
- **Règles** : chacun·e choisit un mot secret d'une longueur convenue (`config.wordSonar.minLength`
  à `maxLength`, 4 à 8, choisie par l'hôte dans la salle d'attente — voir
  `components/word-sonar/WordSonarLobby.tsx`). Tour par tour (`config.wordSonar.turnDurationMs` par
  tour, 30s — qui a la main possède et déclenche son propre timeout, même principe que
  `duel.roundDurationMs`), qui a la main choisit : demander si une lettre est dans le mot de l'autre
  (si oui, TOUTES ses positions sont révélées, pas juste une occurrence), ou tenter de deviner le
  mot entier. Premier·ère à deviner le mot de l'autre gagne la manche ; `config.wordSonar.rounds`
  manches (3), interrogateur·rice alterné·e à chaque manche par pure parité de l'index
  (`askerIsInitiatorForRound` dans `hooks/use-word-sonar-session.ts`) — jamais transmis sur le
  réseau, même principe que `drawerIsInitiatorForRound` côté Doodle Duel.
- **Le mot secret ne quitte JAMAIS l'appareil de qui l'a choisi** : la réponse à une question
  ("as-tu telle lettre ?") ou à une tentative est calculée localement par qui répond, à partir de
  SON PROPRE mot — jamais transmis en clair sur le réseau. Autorité unique par question/tentative
  (comme Doodle Duel où qui dessine juge les essais), sauf qu'ici l'autorité change de main à
  CHAQUE question, pas seulement à chaque manche.
- **Passage du tour déduit, pas transmis explicitement** : après toute question (résultat reçu) ou
  tentative ratée, les deux côtés basculent `isMyTurn` de façon déterministe à partir du MÊME
  message (`wordsonar-letter-result`/`wordsonar-guess-result` avec `correct:false`) — jamais de
  message réseau dédié "à toi de jouer", le canal ordonné du data channel suffit.
- **Chrono par tour, propriété du côté actif** — retour explicite de l'auteur ("on doit miser sur
  l'expérience... on peut mettre un timer") : si qui a la main laisse s'écouler `turnDurationMs`
  sans agir, SON PROPRE client déclenche le timeout et envoie `wordsonar-turn-timeout` (même
  principe de propriété du chrono que `confirmStartDrawing`/`endRound` côté Doodle Duel — jamais le
  côté qui attend qui décide que le temps est écoulé, sous peine de désynchro sur un léger décalage
  d'horloge entre les deux navigateurs).
- **Interface repensée sur retour explicite de l'auteur**, pas la conception initiale : la première
  intention était un simple flux de questions/réponses en texte. Retour reçu avant implémentation
  ("quand il demande la lettre il met ça dans la case... s'il a déjà trouvé le mot il écrit le reste
  et fait valider") → design final : un tableau de `length` cases représentant ce qu'on sait du mot
  de l'autre (case verrouillée dès qu'une lettre y est trouvée par une question), une grille
  alphabet A-Z (grisée/barrée si lettre absente, vert si trouvée, désactivée une fois posée), et les
  cases vides restent éditables à tout moment pour tenter une devinette complète — voir
  `components/word-sonar/WordSonarRoundStage.tsx` `buildKnownBoard`/`askedLetterState`.
- **Récap** (`lib/word-sonar/compose-recap.ts`, `components/word-sonar/WordSonarRecap.tsx`) : même
  gabarit texte que le récap Mind Match avorté (une ligne par manche : mot trouvé + gagné/perdu),
  score en en-tête, footer de marque, même helper `lib/share-or-download.ts`.
- **Comparaison de mots/lettres partagée avec Doodle Duel** : `lib/text/normalize-word.ts`
  (`normalizeWord`/`isSameWord`/`letterPositions`) extrait de `lib/doodle-duel/pick-word.ts` à cette
  occasion — même besoin exact (casse/accents insensibles) dans les deux jeux, second appelant réel
  qui justifie l'extraction, pas de sur-généralisation prématurée.
- **Bulles caméra partagées avec Doodle Duel** : `components/duel/DuelFaceBubbles.tsx` généralisé en
  `components/room/FaceBubbles.tsx` (labels "toi"/"partenaire" passés en props) à cette occasion —
  même raisonnement que pour `normalizeWord`.
- **Aucun prénom à saisir** (contrairement à `/create`), labels génériques "Toi"/"Partenaire" — même
  choix de scope que Doodle Duel. La longueur du mot EST en revanche un réglage nécessaire (contrai-
  rement à Doodle Duel/l'ancien Mind Match qui n'ont besoin d'aucune config) : choisie par l'hôte
  dans la salle d'attente et communiquée à l'invité·e via `wordsonar-start`, jamais encodée dans
  l'URL de room (cohérent avec le choix "aucune config à saisir pour l'invité·e" des autres jeux).
- Vérifié bout en bout : `e2e/tests/word-sonar.spec.ts` (3 manches : élimination de lettre, lettre
  trouvée avec position révélée, tentative directe gagnante des deux côtés, alternance de qui
  interroge en premier par manche, récap téléchargeable) + suite e2e complète rejouée sans
  régression.
- **Pas encore fait** : promotion sur la landing — en attente d'un bloc "Jeux" unifié listant Doodle
  Duel + Word Sonar plutôt que d'empiler des sections promo plein-écran par jeu (même décision prise
  pour l'ancien Mind Match, toujours valable).
