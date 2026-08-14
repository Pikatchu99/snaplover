# Previews par PR — SnapLover

Chaque PR ouverte qui touche `web/**` ou `signaling/**` obtient sa propre URL de test, en plus de la
prod — pour pouvoir vérifier une feature avant de merger, sans être obligé de merger pour la tester
(voir CLAUDE.md "Doodle Duel"/"Duo Doodle" pour deux exemples où l'inverse a coûté cher).

Complètement séparé de la prod (`deploy/docker-compose.yml`, jamais touché ici) : un couple de
conteneurs web+signaling par PR, routés via un proxy inverse (**Traefik**) derrière un sous-domaine
wildcard — `pr-<N>-preview.hbdwall.xyz`. À la fermeture de la PR (mergée ou pas), les conteneurs
sont détruits automatiquement.

**Prérequis** : le bootstrap de `docs/DEPLOY.md` déjà fait (VPS, tunnel Cloudflare, utilisateur
`deploy`, secrets GitHub) — ce document ne fait qu'ajouter la partie preview par-dessus.

**Tout ce qui suit (étapes 1 à 5) est à faire une seule fois.** Après ça, chaque PR obtient sa
preview automatiquement, plus aucune manip manuelle.

## Wildcard racine, pas scopé — pourquoi

Une première version de ce guide scopait le wildcard sous `*.snaplover-preview.hbdwall.xyz` (deux
niveaux sous `hbdwall.xyz`) pour ne surtout pas affecter les autres projets hébergés sur ce même
domaine. **Testé en conditions réelles, ça échoue** : le certificat TLS gratuit automatique de
Cloudflare ("Universal SSL") ne couvre qu'**un seul niveau** de sous-domaine — un hostname à deux
niveaux comme `pr-0.snaplover-preview.hbdwall.xyz` répond en échec de handshake TLS, jamais en 404,
avant même d'atteindre le tunnel.

Le wildcard est donc à la racine — `*.hbdwall.xyz`, le même niveau que `snaplover.hbdwall.xyz`
aujourd'hui (déjà couvert par le certificat gratuit existant, rien de nouveau à activer). Risque
réel mais limité : en DNS, un enregistrement explicite existant passe toujours avant un wildcard —
ça ne casse **rien** de ce qui existe déjà sur la zone. Le vrai impact : si tu (ou quelqu'un
d'autre) crées un **nouveau** sous-domaine `hbdwall.xyz` pour un projet différent plus tard, il
faudra lui donner son propre enregistrement DNS explicite dès sa création — sinon il passerait par
erreur dans ce tunnel et recevrait un 404 de Traefik au lieu de son vrai contenu.

## Qui fait quoi

Chaque étape précise la machine et le compte à utiliser — récap avant de commencer :

| Étape | Machine | Compte |
|---|---|---|
| 1 | VPS (SSH) | celui qui a fait `cloudflared tunnel login` dans DEPLOY.md étape 5 (souvent root) |
| 2 | VPS (SSH) | `deploy` (le compte dédié créé dans DEPLOY.md étape 2) |
| 3 | VPS (SSH) | root, ou ton compte perso **avec `sudo`** |
| 4 | Site web GitHub | — |
| 5 | N'importe où | — |

`deploy` et `root` (ou ton compte perso) sont **deux comptes différents** sur le même VPS — pas de
confusion possible si tu ouvres une connexion SSH séparée pour chacun, comme indiqué à chaque étape.

---

## Étape 1 — Cloudflare : sous-domaine wildcard

**Sur le VPS**, avec le compte qui a fait `cloudflared tunnel login` la première fois (dans
`docs/DEPLOY.md` étape 5 — le plus souvent root, puisque c'est root qui gère le service
`cloudflared` ensuite ; si tu ne sais plus, connecte-toi en root et essaie, ça échouera clairement
si ce n'est pas le bon compte) :

```bash
ssh root@TON_VPS_IP
```

Puis, une fois connecté :

```bash
cloudflared tunnel route dns snaplover '*.hbdwall.xyz'
```

Si cette commande répond une erreur d'authentification, refais `cloudflared tunnel login` avec ce
même compte avant de réessayer (voir DEPLOY.md étape 5).

## Étape 2 — VPS : réseau partagé + Traefik

**Sur le VPS, en tant que `deploy`** (pas root — c'est le compte que les workflows GitHub utilisent
ensuite, les fichiers doivent être dans SON dossier personnel) :

```bash
ssh -i ~/.ssh/snaplover_deploy deploy@TON_VPS_IP
```

Une fois connecté en tant que `deploy`, **vérifie où tu es avant chaque fichier créé ci-dessous**
(`pwd` doit afficher `/home/deploy/snaplover/preview`, jamais `/home/deploy/snaplover` tout court —
une confusion ici écraserait le `docker-compose.yml` de la PROD, pas celui de la preview) :

```bash
mkdir -p ~/snaplover/preview && cd ~/snaplover/preview
pwd   # vérifie AVANT de continuer : doit finir par /snaplover/preview
```

**Fichier 1/3** — colle ce bloc entier (du `cat` au `EOF` final) et appuie sur Entrée :

```bash
cat > docker-compose.yml <<'EOF'
services:
  traefik:
    image: traefik:v3.2
    container_name: snaplover-preview-traefik
    restart: unless-stopped
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=snaplover-preview-net
      - --entrypoints.web.address=:80
    ports:
      - "127.0.0.1:3999:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - preview-net
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

networks:
  preview-net:
    name: snaplover-preview-net
EOF
```

**Fichier 2/3** — même principe, un seul bloc à coller :

```bash
cat > docker-compose.pr.yml <<'EOF'
services:
  web:
    image: ghcr.io/pikatchu99/snaplover/web:${WEB_IMAGE_TAG}
    container_name: snaplover-pr-${PR_NUMBER}-web
    restart: unless-stopped
    env_file:
      - shared.env
    mem_limit: 512m
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pr-${PR_NUMBER}-web.rule=Host(`pr-${PR_NUMBER}-preview.${PREVIEW_DOMAIN}`)"
      - "traefik.http.services.pr-${PR_NUMBER}-web.loadbalancer.server.port=3000"
    networks:
      - preview-net
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

  signaling:
    image: ghcr.io/pikatchu99/snaplover/signaling:${SIGNALING_IMAGE_TAG}
    container_name: snaplover-pr-${PR_NUMBER}-signaling
    restart: unless-stopped
    environment:
      PORT: "8080"
      MAX_ROOMS: "20"
      ALLOWED_ORIGIN: "https://pr-${PR_NUMBER}-preview.${PREVIEW_DOMAIN}"
    mem_limit: 256m
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pr-${PR_NUMBER}-ws.rule=Host(`pr-${PR_NUMBER}-preview-ws.${PREVIEW_DOMAIN}`)"
      - "traefik.http.services.pr-${PR_NUMBER}-ws.loadbalancer.server.port=8080"
    networks:
      - preview-net
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

networks:
  preview-net:
    name: snaplover-preview-net
    external: true
EOF
```

**Fichier 3/3** — celui-ci, remplace `TON_TURN_USERNAME`/`TON_TURN_CREDENTIAL` (ou `TON_TURN_SECRET`)
par les **mêmes valeurs déjà présentes** dans `~/snaplover/web.env` (`cat ~/snaplover/web.env` pour
les récupérer si besoin — copie exactement les mêmes, pas de nouvelles à générer) :

```bash
cat > shared.env <<'EOF'
STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_URLS=turn:standard.relay.metered.ca:80
TURN_USERNAME=TON_TURN_USERNAME
TURN_CREDENTIAL=TON_TURN_CREDENTIAL
TURN_SECRET=TON_TURN_SECRET
EOF
```

Puis, toujours en tant que `deploy`, démarre Traefik (une seule fois — il reste tournant en
permanence après ça, les prochaines étapes ne le redémarrent jamais) :

```bash
docker compose up -d
```

Vérifie que ça a marché :

```bash
curl http://localhost:3999/
# doit répondre "404 page not found" — normal, aucune preview n'est encore déployée,
# ça prouve juste que Traefik répond.
```

## Étape 3 — VPS : ajouter la règle wildcard au tunnel

**Sur le VPS, en root** (nouvelle connexion — repars de root, pas de `deploy` cette fois) :

```bash
ssh root@TON_VPS_IP
```

Remplace le fichier entier d'un coup (plus sûr qu'éditer une ligne précise à la main dans `nano` —
c'est une erreur d'ordre des règles qui a fait planter le tunnel la première fois) :

```bash
cat > /etc/cloudflared/config.yml <<'EOF'
tunnel: snaplover
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: snaplover.hbdwall.xyz
    service: http://localhost:3002
  - hostname: snaplover-signaling.hbdwall.xyz
    service: http://localhost:8080
  - hostname: "*.hbdwall.xyz"
    service: http://localhost:3999
  - service: http_status:404
EOF
```

Remplace `<TUNNEL_ID>` par ton vrai UUID (visible dans `journalctl -xeu cloudflared.service`, champ
`tunnelID=`, ou déjà présent dans le fichier actuel : `cat /etc/cloudflared/config.yml` avant de le
remplacer si tu veux le récupérer). **La dernière ligne (`http_status:404`) doit rester la toute
dernière** — c'est exactement l'ordre qui a fait échouer le tunnel la première fois.

```bash
systemctl restart cloudflared
systemctl status cloudflared
# doit afficher "active (running)" — si ça affiche "activating (auto-restart)",
# lance `journalctl -xeu cloudflared.service -n 30 --no-pager` pour voir l'erreur exacte.
```

Vérifie que la prod répond toujours (priorité absolue avant de continuer) :

```bash
curl -sI https://snaplover.hbdwall.xyz/ | head -1
curl -sI https://snaplover-signaling.hbdwall.xyz/health | head -1
# les deux doivent répondre 200
```

## Étape 4 — GitHub : secret du repo

Sur **github.com** (pas le VPS) : Settings → Secrets and variables → Actions → Secrets → New
repository secret. Un seul secret en plus de ceux de DEPLOY.md étape 7 :

| Secret | Valeur |
|---|---|
| `PREVIEW_DOMAIN` | `hbdwall.xyz` |

## Étape 5 — Vérifier l'automatisation

Ouvre une PR qui touche `web/**` (une modif triviale suffit), regarde l'onglet Actions du repo
GitHub : le workflow **Deploy preview** doit builder, pousser sur GHCR, déployer par SSH, puis
poster un commentaire sur la PR avec l'URL (`https://pr-<N>-preview.hbdwall.xyz`). Ouvre ce lien,
vérifie que la page se charge. Ferme la PR, vérifie que **Teardown preview** tourne et que
(reconnecté en `deploy`, voir étape 2) `docker ps` ne montre plus les conteneurs
`snaplover-pr-<N>-*`.

---

## Ce qui n'est PAS automatisé (limites connues, volontairement pas construites pour ce premier jet)

- **Nettoyage GHCR** : les images `ghcr.io/.../web:pr-<N>` et `signaling:pr-<N>` ne sont jamais
  supprimées du registre à la fermeture d'une PR (seuls les conteneurs et images locales sur le VPS
  le sont). Pas un vrai problème au volume actuel — à revisiter si le nombre de PR fermées
  s'accumule et que le stockage GHCR devient sensible.
- **Capacité du VPS** : chaque PR ouverte consomme de la RAM/CPU en continu tant qu'elle reste
  ouverte (limites posées : 512 Mo pour web, 256 Mo pour signaling, voir
  `deploy/preview/docker-compose.pr.yml`) — pas de plafond sur le nombre de PR simultanées. À
  surveiller si plusieurs PR restent ouvertes longtemps en parallèle sur un VPS déjà partagé avec
  d'autres projets.
- **`ALLOWED_ORIGIN` par preview** : chaque signaling de preview n'autorise que l'origine de SA
  propre PR (`https://pr-<N>-preview.hbdwall.xyz`) — cohérent avec la même logique que la prod (voir
  CLAUDE.md checklist OWASP §4), pas une simplification côté sécurité.
- **Wildcard racine `*.hbdwall.xyz`** : voir "Wildcard racine, pas scopé — pourquoi" plus haut — tout
  nouveau sous-domaine `hbdwall.xyz` créé pour un projet différent de snaplover doit avoir son propre
  enregistrement DNS explicite dès sa création.
