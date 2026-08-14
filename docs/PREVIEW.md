# Previews par PR — SnapLover

Chaque PR ouverte qui touche `web/**` ou `signaling/**` obtient sa propre URL de test, en plus de la
prod — pour pouvoir vérifier une feature avant de merger, sans être obligé de merger pour la tester
(voir CLAUDE.md "Doodle Duel"/"Duo Doodle" pour deux exemples où l'inverse a coûté cher).

Complètement séparé de la prod (`deploy/docker-compose.yml`, jamais touché ici) : un couple de
conteneurs web+signaling par PR, routés via un proxy inverse (**Traefik**) derrière un sous-domaine
wildcard dédié — `pr-<N>.snaplover-preview.hbdwall.xyz`. À la fermeture de la PR (mergée ou pas),
les conteneurs sont détruits automatiquement.

**Prérequis** : le bootstrap de `docs/DEPLOY.md` (VPS, tunnel Cloudflare, secrets GitHub) déjà fait
— ce document ne fait qu'ajouter la partie preview par-dessus.

**Tout ce qui suit (étapes 1 à 5) est à faire une seule fois.** Après ça, chaque PR obtient sa
preview automatiquement, plus aucune manip manuelle.

---

## Étape 1 — Cloudflare : sous-domaine wildcard

```bash
# Sur le VPS (là où cloudflared est déjà authentifié, voir DEPLOY.md étape 5).
cloudflared tunnel route dns snaplover '*.snaplover-preview.hbdwall.xyz'
```

Volontairement scopé sous `snaplover-preview.hbdwall.xyz` (pas un wildcard sur tout `hbdwall.xyz`) :
ce VPS héberge d'autres projets sur ce même domaine — un wildcard racine capturerait leurs
sous-domaines aussi. Un seul enregistrement couvre à la fois `pr-<N>.snaplover-preview.hbdwall.xyz`
(web) et `pr-<N>-ws.snaplover-preview.hbdwall.xyz` (signaling), les deux étant un seul niveau sous
`snaplover-preview.hbdwall.xyz`.

**Point à vérifier avant d'aller plus loin** (pas garanti à 100% sans test réel) : Cloudflare
provisionne normalement un certificat TLS automatiquement pour tout hostname routé vers un tunnel,
wildcard ou pas — mais si un hostname de test comme `pr-0.snaplover-preview.hbdwall.xyz` répond en
erreur de certificat plutôt qu'en 404 une fois l'étape 3 faite, c'est ce point précis qui coince
(souvent réglable en activant "Total TLS" sur la zone, dans le dashboard Cloudflare).

## Étape 2 — VPS : réseau partagé + Traefik

```bash
mkdir -p ~/snaplover/preview && cd ~/snaplover/preview

# Depuis ce repo, copier :
#   deploy/preview/docker-compose.yml       → ~/snaplover/preview/docker-compose.yml
#   deploy/preview/docker-compose.pr.yml    → ~/snaplover/preview/docker-compose.pr.yml
#   deploy/preview/shared.env.example       → ~/snaplover/preview/shared.env (puis remplir —
#                                              mêmes valeurs STUN/TURN que ~/snaplover/web.env)

docker compose up -d   # démarre Traefik — reste tournant en permanence ensuite

curl http://localhost:3999/   # doit répondre 404 (aucune preview déployée encore, normal)
```

## Étape 3 — VPS : ajouter la règle wildcard au tunnel

Éditer `/etc/cloudflared/config.yml` (déjà en place depuis DEPLOY.md étape 6) pour ajouter la
règle wildcard **avant** le `service: http_status:404` final — modèle à jour dans
`deploy/cloudflared/config.yml.example` de ce repo :

```yaml
  - hostname: "*.snaplover-preview.hbdwall.xyz"
    service: http://localhost:3999
```

```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared   # doit rester "active (running)"
```

## Étape 4 — GitHub : secret du repo

Settings → Secrets and variables → Actions → Secrets — un seul secret en plus de ceux de
DEPLOY.md étape 7 :

| Secret | Valeur |
|---|---|
| `PREVIEW_DOMAIN` | `snaplover-preview.hbdwall.xyz` |

## Étape 5 — Vérifier l'automatisation

Ouvre une PR qui touche `web/**` (une modif triviale suffit), regarde l'onglet Actions : le
workflow **Deploy preview** doit builder, pousser sur GHCR, déployer par SSH, puis poster un
commentaire sur la PR avec l'URL (`https://pr-<N>.snaplover-preview.hbdwall.xyz`). Ferme la PR,
vérifie que **Teardown preview** tourne et que `docker ps` sur le VPS ne montre plus les conteneurs
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
  propre PR (`https://pr-<N>.snaplover-preview.hbdwall.xyz`) — cohérent avec la même logique que la
  prod (voir CLAUDE.md checklist OWASP §4), pas une simplification côté sécurité.
