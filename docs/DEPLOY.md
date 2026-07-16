# Déploiement — SnapLover

Tout tourne sur un seul VPS, en Docker, exposé via **Cloudflare Tunnel** — aucun port entrant ouvert
sur le VPS, Cloudflare gère le TLS. CI/CD via GitHub Actions : chaque push sur `main` qui touche
`web/**` ou `signaling/**` build l'image Docker correspondante, la pousse sur GHCR, puis se connecte
en SSH au VPS pour `docker compose pull && up -d` — automatique après le bootstrap ci-dessous.

Domaines : `snaplover.hbdwall.xyz` (web) et `snaplover-signaling.hbdwall.xyz` (signaling), tous les
deux sur la zone Cloudflare de `hbdwall.xyz`.

**Tout ce qui suit est à faire une seule fois.** Après ça, chaque push déploie tout seul.

---

## Étape 1 — VPS : prérequis système

En SSH sur le VPS, avec ton compte habituel :

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# se reconnecter (ou `newgrp docker`) pour que l'appartenance au groupe prenne effet

# cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared
```

## Étape 2 — VPS : utilisateur dédié au déploiement

Jamais ton compte perso, jamais root — un compte qui ne sert qu'à ça :

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
```

## Étape 3 — Ta machine : clé SSH dédiée au déploiement

```bash
ssh-keygen -t ed25519 -f ~/.ssh/snaplover_deploy -C "github-actions-deploy" -N ""
```

Ça crée deux fichiers : `~/.ssh/snaplover_deploy` (clé **privée** — ira dans un secret GitHub à
l'étape 7, ne la partage jamais ailleurs) et `~/.ssh/snaplover_deploy.pub` (clé publique).

## Étape 4 — VPS : autoriser la clé

```bash
ssh-copy-id -i ~/.ssh/snaplover_deploy.pub deploy@TON_VPS_IP
# Vérifie que ça marche avant de continuer :
ssh -i ~/.ssh/snaplover_deploy deploy@TON_VPS_IP echo ok
```

## Étape 5 — Cloudflare : créer et authentifier le tunnel

Sur le VPS (le compte `deploy` ou root, peu importe — `cloudflared` tournera en service système
géré par root de toute façon) :

```bash
# Authentification interactive : affiche un lien, à ouvrir dans TON navigateur,
# connecté au compte Cloudflare qui possède la zone hbdwall.xyz.
cloudflared tunnel login

# Crée le tunnel — note l'UUID affiché, tu en as besoin à l'étape suivante.
cloudflared tunnel create snaplover

# Route les deux domaines vers ce tunnel (crée les enregistrements DNS
# nécessaires automatiquement sur la zone Cloudflare).
cloudflared tunnel route dns snaplover snaplover.hbdwall.xyz
cloudflared tunnel route dns snaplover snaplover-signaling.hbdwall.xyz
```

## Étape 6 — VPS : config du tunnel (2 services, 1 tunnel)

```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml <<'EOF'
tunnel: snaplover
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: snaplover.hbdwall.xyz
    service: http://localhost:3002
  - hostname: snaplover-signaling.hbdwall.xyz
    service: http://localhost:8080
  - service: http_status:404
EOF
```

Remplace `<TUNNEL_ID>` par l'UUID de l'étape 5 (modèle de référence :
`deploy/cloudflared/config.yml.example` dans ce repo).

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared   # doit être "active (running)"
```

## Étape 7 — GitHub : secrets du repo

Settings → Secrets and variables → Actions → Secrets (tout en Secrets ici — `NEXT_PUBLIC_*`
pourrait techniquement aller en Variables puisque non sensible par nature, mais Secrets fonctionne
tout aussi bien et évite d'avoir deux emplacements différents à gérer) :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP ou hostname du VPS |
| `VPS_DEPLOY_USER` | `deploy` |
| `VPS_DEPLOY_SSH_KEY` | contenu de `~/.ssh/snaplover_deploy` (la clé **privée** de l'étape 3) |
| `VPS_SSH_PORT` | optionnel, `22` par défaut |
| `NEXT_PUBLIC_SITE_URL` | `https://snaplover.hbdwall.xyz` |
| `NEXT_PUBLIC_SIGNALING_URL` | `wss://snaplover-signaling.hbdwall.xyz` |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | optionnel, si analytics activé |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | optionnel, si analytics activé |

`GITHUB_TOKEN` (push vers GHCR + login sur le VPS pour le pull) est fourni automatiquement, rien à
ajouter.

## Étape 8 — VPS : premier déploiement manuel (bootstrap uniquement)

```bash
mkdir -p ~/snaplover && cd ~/snaplover

# Depuis ce repo (en local, ou via `git clone` temporaire sur le VPS) copier :
#   deploy/docker-compose.yml       → ~/snaplover/docker-compose.yml
#   deploy/web.env.example          → ~/snaplover/web.env       (puis remplir les vraies valeurs)
#   deploy/signaling.env.example    → ~/snaplover/signaling.env (puis remplir les vraies valeurs)

docker login ghcr.io -u Pikatchu99   # PAT GitHub avec le scope read:packages suffit
docker compose pull
docker compose up -d

curl http://localhost:3002/          # doit répondre 200
curl http://localhost:8080/health    # doit répondre "ok"
curl https://snaplover.hbdwall.xyz/            # doit répondre via le tunnel
curl https://snaplover-signaling.hbdwall.xyz/health   # idem
```

## Étape 9 — Vérifier l'automatisation

Pousse un commit anodin touchant `signaling/` ou `web/` sur `main`, regarde l'onglet Actions du
repo GitHub : build → push GHCR → déploiement SSH doivent se dérouler sans intervention.

---

## Résumé de l'architecture

- `web/` et `signaling/` tournent chacun dans un conteneur Docker, tous les deux **bindés
  uniquement sur `127.0.0.1`** — aucun des deux n'est jamais exposé directement.
- `cloudflared` (service système, hors Docker) est la SEULE chose qui parle à l'extérieur — en
  sortant vers Cloudflare, jamais en écoutant un port entrant. Cloudflare route ensuite le trafic
  public des deux domaines vers les bons ports locaux.
- `web/Dockerfile` utilise la sortie `standalone` de Next.js (voir `next.config.ts`) — un
  `server.js` autonome, pas besoin de Vercel.
- Les variables `NEXT_PUBLIC_*` (URL du site, du signaling, Umami) sont figées dans l'image au
  **build** (`--build-arg`, voir `.github/workflows/deploy-web.yml`) ; les variables serveur
  (`STUN_URLS`, `TURN_*`, `ALLOWED_ORIGIN`) restent runtime-only, lues depuis `web.env`/
  `signaling.env` sur le VPS, jamais embarquées dans l'image.
