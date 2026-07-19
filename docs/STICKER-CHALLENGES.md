# SnapLover Challenges

## Idee

Ajouter un mode **Challenge stickers** a SnapLover, utilisable en duo ou en solo.

Au lieu de simplement prendre une bande photo classique, une ou deux personnes recoivent une serie
de stickers / poses droles a reproduire. Pour chaque pose, SnapLover affiche un modele, lance le
compte a rebours, capture la ou les personnes, puis transforme le moment en bande photo fun a
garder.

Le format duo doit se comprendre en une seconde :

```text
Personne A       Modele sticker       Personne B
tentative        pose a reproduire    tentative
```

Le format solo doit etre aussi simple :

```text
Moi              Modele sticker
tentative        pose a reproduire
```

L'interet viral vient du decalage entre le modele et les tentatives. Meme quand les photos sont
ratees, ca devient un souvenir drole, un fou rire a garder, et une image qu'on a envie d'envoyer.

## Positionnement produit

Nom cote produit :

- **SnapLover Challenge** pour le mode global.
- **Packs challenge** pour les collections de stickers.
- **Challenge duo** quand deux personnes jouent ensemble.
- **Challenge solo** quand une personne veut tester, creer du contenu, ou jouer sans inviter
  quelqu'un.

Exemples de packs :

- `Couple`
- `Drama`
- `Cute`
- `Meme`
- `Random`
- `Best friends` plus tard si le produit sort du couple uniquement.

Phrase courte :

> Reproduisez des stickers droles a deux et gardez une bande photo fun en souvenir.

Variante solo :

> Reproduisez des stickers droles en solo et gardez une photo fun a poster.

## Parcours utilisateur

### Creation de session

Sur `/create`, ajouter un choix de mode :

- `Photobooth classique`
- `Challenge stickers`

Quand `Challenge stickers` est selectionne, la personne choisit :

- le type de challenge : `Solo` ou `Duo` ;
- le nombre de poses ;
- un pack de stickers ;
- le mode de selection : `Aleatoire` ou `Choisir mes stickers` ;
- optionnellement, des stickers importes depuis son appareil.

Pour le MVP, on peut demarrer avec `Aleatoire` uniquement, quelques packs internes, et le type
`Solo` / `Duo`.

Decision validee : le mode challenge est un mode separe. Si quelqu'un veut une bande photo simple,
il lance le photobooth classique. Le challenge doit avoir son propre parcours, son propre ton et son
propre souvenir final.

### Challenge solo

Le mode solo sert aux personnes qui :

- veulent tester le concept avant d'inviter quelqu'un ;
- n'ont pas envie de faire la session avec une autre personne ;
- veulent creer un contenu rapide pour TikTok, Instagram ou Snapchat ;
- veulent simplement refaire un pack plusieurs fois pour obtenir une bande drole.

Dans ce mode :

- pas besoin de room partagee ;
- pas besoin de WebRTC ;
- la camera locale suffit ;
- le souvenir final affiche uniquement la personne et le sticker modele ;
- le CTA principal devient `Lancer le challenge`, pas `Inviter quelqu'un`.

Ce mode peut devenir un excellent point d'entree viral : une personne joue seule, envoie sa bande a
ses amis, puis invite les autres a faire mieux.

### Invitation

En mode duo, le lien partage reste un lien de room SnapLover normal. La configuration challenge est
encodee dans l'URL ou transmise par l'hote via la config de session, comme les poses / cadres
actuels.

Le prenom reste local comme aujourd'hui : il ne doit pas etre inclus dans le lien partage.

En mode solo, il n'y a pas d'invitation obligatoire. On peut proposer un CTA secondaire apres la
bande : `Le faire a deux`.

### Salle d'attente

En mode duo, avant de lancer, les deux partenaires voient :

- le mode choisi ;
- le pack choisi ;
- le nombre de poses ;
- un apercu leger de quelques stickers du pack.

L'objectif est de creer l'envie avant meme le lancement.

En mode solo, cette etape devient un ecran de preparation plus simple : camera locale, pack choisi,
nombre de poses, bouton de lancement.

### Pendant la seance

Pour chaque pose :

1. Afficher le sticker modele.
2. Laisser une courte phase de lecture.
3. Lancer le compte a rebours `3, 2, 1`.
4. Capturer la personne seule ou les deux partenaires au meme instant.
5. Passer au sticker suivant.

Le sticker doit etre visible pendant la preparation et rester consultable pendant le countdown. La
priorite est que la ou les personnes comprennent vite ce qu'elles doivent imiter.

Decision validee (apres premier test reel) : le "3, 2, 1" ne doit jamais demarrer en meme temps que
l'affichage du sticker. Un premier essai en duo a montre que voir le sticker et le countdown filer
en meme temps ne laisse aucune marge quand la pose demande de bouger, attraper un accessoire, ou
juste comprendre ce qui est demande. La phase de lecture (etape 2 ci-dessus) est donc une vraie
etape distincte de l'implementation : sticker affiche seul, sans decompte visible, pendant une duree
fixe avant que le 3, 2, 1 ne se declenche. Fixe pour tout le monde au MVP (meme duree quel que soit
le sticker) ; a rendre configurable par l'utilisateur si l'usage reel montre que certains stickers
ont besoin de plus ou moins de temps que d'autres.

### Souvenir final

Le mode challenge genere sa propre bande souvenir. Il ne cherche pas a produire une bande classique
en plus : les personnes qui veulent une photo simple utilisent le mode photobooth classique.

Layout recommande pour une bande verticale duo :

```text
+--------------+--------------+--------------+
| Hote         | Sticker      | Invite       |
| tentative 1  | modele 1     | tentative 1  |
+--------------+--------------+--------------+
| Hote         | Sticker      | Invite       |
| tentative 2  | modele 2     | tentative 2  |
+--------------+--------------+--------------+
| Hote         | Sticker      | Invite       |
| tentative 3  | modele 3     | tentative 3  |
+--------------+--------------+--------------+
```

Le sticker du milieu doit etre quasiment aussi important que les deux photos. Direction validee :
colonne centrale de meme taille que les deux photos, ou au maximum 25% plus petite si le rendu visuel
est meilleur. Il ne faut pas que le sticker ressemble a une petite reference secondaire.

Footer possible :

```text
SNAPLOVER CHALLENGE · DATE · HOTE & INVITE
```

Layout recommande pour une bande verticale solo :

```text
+--------------+--------------+
| Moi          | Sticker      |
| tentative 1  | modele 1     |
+--------------+--------------+
| Moi          | Sticker      |
| tentative 2  | modele 2     |
+--------------+--------------+
| Moi          | Sticker      |
| tentative 3  | modele 3     |
+--------------+--------------+
```

Footer possible :

```text
SNAPLOVER CHALLENGE · DATE
```

Le mode solo ne doit pas donner l'impression d'etre une version degradee. Il doit etre presente comme
un format de contenu rapide : tu choisis un pack, tu imites, tu postes.

Decision validee pour le solo : garder le layout simple `moi | sticker`.

## Stickers

### Sources internes

On peut fournir des packs de stickers precharges pour lancer le concept rapidement.

Important : ne pas copier massivement des images Pinterest ou des stickers non libres dans le repo
public. Le projet est open source et auto-heberge, donc tout asset commite doit etre propre cote
droits.

Options preferables :

- stickers crees par nous ;
- assets libres / licencies correctement ;
- stickers generes dans un style original ;
- images utilisateur importees localement, non stockees par SnapLover.

### Acquisition et tri des stickers

Workflow envisage :

1. Creer un script local qui ouvre le navigateur.
2. Aller sur Pinterest.
3. Lancer des recherches ciblees par pack (`cute pose stickers`, `funny couple pose`, `meme pose`,
   etc.).
4. Telecharger en rafale les images candidates dans un dossier local de travail non commite.
5. Faire un premier tri assiste : supprimer les images hors sujet, trop petites, floues, avec texte
   inutile, watermark visible, ou droits trop douteux.
6. Faire un second tri manuel par l'auteur.
7. Ne garder dans le repo public que les stickers valides, propres et assumables.

### Packs reels (MVP)

Decision validee : le sourcing initial (voir `docs/STICKER-SOURCING.md`) n'a pas produit de poses
"couple" a proprement parler, mais 21 categories d'expressions/reactions (visages, memes de chats)
triees en 3 passes et validees droits par l'auteur. Le pack `couple` du MVP (stickers proceduraux
placeholder) est donc remplace entierement par 3 packs bases sur le contenu reellement disponible :

- `cats` (memes de chats — 7 categories, ~84 stickers) ;
- `drama` (reactions dramatiques/tristes/choquees — 7 categories, ~68 stickers) ;
- `cute` (reactions dröles/gênantes/étonnées — 7 categories, ~88 stickers).

Toutes les images validees sont utilisees (pas de sous-selection curatee) — le tirage aleatoire par
pose gere deja la variete/repetition. Les stickers sont des images reelles (JPEG) affichees en
"contain" (jamais recadrees, contrairement aux photos capturees), pas des dessins proceduraux —
`lib/stickers/paint.ts` (placeholders) a ete supprime au profit d'un registre genere depuis
`sticker-sourcing/final-200-plus/manifest.json`.

Point de vigilance : Pinterest doit servir d'outil d'inspiration et de sourcing de travail, pas de
garantie de droits. Avant de mettre un asset dans le repo public, il faut soit le recreer, soit
utiliser une source libre/licenciee, soit assumer qu'il reste uniquement local/non commite pendant la
phase de test.

Decision validee pour le MVP : uniquement des images fixes. Les GIFs sont reportes a plus tard.

### Upload utilisateur

V2 validee.

L'utilisateur peut importer ses propres stickers depuis son appareil. Pour rester coherent avec le
MVP sans base de donnees :

- l'image reste locale dans la room ;
- elle est partagee au partenaire via le canal temps reel ;
- elle sert uniquement pour la session ;
- elle n'est pas stockee cote serveur ;
- elle n'est pas ajoutee a un catalogue public.

Cela evite les problemes de moderation et de stockage au demarrage.

Sur la page, on peut deja afficher une petite mention produit du type : `Bientot : ajoute tes propres
stickers`.

## Analytics a prevoir

Mesurer au minimum :

- `challenge_room_created`
- `challenge_duo_started`
- `challenge_solo_started`
- `challenge_started`
- `challenge_completed`
- `challenge_downloaded`
- `challenge_shared`
- `challenge_pack_selected`
- `custom_sticker_uploaded`

Ces evenements permettront de savoir si le concept est vraiment viral ou juste amusant en demo.

## Implementation MVP

### Objectif MVP

Valider le mode challenge avec des packs internes et un rendu partageable.

### Scope recommande

1. Ajouter un champ `mode` a la config : `classic` ou `challenge`.
2. Ajouter une config challenge : type `solo` ou `duo`, pack, liste de sticker IDs, selection random.
3. Creer un registre de stickers interne.
4. Ajouter les textes dans `web/src/i18n/messages.ts`.
5. Mettre a jour `/create` pour choisir le mode, le type solo/duo et le pack.
6. En duo, synchroniser la config challenge entre hote et invite via le handshake existant.
7. Afficher le sticker courant dans `CaptureStage`.
8. Etendre la composition canvas pour produire le layout `moi | sticker` en solo et
   `hote | sticker | invite` en duo.
9. Ajouter le telechargement / partage du rendu challenge.
10. Ajouter une regression Playwright du happy path challenge solo.
11. Ajouter une regression Playwright du happy path challenge duo.
12. Afficher l'upload de stickers comme fonctionnalite a venir, sans l'implementer au MVP.

### Hors MVP

- Upload utilisateur.
- Galerie publique de stickers.
- Moderation.
- Compte utilisateur.
- Persistance serveur des challenges.
- Score automatique de ressemblance.

## Decisions validees avant code

1. Le challenge est un mode separe du photobooth classique. Il ne genere pas une bande simple en
   parallele.
2. Le MVP inclut solo et duo.
3. Les packs seront nourris avec beaucoup d'images candidates, via un script local de sourcing et un
   tri en deux temps : premier tri assiste, puis validation manuelle.
4. Le MVP accepte uniquement des images fixes. Les GIFs sont reportes.
5. En duo, le sticker au centre doit etre de meme taille que les deux photos, ou au maximum 25% plus
   petit.
6. En solo, le layout valide est `moi | sticker`.
7. Le sticker s'affiche seul (sans decompte visible) pendant une phase de lecture avant que le
   "3, 2, 1" ne se declenche — jamais les deux en meme temps (voir "Pendant la seance"). Duree fixe
   au MVP, configurable plus tard si besoin.
8. L'upload utilisateur attend la V2, mais on peut deja annoncer sur la page que ca arrive.
