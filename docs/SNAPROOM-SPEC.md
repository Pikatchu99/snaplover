# SnapRoom — Spécification complète du projet

> Document de référence pour le build (Claude Code / VSCode).
> **Statut : faisabilité technique validée par un spike** (voir §4). On construit le vrai produit.
> Langue produit : **français**. Commentaires de code : anglais.
> Faites une bande photo ensemble, même à distance. Une version de base est gratuite, et le cœur
> technique est open source.

---

## 1. Résumé exécutif

SnapRoom est une app web où **deux personnes à distance** rejoignent un même lien, activent leur caméra, et prennent une **bande photo ensemble** : un compte à rebours 3·2·1 synchrone déclenche la capture sur les deux écrans au même instant, et chaque case de la bande contient les **deux partenaires côte à côte**. Format inspiré du 인생네컷 (photobooth coréen). Aucun compte requis pour jouer. Cible : couples à distance (Afrique francophone + diaspora en priorité).

Référence marché : **Angie (getangie.com)**, même mécanique côté couple. Notre différenciation initiale : FR-first, léger pour réseaux lents, open source.

---

## 2. Vision produit & positionnement

- **Pour qui** : couples séparés géographiquement (2 personnes par room, strictement).
- **Problème** : aucun moyen simple de prendre une *vraie* photo ensemble à distance (les captures d'écran de visio sont moches et désynchronisées).
- **Valeur** : « une bande photo à deux, même à distance », téléchargeable et partageable.
- **Ton** : intime, complice, joyeux mais sobre.
- **Contrainte marché** : mobile-first, tolérant aux connexions lentes (data mobile fréquente).

---

## 3. Périmètre

### Dans le MVP
- Room à 2 personnes via lien/code, sans compte.
- Salle d'attente (lobby) avec états caméra.
- Connexion vidéo live P2P (WebRTC) avec STUN + TURN.
- Séance : 3 ou 4 poses, compte à rebours 3·2·1 **synchronisé**.
- Capture locale, échange, composition de la bande (chaque case = 2 demi-cadres).
- Cadres/thèmes swappables, téléchargement PNG, partage.
- Tous les états d'erreur (voir §12).

### Hors MVP (plus tard)
- Plus de 2 participants / mode groupe.
- Comptes, historique, galerie persistante.
- TURN auto-hébergé (coturn) — au début on utilise les offres gratuites.
- Watch-along, autres activités type Angie.
- Filtres avancés, GIF/vidéo de la séance.

---

## 4. Résultats de faisabilité (déjà validés — ne pas re-tester, ré-utiliser)

Un spike (`snaproom-spike/`) a prouvé le cœur technique entre laptop (wifi) et téléphone (4G) :

- **Connexion P2P** : OK. En même réseau → `host` direct. Entre wifi et 4G → connexion directe **impossible** (CGNAT mobile), mais **TURN débloque** (type `relay`).
- **Conséquence** : un **serveur TURN est nécessaire** pour les utilisateurs en data mobile / réseaux stricts. STUN (gratuit) suffit pour une partie des cas wifi↔wifi.
- **Synchro de capture** : écart mesuré **24 ms en local, 100 ms via TURN lointain** — bien sous le seuil acceptable (~150 ms). Le compte à rebours synchronisé fonctionne.
- **Latence** : RTT 31 ms en direct, 325 ms via TURN US gratuit → **héberger/choisir un TURN proche des utilisateurs** améliore nettement l'expérience.
- **Pipeline complet** (capture locale → échange → composition → PNG) : fonctionnel.

**Le code prouvé du spike (clock-sync, scheduling de capture, composition) doit être repris et durci, pas réinventé.** Voir §9 et §10 pour l'algorithme exact.

---

## 5. Stack technique

| Domaine | Choix | Note |
|--------|-------|------|
| Framework UI | **Next.js (App Router) + React 19 + TypeScript strict** | Landing en SSR (SEO). App room côté client. |
| Styling | **Tailwind CSS v4** | Mobile-first. |
| Composants | **shadcn/ui** (Radix) | Pas d'alert/confirm natifs. |
| Data fetching (REST) | **TanStack Query** | Pour les rares appels REST (ex: /turn-credentials). |
| Animations | **Framer Motion** | Sobres, 150–300 ms, ease-out. |
| Icônes | **Lucide** | **Jamais d'emoji dans l'UI.** |
| Temps réel | **WebRTC** (natif navigateur) | P2P vidéo + data channel. |
| Signaling | **Service Node séparé + `ws`** | Process WebSocket dédié (repris du spike). |
| TURN/STUN | Google STUN + **TURN via env** (Metered/ExpressTURN gratuits au début) | Creds jamais dans le repo (§11). |
| Persistance | **Aucune BDD au MVP** | Rooms éphémères en mémoire côté signaling. |
| Déploiement | Next.js sur host statique/SSR ; **signaling Node sur un petit host/VPS** | Vercel ne gère pas les WS persistants → signaling ailleurs. |

> Décision réversible : si tu préfères plus léger, alternative = Vite + React + un seul serveur Node (perd le SSR/SEO de la landing).

---

## 6. Architecture globale

```
[ Navigateur A (hôte) ]           [ Navigateur B (invité) ]
        |  \                             /  |
        |   \--- WebSocket signaling ---/   |     (échange SDP/ICE uniquement)
        |          [ Service Node WS ]      |
        |            rooms en mémoire        |
        |                                    |
        \======== WebRTC média P2P ==========/
              (STUN direct, sinon TURN relay)
```

- **Le signaling ne transporte QUE la poignée de main** (offer/answer/ICE). Une fois connectés, la vidéo et les données passent en P2P (ou via TURN), plus par le signaling.
- **Rooms éphémères** : un code identifie une room, 2 pairs max, détruite quand vide.
- Le **premier arrivé = hôte (initiator)** : il crée l'offer, le data channel, et contrôle le déclenchement.

---

## 7. Cycle de vie d'une room

- Code room : court, lisible (ex : 5 caractères A-Z/0-9, sans ambigus type O/0).
- Créer une room → génère le code → l'URL de partage est `/(r|room)/{CODE}`.
- Rejoindre → via lien ou saisie du code.
- Capacité **stricte : 2**. Un 3e reçoit « room pleine » (§12).
- Pas de persistance : à la fermeture des deux onglets, la room disparaît. TTL de sécurité (ex : room orpheline nettoyée après X min).
- Aucun compte, aucune donnée personnelle stockée.

---

## 8. Protocole de signaling (WebSocket)

Messages JSON. Repris et durci depuis `snaproom-spike/server.js`.

**Client → serveur**
- `{ type: "join", room }`
- `{ type: "signal", data: { sdp } | { candidate } }` (relayé tel quel à l'autre pair)

**Serveur → client**
- `{ type: "joined", initiator: boolean, peers: number }`
- `{ type: "full" }` (room déjà à 2)
- `{ type: "peer-ready", peers: number }` (le 2e pair est arrivé → l'hôte peut lancer l'offer)
- `{ type: "peer-left" }`
- `{ type: "signal", data }` (relais du pair)

Règles serveur : map `room → Set<socket>` (2 max) ; 1er = initiator ; à la déconnexion, notifier l'autre et purger la room si vide. Ajouter au MVP : validation du code, limite de rooms, heartbeat/ping pour purger les sockets morts.

---

## 9. Protocole temps réel (WebRTC + data channel)

### Établissement
- `RTCPeerConnection({ iceServers })` où `iceServers` = Google STUN + TURN (récupérés via `/turn-credentials`, §11).
- Hôte : `createDataChannel("ctrl")`, `createOffer`, envoie via signaling.
- Invité : reçoit l'offer, `createAnswer`, reçoit le data channel via `ondatachannel`.
- ICE candidates relayés via signaling au fur et à mesure.
- Afficher l'état (`connectionState`) et, en debug, les types de candidats (`host`/`srflx`/`relay`).

### Clock-sync (sur le data channel) — algorithme validé
L'hôte est la **référence temporelle**. L'invité estime son décalage :
```
invité → hôte : { t:"ping", c: Date.now() }
hôte  → invité: { t:"pong", c, s: Date.now() }
à la réception (r = Date.now()):
   rtt    = r - c
   offset = (s + rtt/2) - r        // offset = horloge_hôte - horloge_locale
```
Répéter ~8 fois, **garder l'échantillon au plus petit RTT** (le plus fiable). Hôte : `offset = 0`.

### Déclenchement synchronisé (par pose)
```
Hôte clique "déclencher" :
   fireAtHost = Date.now() + LEAD_MS     // LEAD_MS ≈ 3200
   envoyer { t:"capture", pose, fireAtHost }
   planifier sa propre capture

Chaque côté à la réception :
   hostNow = Date.now() + offset          // offset=0 pour l'hôte
   delay   = max(0, fireAtHost - hostNow)
   lancer le compte à rebours visuel sur "delay"
   à t=delay : capturer la frame locale, enregistrer captureHostTime = Date.now() + offset
```
La différence `|captureHostTime_A - captureHostTime_B|` = qualité de synchro (à logguer).

### Échange des images
- Chaque côté produit sa moitié (JPEG). Envoi sur le data channel **par chunks** (~12 Ko) : `{t:"img-meta"}` → `{t:"img", part}` × N → `{t:"img-end", hostTime, pose}`.
- Réassembler côté récepteur.
- **MVP** : échange en résolution moyenne (ex : hauteur ~1080) suffisant pour la bande. **Plus tard** : upload serveur des demi-images pleine résolution pour une bande imprimable.

---

## 10. Modèle de la bande & capture

### Composition (règle définitive)
- **Chaque case = une pose = les deux partenaires côte à côte** : moitié gauche = **hôte (initiator)**, moitié droite = **invité (peer)**. Les deux clients composent le **même** résultat.
- Une bande = **N cases** empilées (N = poses choisies : 3 ou 4).
- Styles : **strip vertical** (défaut) ou **grille 2×2**.
- Un **cadre/thème** habille la bande (voir §13).

### Capture technique
- Capturer la frame **locale** au déclenchement : `<video>` → `<canvas>` à `videoWidth/videoHeight`.
  - Idéal : `ImageCapture.takePhoto()` pour la pleine résolution capteur, **avec fallback canvas** (iOS Safari ne supporte pas ImageCapture).
  - Dé-miroir de l'aperçu hôte si le preview est en `scaleX(-1)`.
- Conserver la capture locale ; n'échanger qu'une version compressée pour la bande partagée (MVP).
- Composition via canvas ; export **PNG** (`toDataURL`/`toBlob`).
- Partage : Web Share API (`navigator.share`) si dispo, sinon fallback téléchargement.

---

## 11. TURN / STUN & sécurité des identifiants

- `iceServers` = `[{ urls: [google STUN...] }, ...TURN]`.
- **TURN au début** : offres gratuites **Metered Open Relay** (20 Go/mois) et **ExpressTURN** (1000 Go/mois). On peut lister plusieurs serveurs ; ICE choisit.
- **RÈGLE ABSOLUE (projet open source)** : **aucun identifiant TURN dans le repo**. Les secrets vivent en variables d'environnement côté serveur.
- Pattern recommandé : endpoint **`GET /api/turn-credentials`** (côté Next ou signaling) qui renvoie `{ iceServers: [...] }`.
  - MVP : injecte les creds statiques (env) via cet endpoint, jamais dans le bundle client.
  - Mieux (dès que possible) : **creds éphémères** (TURN REST : `username = <expiry>:<label>`, `credential = base64(HMAC-SHA1(secret, username))`) pour ne jamais exposer le secret durable.
- Plus tard : **coturn** auto-hébergé sur VPS proche des utilisateurs (meilleure latence, pas de quota). Doc d'install séparée à produire le moment venu.

---

## 12. Spécification écran par écran

> Les maquettes validées existent dans le dossier projet : `SnapRoom hi-fi.dc.html`, `SnapRoom session.dc.html`, `SnapRoom états.dc.html`, `Design system.dc.html`. **S'y référer pour le rendu exact.** Copy en français ci-dessous.

### E1. Landing (mobile + desktop)
- Titre : « Une seule photo. À deux, même à distance. »
- Sous-titre : « Rejoignez un lien, caméras allumées, 3·2·1 — clic. Vous repartez chacun avec la même bande photo, où que vous soyez. »
- CTA principal : **Créer une room**. Secondaire : **Rejoindre une room** (lien/code).
- Aperçu visuel d'une bande (cases en demi-cadres). Mention « Aucun compte requis · directement dans le navigateur ».
- Desktop : hero en deux colonnes (texte + bandes flottantes sur fond sombre).

### E2. Rejoindre (Join)
- Surtitre « Quelqu'un vous a invité ? », titre « Rejoindre sa room ».
- Champ code (5 cases). CTA **Rejoindre**. Alt **Créer ma propre room**. Note « Aucun compte requis pour rejoindre. »

### E3. Créer une room
- « Poses par bande » : **3 / 4**.
- « Style de bande » : **Strip vertical / Grille 2×2**.
- « Cadre » : sélection de thème (Classic + packs, §13).
- CTA **Créer et copier le lien**.

### E4. Salle d'attente (lobby) — fond sombre
- Titre « Salle d'attente » + code (copiable).
- Statut « 2 connectés · 1 caméra prête ».
- 2 tuiles caméra avec état : **prête (✓ vert)**, **en cours (… ambre)**, **off (✕ corail)**.
- Message « En attente que {prénom} active sa caméra… ».
- CTA hôte : **Lancer la séance** (désactivé tant que les 2 ne sont pas prêts).

### E5. Capture 3·2·1 — fond sombre
- Badge live, badge « Pose 2 / 4 », consigne « regardez l'objectif… ».
- 2 tuiles caméra côte à côte (hôte / invité).
- Overlay compte à rebours géant (3·2·1) + « PRÊT·E ? ».
- Desktop : sidebar montrant la bande en cours de remplissage (cases faites en demi-cadres, cases restantes en pointillés) + « Encore N poses… ».

### E6. Résultat
- Surtitre « C'est dans la boîte », titre « Votre bande est prête ».
- La bande composée (demi-cadres).
- Actions : **Télécharger PNG**, **Partager**, filtres (Classic / N&B / Chaud), **Reprendre**.
- Encart : « Vous avez chacun votre copie. La bande pleine résolution est enregistrée sur chaque appareil. »

### États obligatoires (maquettes dans `SnapRoom états.dc.html`)
1. **Caméra bloquée** : explication + « Comment autoriser » + **Réessayer**.
2. **Réseau faible (lobby)** : badge « Signal faible », « caméra en cours de reconnexion », live basse def mais **photo pleine résolution**, bouton « Lancer » désactivé en attente.
3. **Compte à rebours suspendu** : overlay « On attend {prénom} », « le 3·2·1 ne se déclenche que si vous êtes prêts tous les deux », reprise auto.
4. **Partenaire déconnecté** : « {prénom} s'est déconnecté·e — on reprend dès son retour. Vos poses déjà prises sont conservées. » Actions Patienter / Renvoyer le lien.
5. **Lien introuvable / expiré** : « Cette room a expiré ou le code est incorrect. » CTA Créer une room / saisir le code.
6. **Room pleine (2/2)** : « SnapRoom, c'est à deux… » CTA Créer une nouvelle room.
7. **Composition (loading)** : « On assemble votre bande… on récupère la moitié pleine résolution de chacun. »

Rappel transverse (préférences) : **toujours** traiter loading / empty / error / success.

---

## 13. Design system

- **Couleurs** : `--ink:#1c1712`, `--paper:#fbf7f1`, `--muted:#8c8378`, `--line:#ece4d8`, `--coral:#fb5a46`, `--coral2:#ff7d54`, `--violet:#6a48f4`, `--dark:#161319`. Écran de capture en **sombre**.
- **Typo** : titres **Bricolage Grotesque** (700/800), corps **Plus Jakarta Sans**.
- **Formes** : coins arrondis généreux, CTA pleins en dégradé coral, boutons secondaires bordés `--ink`.
- **Bande photo** : composant dédié, look rétro-cabine (marges blanches, footer « SNAPROOM · DATE · À DEUX »).
- **Cadres/thèmes** : Classic, Noir, Film + packs (hearts, cherry, gingham, tulips, denim, meadow…). Packs motifs = CSS ; packs illustrés = images. Prévoir un slot « cadre custom ».
- **Mouvement** (Framer Motion) : arrivée d'un participant, tick du compte à rebours, flash de capture, apparition de la bande. Sobre.
- **Interdits** : emojis dans l'UI ; animations gadget.

---

## 14. Structure de projet (proposée)

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
│  │  ├─ room/                  # Lobby, CameraTile, Countdown, CaptureStage
│  │  ├─ strip/                 # PhotoStrip, Frame, composer
│  │  └─ landing/
│  ├─ src/lib/
│  │  ├─ webrtc/                # peer connection, ice config
│  │  ├─ signaling/             # client WS
│  │  ├─ realtime/              # clock-sync, capture scheduling
│  │  ├─ capture/               # getFrame, compose, export PNG
│  │  └─ frames/                # définitions des cadres
│  └─ src/types/                # types partagés (jamais inline)
├─ signaling/                   # service Node WebSocket
│  ├─ server.ts
│  └─ package.json
├─ snaproom-spike/              # spike de faisabilité (référence, ne pas déployer)
└─ README.md
```

---

## 15. Variables d'environnement

**web**
```
NEXT_PUBLIC_SIGNALING_URL=wss://signaling.tondomaine.com
# TURN (côté serveur, exposés via /api/turn-credentials — jamais NEXT_PUBLIC) :
TURN_URLS=turn:...:3478,turns:...:5349
TURN_USERNAME=...
TURN_CREDENTIAL=...
# ou, mode éphémère :
TURN_SECRET=...
```
**signaling**
```
PORT=8080
ALLOWED_ORIGIN=https://tondomaine.com
```

---

## 16. Conventions de code (à respecter)

Reprises des règles projet de l'auteur :
- **TypeScript strict**, pas de `any` non justifié. **Types dans des fichiers dédiés** (`src/types`), jamais éparpillés.
- **TanStack Query** pour toute requête REST (queryKeys en tableau, invalidation ciblée).
- **Jamais** `alert()` / `confirm()` / `prompt()` natifs → composants shadcn (Dialog / AlertDialog / Alert).
- **Jamais d'emoji** dans l'UI/titres/boutons → icônes Lucide.
- Animations **Framer Motion** sobres (150–300 ms, ease-out), uniquement si feedback UX.
- **Mobile-first**, responsive ascendant. Accessibilité (aria, HTML sémantique).
- Nommage : composants PascalCase, hooks `useXxx`, dossiers kebab-case, constantes SCREAMING_SNAKE_CASE.
- Sécurité : validation (zod) des entrées API, pas de secret dans le client/repo, permissions vérifiées.
- Code **lisible et explicite** avant « malin ». Traiter tous les états UI.

> Idée : transformer ce §16 + §5 en un `CLAUDE.md` à la racine du repo pour cadrer Claude Code.

---

## 17. Séquencement du build (jalons)

**J1 — Fondations**
- Scaffold `web` (Next.js, TS, Tailwind, shadcn) + `signaling` (Node ws).
- Porter le serveur du spike dans `signaling/server.ts` (durci : validation, heartbeat, ALLOWED_ORIGIN).
- Endpoint `/api/turn-credentials` (creds via env).
- Vérif : `web` démarre, `signaling` répond, un client se connecte.

**J2 — Cœur temps réel**
- Client signaling + `RTCPeerConnection` (STUN+TURN) + data channel.
- Route `r/[code]` : lobby 2 personnes, tuiles caméra + états.
- Vérif : les 2 flux vidéo s'affichent (test 2 onglets, puis wifi + 4G).

**J3 — La séance**
- Clock-sync + déclenchement synchronisé multi-poses (algo §9).
- Capture locale + échange + composition de la bande (demi-cadres, §10).
- Vérif : bande complète 3/4 poses, écart de capture loggé < ~150 ms.

**J4 — Le livrable**
- Écran résultat : cadres/thèmes, filtres, **PNG**, partage.
- Composant `PhotoStrip` + `Frame` finalisés (design system §13).

**J5 — États & robustesse**
- Tous les états de §12 (caméra refusée, réseau faible, countdown suspendu, déconnexion, lien invalide, room pleine, composition loading).
- Reconnexion propre, purge des rooms.

**J6 — Déploiement**
- `web` déployé (SSR) ; `signaling` sur host/VPS avec WSS ; TURN gratuit branché via env.
- Test end-to-end sur 2 vrais réseaux.

---

## 18. Tests / vérification

- **Local** : 2 onglets, même code (valide le pipeline, pas le NAT).
- **Cross-réseau** : laptop (wifi) + téléphone (4G) via URL HTTPS (tunnel en dev, domaine en prod). C'est le seul test qui valide TURN.
- Observer : `connectionState=connected`, type de candidat (`relay` attendu en 4G), écart de capture, RTT.
- Unitaire : logique de clock-sync (offset/rtt), composition de la bande, génération de code room.
- Manuel : parcourir chaque état de §12.

---

## 19. Annexe — réutiliser le spike

Le dossier `snaproom-spike/` contient un serveur de signaling et un client fonctionnels prouvés :
- `server.js` → base de `signaling/server.ts`.
- `public/index.html` → contient l'implémentation validée de : connexion WebRTC, clock-sync, scheduling de capture synchronisé, échange d'image par chunks, composition côte à côte, lecture des stats ICE (type de candidat).
- **À porter proprement** dans l'archi Next/TS ci-dessus, pas à copier tel quel. C'est la source de vérité pour l'algorithme temps réel.
