# CLAUDE.md — SnapRoom

## What this is
SnapRoom est une app web où deux personnes à distance rejoignent une room, activent leur caméra,
et prennent une bande photo ensemble via un compte à rebours synchronisé (WebRTC P2P). Aucun
compte requis. Projet gratuit et open source, FR-first. Spécification complète : `docs/SNAPROOM-SPEC.md`.

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
│  ├─ src/hooks/                # use-user-media, use-room-connection
│  ├─ src/lib/
│  │  ├─ webrtc/                # peer-connection, use-ice-servers, turn-credentials
│  │  ├─ signaling/             # client WS
│  │  ├─ realtime/              # clock-sync, capture scheduling
│  │  ├─ capture/               # getFrame, compose, export PNG
│  │  └─ frames/                # définitions des cadres
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
- Prochaine étape : **J4 — Le livrable** (écran résultat avec cadres/thèmes, filtres, partage —
  voir docs/SNAPROOM-SPEC.md §12 E6, §13).
