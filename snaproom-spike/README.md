# SnapRoom — spike de faisabilité WebRTC

Prototype jetable. Objectif unique : **prouver que la connexion vidéo P2P et la capture synchrone marchent entre deux appareils sur deux réseaux différents.** Ce n'est pas du code de production.

## Ce qu'on veut vérifier

1. La connexion P2P s'établit entre laptop (wifi) et téléphone (4G).
2. Elle passe en **STUN seul** (gratuit) ou il faut un **TURN** (métrique « TURN nécessaire ? »).
3. Le 3·2·1 se déclenche assez « en même temps » des deux côtés (métrique « Écart de capture »).
4. La capture locale produit bien une image nette.

## Prérequis

- Node.js 18+ installé.

## Lancer

```bash
cd snaproom-spike
npm install
npm start
```

Le serveur tourne sur `http://localhost:8080`. Mais la caméra exige du **HTTPS** dès qu'on n'est pas sur localhost — donc pour tester avec le téléphone, on expose via un **tunnel**.

## Exposer en HTTPS avec un tunnel

Un tunnel donne une URL publique `https://...` qui pointe vers ton serveur local, le temps du test.

### Option A — cloudflared (aucun compte requis)

```bash
# macOS
brew install cloudflared
# puis, serveur déjà lancé sur 8080 :
cloudflared tunnel --url http://localhost:8080
```

Il affiche une URL du type `https://xxxx.trycloudflare.com`. C'est celle-là qu'on ouvre.

### Option B — ngrok (compte gratuit)

```bash
brew install ngrok
ngrok config add-authtoken TON_TOKEN   # une seule fois, token sur ngrok.com
ngrok http 8080
```

Il affiche `https://xxxx.ngrok-free.app`.

## Mener le test (laptop + téléphone 4G)

1. Laptop : ouvre l'URL HTTPS du tunnel. Garde le même **code** (ex : `TEST1`). Clique **Activer la caméra**, autorise, puis **Se connecter**. Tu es l'hôte (1er connecté).
2. Téléphone : **coupe le wifi, passe en données mobiles 4G** (crucial : c'est ce qui crée un 2e réseau/NAT différent). Ouvre la même URL, même code, **Activer la caméra**, **Se connecter**.
3. Les deux vidéos doivent apparaître. Sur le laptop, clique **Déclencher le 3·2·1**.

## Ce qu'il faut observer (les métriques)

- **État connexion** → doit passer à `connected`.
- **Type (NAT)** → `host` ou `srflx` = bon. `relay` = TURN utilisé.
- **TURN nécessaire ?** → la réponse business : si « non », l'infra reste gratuite.
- **RTT** → latence aller-retour, en ms.
- **Offset horloge** → décalage estimé entre les 2 horloges (le spike le corrige).
- **Écart de capture** → différence de timing entre les 2 photos. < ~150 ms = très bon pour une photo.

## Si « État connexion » reste bloqué (échec avec STUN seul)

Cela veut dire que ton réseau nécessite un TURN. Pour le confirmer :

1. Ouvre un TURN de test (ex : un compte d'essai Metered / Twilio, ou un `coturn` auto-hébergé).
2. Sur les deux appareils, déplie « Serveur TURN optionnel », remplis URL / user / cred **avant** de cliquer « Se connecter ».
3. Reteste. Si ça connecte maintenant → TURN est requis pour ces réseaux.

## Limites connues (c'est un spike)

- Une seule pose (pas la bande complète). Suffisant pour valider la synchro.
- L'échange d'image passe par le data channel (ok pour une image ; en prod, upload serveur).
- Capture via `<canvas>` depuis la vidéo (robuste, iOS inclus). En prod : `ImageCapture.takePhoto()` pour la pleine résolution capteur.
- Pas de gestion fine des reconnexions.
