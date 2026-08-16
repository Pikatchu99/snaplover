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
- Promotion sur la landing : voir "Registre des jeux" ci-dessous — Word Sonar apparaît désormais
  dans le bloc "Jeux" unifié plutôt que dans une section plein-écran dédiée.

## Registre des jeux (`lib/games/registry.ts`)
Suite à la demande explicite de l'auteur de transformer SnapLover en "hub de jeux" (le photobooth
restant le pilier, toujours mis en avant en premier — voir plus bas), le registre devient la SEULE
source de vérité pour tout ce qui concernait jusqu'ici trois endroits maintenus à la main en
parallèle (et qui avaient déjà chacun raté une mise à jour au moins une fois) :
- **Préfixe de code par type** (`ROOM_KIND_PREFIX`, utilisé par `lib/room-code.ts`) — évite la
  collision entre types de room décrite plus haut ("Room codes : préfixe par type de jeu").
- **Route de room par type** (`ROOM_KIND_PATH`, utilisé par `InlineJoinField.tsx`) — pour rediriger
  un code collé vers la bonne room sans requête réseau.
- **Disallow robots.ts** — généré par un `.flatMap` sur `GAMES`, plus de liste à jour à la main à
  chaque nouveau jeu (voir `app/robots.ts`).
- **Carte sur la landing** (`components/landing/GamesHubPromo.tsx`) — une section "Jeux" unique,
  une carte compacte par entrée de `GAMES` (icône, nom, accroche, CTA), plutôt que la section
  plein-écran par jeu de `DoodleDuelPromo.tsx` (premier jet, supprimé à cette occasion — intenable
  dès le second jeu, comme anticipé).
Ajouter un jeu au hub ne devrait désormais toucher QUE : ses propres fichiers de jeu (hook/
composants/types/routes) + une entrée dans `GAMES` + les clés i18n `landing.<promoNamespace>`
(eyebrow/headline/cta, voir la structure compacte de `landing.wordSonar`) — plus aucune des quatre
listes ci-dessus à modifier séparément.
- **Le photobooth n'est PAS dans `GAMES`** — c'est le pilier du produit (voir demande explicite de
  l'auteur), pas un mini-jeu du hub : sa propre page dédiée, son propre traitement hero sur la
  landing, aucune carte dans la grille "Jeux". Il garde néanmoins une entrée dans le système de
  préfixe de code (`PHOTO_ROOM`, kind `"photo"`) puisque ce mécanisme protège TOUS les types de
  room, pas seulement les mini-jeux.
- **`RoomKind` dérive maintenant du registre** (`"photo" | (typeof GAMES)[number]["kind"]`), plus
  une simple union à jour à la main dans `lib/room-code.ts` — un jeu ajouté à `GAMES` élargit le
  type automatiquement partout où `RoomKind` est utilisé.

## Connect Duo
Troisième mini-jeu du hub, premier construit à partir de la démarche voulue par l'auteur : après
la transformation en "hub de jeux", un workflow multi-agents a généré, scoré et spécifié 8 jeux
candidats (Connect Duo, Edge Letters, Fleet Siege, Duo Quiz, Ultimate Tic-Tac-Toe, Copy Cat,
Reflex Match, Bingo — voir `docs/GAMES-ROADMAP-DRAFT.json` pour les specs complètes des 8).
Connect Duo a été choisi en premier précisément parce qu'il est le moins risqué de la liste : un
Puissance 4 classique, sans aucune information cachée ni hasard à gérer.
- **Aucune autorité à négocier, contrairement à Doodle Duel/Word Sonar** : le plateau, le tour
  courant et la victoire/l'égalité sont TOUJOURS des fonctions pures du même log de coups partagé
  (`lib/connect-duo/board.ts` `buildBoard`/`checkWinner`), jamais un verdict transmis séparément —
  aucun côté n'a besoin de "faire confiance" à l'autre pour une information secrète, il n'y a
  structurellement rien à cacher. Un seul type de message de jeu
  (`{ t: "connectduo-move"; index; column }`), le reste (grille, tour, victoire) se déduit.
- **L'alternance de tour EST la mécanique ici, pas une gêne à éviter** : contrairement à la
  tentative de mot entier de Word Sonar (jamais soumise à un tour, retour utilisateur explicite),
  laisser un joueur poser deux jetons avant la réponse de l'autre changerait le résultat de la
  partie, pas seulement son rythme — les deux joueurs raisonnent sur le MÊME plateau partagé tour
  par tour. Les cellules hors tour sont désactivées côté UI, et un coup reçu dont l'`index` ne
  correspond pas au prochain coup attendu est silencieusement ignoré (défense, pas mécanisme de
  confiance — l'UI empêche déjà l'envoi d'un coup illégal).
- **Poignée de main `connectduo-hello` + `connectduo-start` explicite** : l'invité·e envoie
  `connectduo-hello` dès que son listener réseau est attaché (comme le hello/config de la photo),
  mais ça ne suffit PAS à faire passer les deux côtés à l'écran de jeu — l'hôte doit encore cliquer
  "Lancer la partie" (`connectduo-start`), sinon l'invité·e (dont le hello part dès la connexion,
  avant tout clic de l'hôte) verrait l'écran de jeu avant l'hôte. Bug trouvé et corrigé avant tout
  test en écrivant le hook : le premier jet mettait `hasStarted = true` sur la réception de N'IMPORTE
  QUEL message, y compris ce hello.
- **Pas d'écran de récap séparé** (contrairement à Doodle Duel/Word Sonar) : le résultat s'affiche
  directement sous le plateau, "Rejouer" repart immédiatement sans quitter l'écran. Conséquence
  directe : **pas de coupure de caméra à la fin d'une partie** — les autres jeux coupent
  `localStream` en arrivant sur leur écran de récap (vie privée, une fois la partie terminée), mais
  ici ça casserait irrémédiablement "Rejouer" (un `MediaStreamTrack` arrêté ne redémarre jamais).
  Piège identifié avant d'écrire le code (pas un bug trouvé en testant) en comparant à
  `WordSonarClient.tsx`/`DuelClient.tsx`, qui ont ce même effet mais un vrai écran de récap séparé.
- **"Rejouer" avec la même garde d'idempotence que les 3 jeux précédents** (`connectduo-rematch`,
  `id` monotone + ref locale) — même classe de bug déjà rencontrée et corrigée sur Doodle Duel/Mind
  Match/Word Sonar (`duel-next-round`/`mindmatch-advance`/`wordsonar-advance`), anticipée dès la
  conception plutôt que redécouverte une 4e fois.
- **Aucune config à choisir** (contrairement à Word Sonar, qui a la longueur du mot) : la salle
  d'attente n'a qu'un bouton "Lancer la partie", aucun réglage — l'hôte joue toujours en premier
  (jetons corail), l'invité·e toujours en second (jetons encre), fixé une fois pour toutes par
  `isInitiator`, jamais renégocié y compris sur un rematch.
- **Couleurs, retour utilisateur réel après un premier test** : les jetons de l'invité·e étaient à
  l'encre sombre (`#1c1712`) dans le tout premier jet — invisibles sur le fond déjà sombre de
  l'écran de jeu, et la case vide (papier clair `#fbf7f1`) se lisait comme "déjà remplie d'un jeton
  blanc". Fix : jetons de l'invité·e passés au papier clair (vrai contraste), case vide passée à un
  simple trou sombre (`#1c1a20`, un ton au-dessus du fond `#0d0b0f` du plateau) — jamais de violet
  ici (réservé exclusivement au chemin "rejoindre", voir convention Doodle Duel).
- **Animation de chute ajoutée après coup** (déférée en v1 pour prouver le concept vite, comme prévu
  dès le départ) — avec Framer Motion, pas GSAP comme suggéré par l'auteur : déjà la librairie
  d'animation du projet, largement suffisante pour un ressort de gravité, une deuxième dépendance
  d'animation n'apportait rien. Chaque jeton ne joue sa chute qu'une seule fois : une case vide ne
  rend rien de `motion`, donc le composant ne monte dans l'arbre React qu'au moment exact où le jeton
  est posé — `initial` de Framer Motion ne se rejoue jamais après un premier montage, les jetons déjà
  posés ne ré-animent donc jamais sur les coups suivants, sans code de garde supplémentaire.
- **Carte récap partageable ajoutée après coup** — retour utilisateur explicite : "tous les jeux
  doivent avoir ça" (un résultat partageable, comme Doodle Duel/Word Sonar en ont déjà). Connect Duo
  était le seul jeu du hub à ne pas en avoir, la spec générée par le workflow l'ayant explicitement
  reporté en "v1.1" pour prouver le concept vite. Snapshot du plateau final façon carte Wordle
  (`lib/connect-duo/compose-recap.ts`), composé à la fin de partie — mais PAS un écran de récap
  séparé comme les autres jeux : les boutons télécharger/partager s'ajoutent directement sous le
  plateau existant (voir plus haut, pas d'écran séparé pour ne jamais casser "Rejouer" via une
  caméra coupée). **Règle retenue pour tout futur jeu du hub : un résultat partageable est
  obligatoire dès le premier ship, plus un "v1.1" à reporter.**
- Vérifié bout en bout : `e2e/tests/connect-duo.spec.ts` (alternance stricte vérifiée y compris le
  refus d'un coup hors tour côté UI, victoire par alignement vertical, carte récap téléchargeable,
  "Rejouer" réinitialise les deux côtés sans recharger) + suite e2e complète rejouée sans régression.
- **Pas encore fait** : les 7 autres jeux du roadmap restent à construire, dans l'ordre de priorité
  du workflow (Edge Letters ensuite — reprend le "mot en commun" de départ de l'auteur, façon
  "starts with X, ends with Y").

## Edge Letters
Quatrième mini-jeu du hub, deuxième construit depuis le roadmap du workflow multi-agents (voir
`docs/GAMES-ROADMAP-DRAFT.json`) — reprend le "starts with X, ends with Y" de l'idée de départ de
l'auteur. Chaque manche, les deux joueur·euses choisissent CHACUN·E une lettre (l'un·e le DÉBUT,
l'autre la FIN, rôle qui alterne par manche) puis courent librement (aucun tour) à taper un vrai
mot français qui les respecte.
- **Prérequis explicitement flaggé par la spec avant tout code** : une liste de mots français à
  embarquer côté client pour valider les tentatives — et puisque ce repo est PUBLIC et EST l'infra
  de prod (voir §"Open source & auto-hébergement"), la licence de cette liste devait être confirmée
  avec l'auteur, pas devinée. Recherchée et vérifiée avant tout code (pas de confiance en mémoire
  générale) : `an-array-of-french-words` (MIT, ~336k mots, maintenue par un mainteneur open-source
  reconnu) — filtrée aux mots simples (sans formes composées à trait d'union) et pré-normalisée
  (minuscules, sans accents) en `lib/text/french-word-list.json` (318 883 entrées, ~750 Ko gzippé),
  licence complète dans `french-word-list.LICENSE.txt` à côté. Chargée via `import()` dynamique
  (`lib/text/word-list.ts`) — ne bloat jamais le bundle des autres pages.
- **Aucun tour pendant la course — c'est le point central du jeu, pas un raccourci UX** : réponse
  directe aux deux bugs de tour déjà rencontrés dans cette app (message "next round" manquant de
  Doodle Duel, tentative de Word Sonar initialement soumise à un tour). La seule chose "de tour"
  ici est le RÔLE (qui choisit quelle lettre) — jamais une action gatée.
- **Un·e seul·e arbitre par manche, même parité que le choix de rôle, volontairement** (voir
  `roundAuthorityIsInitiator` dans `hooks/use-edge-letters-session.ts`) : une seule fonction, une
  seule source de vérité, jamais deux parités indépendantes qui pourraient dériver. L'arbitre est
  la SEULE à émettre `edgeletters-round-result` — l'autre côté n'affirme jamais une victoire de son
  propre chef ("j'ai tapé en premier"), iel soumet sa tentative puis ATTEND toujours ce message.
  Avant de créditer QUELQUE tentative que ce soit (y compris la sienne), l'arbitre la revalide
  indépendamment avec la même fonction `isValidEdgeLettersWord` déjà passée localement par
  l'émetteur·rice — jamais confiance aveugle en un client modifié.
- **Validation locale AVANT tout envoi réseau — simplification volontaire par rapport à Word
  Sonar** : une tentative invalide ne touche jamais le réseau (contrairement à Word Sonar, où
  chaque tentative DOIT transiter puisque seul·e l'adversaire connaît le mot secret à vérifier) —
  ici, aucun secret à protéger, une tentative ratée ne coûte donc rien à personne.
- **Chrono de choix de lettre purement LOCAL** (`config.edgeLetters.pickDurationMs`, 15s généreux,
  même leçon "jamais de pression de temps surprise" que les autres jeux) : si non choisie à temps,
  le client tire lui-même une lettre au hasard, aucune coordination réseau nécessaire pour ce
  repli — seul le côté en retard doit agir.
- **Chrono de course, déviation volontaire de la spec générée** : la spec suggérait un chrono
  symétrique des deux côtés déclenchant chacun son propre message `edgeletters-race-timeout`,
  gardé par une idempotence par manche. Simplifié : seul le chrono de L'ARBITRE déclenche le
  verdict de match nul à son expiration (réutilise directement `edgeletters-round-result` avec
  `winner: null`, pas de message séparé) — cohérent avec le principe "une seule autorité, un seul
  verdict" déjà établi pour les tentatives, l'autre côté se contente d'afficher un compte à rebours
  qui s'arrête sans rien déclencher.
- **`role` transmis explicitement** dans `edgeletters-letter-pick` plutôt que redéduit de la parité
  de manche à la réception — retire toute une classe de bug "les deux côtés ne sont plus d'accord
  sur qui a quel rôle", au prix de quelques octets par message (même précaution que la spec l'avait
  identifiée).
- **5 manches toujours jouées jusqu'au bout**, même si le score est déjà joué (même simplicité que
  Doodle Duel/Word Sonar — pas d'arrêt anticipé à gérer). Récap canvas multi-lignes (une par
  manche : lettres + mot trouvé + qui a gagné), score en en-tête, téléchargeable/partageable dès le
  premier ship (voir règle "tous les jeux doivent avoir ça" plus haut) via le
  `lib/share-or-download.ts` déjà partagé.
- Vérifié bout en bout : `e2e/tests/edge-letters.spec.ts` (5 manches complètes, rôles et arbitrage
  alternés à chaque manche, tentative gagnante testée à la fois via le chemin "l'arbitre reçoit et
  juge la tentative de l'autre" ET "l'arbitre gagne via sa propre tentative", récap téléchargeable)
  + suite e2e complète rejouée sans régression — réussi du premier coup, y compris la logique
  d'arbitrage tournant la plus complexe du hub à ce jour.
- **Pas encore fait** : 6 jeux du roadmap restent à construire (Fleet Siege ensuite — bataille
  navale classique, réutilise directement le principe "qui répond calcule localement" de Word
  Sonar).

## Fleet Siege
Cinquième mini-jeu du hub, troisième construit depuis le roadmap du workflow multi-agents (voir
`docs/GAMES-ROADMAP-DRAFT.json`) — la bataille navale classique, en direct à deux. Grille 8x8, 3
navires chacun·e (tailles 4/3/2, `config.fleetSiege`), volontairement plus petit que la bataille
navale traditionnelle (10x10, 5 navires) pour rester cohérent avec le positionnement "session
rapide" du reste du hub.
- **Premier jeu du hub avec une VRAIE information cachée à protéger** (contrairement à Connect Duo,
  qui n'a structurellement rien à cacher) — mais **aucune autorité à négocier pour autant** :
  extension spatiale directe du principe déjà établi par Word Sonar (qui a la main sur son propre
  mot secret calcule localement la réponse), appliquée ici au plateau entier. Chaque flotte est la
  seule source de vérité de son propre propriétaire (`lib/fleet-siege/board.ts`
  `computeFireOutcome`), et ne quitte JAMAIS l'appareil qui l'a placée tant que la partie est en
  cours — seul le verdict (touché/raté/coulé/partie terminée) traverse le réseau, en réponse
  directe à un tir précis. Le seul moment où un plateau complet est jamais transmis
  (`siege-reveal-board`) est APRÈS que l'issue est déjà tranchée des deux côtés, symétriquement
  (gagnant·e ET perdant·e l'envoient) — purement cosmétique pour l'écran de révélation côte à côte.
- **Le seul mécanisme du hub où le tour EST la règle, pas une gêne à éviter** — contrairement à Word
  Sonar (question libre) et Edge Letters (course libre), la valeur de chaque tir dépend réellement
  de connaître le résultat des précédents : pas de "réponse déjà connue" à livrer en avance. Le tour
  se déduit uniquement de la parité du compteur de tirs partagé + qui tire en premier ce match
  (`shooterForShotIndex` dans `hooks/use-fleet-siege-session.ts`) — jamais un message "à toi de
  jouer" séparé, le canal ordonné/fiable garantissant qu'une paire tir/résultat se termine toujours
  avant le tir suivant. Le·la défenseur·euse revalide quand même la parité du `shotIndex` reçu et
  ignore silencieusement toute incohérence (tir dupliqué/désordonné) — défense bon marché, pas un
  mécanisme de confiance (même esprit que le calcul local déjà accepté ailleurs).
- **"Qui tire en premier" alterne à chaque match via le MÊME compteur que la garde d'idempotence du
  rematch** (`matchIndex`/`siege-rematch id`) — délibérément un seul compteur partagé pour les deux
  usages plutôt que deux compteurs indépendants qui pourraient dériver l'un de l'autre (match 0 →
  hôte en premier, match 1 → invité·e en premier, etc., jamais renégocié explicitement).
- **Pas d'écran de récap séparé** (même choix que Connect Duo, pour la même raison) : la révélation
  et les boutons télécharger/partager/rejouer s'affichent directement sous les deux plateaux,
  "Rejouer" repart en placement sur la MÊME connexion sans recharger — donc pas de coupure caméra en
  fin de partie ici non plus (un `MediaStreamTrack` arrêté ne redémarre jamais).
- **Placement 100% local, aucune validation croisée possible ni nécessaire** : bornes/chevauchement
  vérifiés uniquement côté client qui place (`lib/fleet-siege/placement.ts`), pas de règle
  d'adjacence (les navires peuvent se toucher, gardé simple). "Aléatoire" ne décide que des propres
  données secrètes de qui clique — même nature que Word Sonar choisissant son mot en privé, aucun
  hasard partagé à synchroniser entre les deux côtés.
- **Carte récap** (`lib/fleet-siege/compose-recap.ts`) : les deux flottes révélées côte à côte,
  snapshot façon carte de résultat Wordle — dès le premier ship (règle "tous les jeux doivent avoir
  ça" plus haut), via le `lib/share-or-download.ts` déjà partagé.
- Vérifié bout en bout : `e2e/tests/fleet-siege.spec.ts` (placement manuel des deux flottes à des
  coordonnées connues, tour strictement alterné avec refus implicite de tirer hors tour côté UI,
  coulage complet d'une flotte en 9 tirs entrelacés avec 8 tirs "à l'aveugle" de l'autre côté, écran
  de révélation + récap téléchargeable, "Rejouer" remet les deux côtés en placement avec le premier
  tireur inversé au match suivant) + suite e2e complète rejouée sans régression — réussi du premier
  coup.
- **Pas encore fait** : 5 jeux du roadmap restent à construire (Duo Quiz ensuite selon l'ordre de
  priorité — voir `docs/GAMES-ROADMAP-DRAFT.json`).

## Duo Quiz
Sixième mini-jeu du hub, quatrième construit depuis le roadmap du workflow multi-agents (voir
`docs/GAMES-ROADMAP-DRAFT.json`) — 8 questions de culture générale identiques des deux côtés,
piochées dans une banque statique bilingue (`lib/duo-quiz/question-bank.json`, 24 questions,
`config.duoQuiz.rounds` = 8 par partie). Fenêtre de réponse `config.duoQuiz.roundDurationMs` = 15s,
volontairement bien plus courte que les 60s de Doodle Duel — se souvenir d'un fait est immédiat,
contrairement à dessiner.
- **Aucun tour DANS une manche — les deux répondent au même instant** : contrairement à
  Doodle Duel (dessinateur·rice/deveneur·euse) ou Fleet Siege (tour la règle), rien n'est
  asymétrique ici, donc rien ne justifierait d'attendre — même principe que la tentative de mot
  entier de Word Sonar, jamais soumise à un tour.
- **L'hôte reste seul·e arbitre de manche pour TOUTE la session, jamais d'alternance** —
  contrairement à Doodle Duel (dessinateur·rice qui change à chaque manche) ou Edge Letters
  (arbitre qui change à chaque manche) : il n'y a structurellement rien à cacher ici, la banque de
  questions (texte ET bonne réponse) est publique et identique dans les deux bundles avant même le
  début de la partie. Le·la "pouvoir" de l'hôte se limite à l'ORDRE des questions (mélange
  Fisher-Yates local, jamais transmis ni à reproduire côté invité·e) — zéro avantage d'information
  ou de score, un modèle de confiance plus simple que tous les autres jeux du hub.
- **Déviation volontaire de la spec générée, pour une vraie raison propre à cette app bilingue** :
  la spec suggérait de transmettre le texte complet de la question/des choix sur le réseau ("pour
  que les deux affichent un texte identique"). Cette app est fr/en (next-intl) — si le texte
  voyageait sur le réseau, un·e invité·e en anglais verrait la question dans la langue de l'hôte.
  Fix : seul `questionId` traverse `duoquiz-round-start` ; chaque client résout le prompt/les choix
  dans SA PROPRE locale via la banque bilingue partagée (`lib/duo-quiz/pick-questions.ts`) — jamais
  de texte de jeu en dur envoyé sur le réseau, cohérent avec la convention i18n déjà établie
  (IDs sur le réseau/dans la config, labels résolus localement). Par la même logique, `durationMs`
  et le nombre total de manches ne sont pas non plus transmis (constantes partagées de `config.ts`,
  jamais négociées — même principe que la grille/les tailles de navires de Fleet Siege).
- **Chaque camp grade sa PROPRE réponse localement** (via la banque publique, par `questionId`) et
  n'envoie QUE le verdict booléen — jamais le choix exact ni la bonne réponse, qui ne sont une
  information nouvelle pour personne. `duoquiz-round-end` est une pure balise de synchronisation
  (pas de `correctIndex` à bord, déjà retrouvable localement) : son seul rôle est de garantir que
  les deux écrans révèlent au MÊME instant — jamais un calcul local sur son propre chrono, sinon la
  réponse apparaîtrait en avance chez qui a fini son décompte en premier pendant que l'autre
  choisit encore.
- **Manche terminée par le premier de deux déclencheurs locaux** (les deux verdicts connus, OU le
  propre chrono de l'hôte expiré) — gardée par `roundEndedRef`, même classe de bug que les autres
  jeux du hub mais ici deux déclencheurs locaux sur UN SEUL client plutôt que deux humains qui
  cliquent. Une réponse absente à l'expiration compte comme fausse.
- **Enchaînement AUTOMATIQUE vers la manche suivante après la pause de révélation**
  (`config.duoQuiz.revealPauseMs` = 1,5s) — AUCUN clic manuel, contrairement à "Manche suivante"
  d'Edge Letters/Word Sonar : cohérent avec l'absence de tour, la manche suivante n'attend
  l'action de personne. `duoquiz-game-over` porte le score final comme filet de sécurité canonique
  (au cas où un `duoquiz-answer-result` se serait perdu en route), pour que les deux récaps
  affichent toujours le même total.
- **Bug réel trouvé avant tout test, en écrivant `replay()`** : la première version remettait
  `phase` à `"lobby"` sans jamais repasser `hasStarted` à `false` — `DuoQuizClient.tsx` n'aiguille
  que sur `hasStarted` pour choisir entre salle d'attente et écran de jeu, donc l'invité·e serait
  resté·e coincé·e sur l'écran de manche (vide, aucune question chargée) après un "Rejouer" plutôt
  que de revenir à la salle d'attente. Fix : `replay()` repasse aussi `hasStarted` à `false`. En
  creusant ce point, le même souci semble présent dans `use-duel-session.ts`/
  `use-edge-letters-session.ts` (`replay()` ne réinitialise pas non plus `hasStarted` sur ces deux
  jeux) — Doodle Duel s'en sort car `DuelRoundStage.tsx` gère explicitement un cas `phase ===
  "lobby"` propre, mais `EdgeLettersRoundStage.tsx` n'a pas cette branche et retournerait `null`.
  Non corrigé ici (hors périmètre de cette session de travail, jeux déjà livrés séparément) —
  signalé pour un futur passage dédié plutôt que corrigé à la volée.
- **Banque bilingue, licence non applicable** : contrairement à la liste de mots français d'Edge
  Letters (dataset tiers), ces 24 questions de culture générale sont rédigées directement pour ce
  projet — pas de fichier de licence nécessaire. Choisies volontairement "increvables" (géographie,
  sciences, histoire, culture générale) plutôt que liées à l'actualité, pour ne jamais devenir
  fausses avec le temps.
- Vérifié bout en bout : `e2e/tests/duo-quiz.spec.ts` (partie complète de 8 questions, une manche à
  fin anticipée avec vérification qu'aucune révélation n'apparaît chez l'invité·e avant sa propre
  réponse, une manche terminée par expiration du chrono côté invité·e silencieux, récap
  téléchargeable, "Rejouer" testé des deux côtés indépendamment sans reconnexion) + suite e2e
  complète rejouée sans régression — réussi du premier coup une fois le bug `replay()` corrigé.
- **Pas encore fait** : 4 jeux du roadmap restent à construire (Ultimate Tic-Tac-Toe ensuite selon
  l'ordre de priorité — voir `docs/GAMES-ROADMAP-DRAFT.json`).
