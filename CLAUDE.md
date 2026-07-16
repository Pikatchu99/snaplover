# CLAUDE.md — SnapLover

## What this is
SnapLover (nom de code technique/dossier : `snaproom`, voir note de nommage plus bas) est une app
web où deux personnes à distance rejoignent une room, activent leur caméra, et prennent une bande
photo ensemble via un compte à rebours synchronisé (WebRTC P2P). Aucun compte requis. Projet gratuit
et open source, FR-first. Spécification complète : `docs/SNAPROOM-SPEC.md`.

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
```

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

## i18n (architecture prête à évoluer)
Une seule locale aujourd'hui (`fr`), mais l'architecture est pensée pour brancher une vraie lib
i18n (next-intl ou équivalent) plus tard sans réécrire les appelants :
- **Tous** les textes visibles par l'utilisateur vivent dans `web/src/i18n/messages.ts`, jamais en
  dur dans un composant/hook/page. Structure : un objet par locale (`messages.fr`), une clé par
  écran/feature, exporté aussi directement comme `fr` pour un usage simple aujourd'hui.
  Import : `import { fr } from "@/i18n/messages"`, puis `fr.lobby.title`, etc. Fonctions avec
  paramètres pour les messages interpolés (ex. `fr.captureStage.pose(current, total)`).
- Les registres de config (frames, filtres) ne contiennent **jamais** de label affiché — juste des
  IDs et de la config visuelle pure (couleurs, CSS). Le mapping ID → label affiché vit dans
  `messages.ts` (`fr.frames`, `fr.photoStrip.filters`), résolu au niveau du composant.
- Quand une vraie lib i18n sera branchée : remplacer l'import direct de `fr` par un hook
  `useTranslations()`/équivalent qui lit dans le même arbre de clés — pas de refonte de structure.

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
     bloqué à vie à attendre une donnée qui ne viendra jamais) ; à la reconnexion, `channel.onOpen`
     relance automatiquement `triggerCapture(pendingPoseRef.current)` côté hôte — la pose reprend
     entièrement à zéro pour les deux pairs. `CaptureStage.tsx` affiche le bon message ("on attend
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
- Prochaine étape : **J6** — voir docs/SNAPROOM-SPEC.md §17 (purge complète des rooms orphelines
  déjà en place côté signaling depuis J1 ; reste à confirmer le périmètre exact de J6 avec l'auteur).
