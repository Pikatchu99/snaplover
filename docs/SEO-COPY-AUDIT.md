# Audit SEO & copy — SnapLover

Date : 2026-07-16

## Résumé

La base SEO technique est saine pour un MVP : Next.js App Router, metadata globales, sitemap,
robots, noindex sur les rooms privées, langue française et JSON-LD `WebApplication`.

Le vrai problème est éditorial : la landing décrit correctement la mécanique, mais elle ne vend
pas assez la promesse. Elle parle trop comme une spec produit ("room", "bande", "3·2·1") et pas
assez comme une page qui doit convertir deux personnes à distance, qu'elles soient en couple,
amies, proches ou séparées par deux villes.

Verdict :

- SEO technique : correct.
- SEO contenu : trop pauvre.
- Copy : trop fonctionnelle, pas assez désirable.
- Priorité : réécrire et enrichir la landing avant de créer de nouvelles pages.

## Sources inspectées

- `web/src/app/page.tsx` : landing publique.
- `web/src/i18n/messages.ts` : copy visible et metadata SEO.
- `web/src/app/layout.tsx` : metadata globales, `lang`, Open Graph, Twitter.
- `web/src/app/create/layout.tsx` et `web/src/app/join/layout.tsx` : metadata des pages publiques
  secondaires.
- `web/src/app/robots.ts` : règles robots.
- `web/src/app/sitemap.ts` : URLs publiques indexables.
- `web/src/app/r/[code]/page.tsx` : protection noindex des rooms privées.
- `docs/SNAPROOM-SPEC.md` : positionnement produit.
- Build vérifié avec `pnpm --dir web build`.

## Ce qui est déjà bon

### Metadata globales

`web/src/app/layout.tsx` expose un titre, une description, des keywords, Open Graph et Twitter.
La langue `fr` est correctement posée sur le document HTML.

Le titre actuel est clair :

```text
SnapLover — Photobooth en ligne à deux, à distance
```

La description actuelle est correcte mais trop longue et mécanique :

```text
Une seule photo. À deux, même à distance. Rejoignez un lien, activez vos caméras, et prenez une bande photo synchronisée en 3·2·1 — sans compte, gratuit et open source.
```

### Indexation des bonnes URLs

Le sitemap liste uniquement :

- `/`
- `/create`
- `/join`

Les rooms privées `/r/[code]` sont exclues du sitemap, bloquées dans `robots.ts`, et marquées
`noindex, nofollow` directement dans la page. C'est le bon choix : une room est éphémère, privée,
et ne doit jamais être indexée.

### Données structurées

La landing embarque un JSON-LD `WebApplication`, cohérent avec le produit. C'est une bonne base.

### Sécurité SEO/sociale

Les pages dynamiques de room ne polluent pas l'index. La séparation entre pages publiques et
expérience privée est claire.

## Problèmes prioritaires

### P1 — La landing est trop pauvre en contenu indexable

Aujourd'hui, la page d'accueil contient surtout :

- un logo ;
- un H1 ;
- un sous-titre ;
- deux CTA ;
- un visuel décoratif.

Pour un moteur de recherche, c'est trop léger. La page ne développe pas assez les sujets que les
utilisateurs pourraient chercher :

- photobooth en ligne ;
- cabine photo virtuelle ;
- photomaton virtuel ;
- photo à distance ;
- photo entre amis à distance ;
- couple à distance ;
- proches à distance ;
- souvenir à deux ;
- bande photo en ligne ;
- alternative à une capture d'écran de visio.

Suggestion : enrichir la landing avec 3 à 5 sections courtes, sans transformer la page en blog.

Structure recommandée :

1. Hero : promesse claire.
2. Comment ça marche : créer, inviter, prendre la bande.
3. Pourquoi SnapLover : mieux qu'une capture d'écran de visio.
4. Pensé pour les duos à distance : couples, amis, proches, mobile-first, sans compte, lien simple.
5. FAQ courte : compte, confidentialité, téléphone, téléchargement, qualité.

### P1 — La promesse n'est pas assez directe

H1 actuel :

```text
Une seule photo. À deux, même à distance.
```

Il est joli, mais il ne contient pas assez de mots de recherche et il ne dit pas immédiatement ce
qu'est le produit.

Options plus fortes :

```text
La cabine photo en ligne pour prendre une bande à deux
```

```text
Prenez une vraie bande photo à deux, même à distance
```

```text
Le photobooth en ligne pour créer un souvenir à deux
```

Recommandation : utiliser la première ou la deuxième option. Elles sont plus claires, plus
recherchables, et ne verrouillent pas le produit sur le couple.

### P1 — Le vocabulaire "room" est trop interne

Le mot "room" est compréhensible pour une équipe produit, mais froid pour un utilisateur. Il
affaiblit la promesse émotionnelle et ne correspond pas au champ lexical naturel en français.

Remplacements recommandés :

| Actuel | Recommandé |
| --- | --- |
| Créer une room | Créer une séance photo |
| Rejoindre une room | Rejoindre une séance |
| Nouvelle room | Préparer votre séance |
| Salle d'attente | Salle d'attente |
| Code de room invalide | Code d'invitation invalide |
| Cette room est déjà complète | Cette séance est déjà complète |

Exception : "room" peut rester dans les commentaires techniques, types, routes, specs historiques
et noms internes. Le changement vise surtout la copy visible et les metadata.

### P2 — Le positionnement doit rester plus large que le couple

La spec met fortement en avant les couples à distance, mais le produit réel est plus large :
SnapLover sert à prendre une bande photo à deux, même quand les deux personnes ne sont pas au même
endroit. Le couple est un cas d'usage fort, pas une limite produit.

À conserver :

- cible principale : deux personnes à distance ;
- cas d'usage évidents : couples, amis, proches, famille, diaspora ;
- priorité : Afrique francophone + diaspora ;
- problème : les captures d'écran de visio sont moches et désynchronisées ;
- valeur : une bande photo à deux, même à distance ;
- ton : intime, complice, joyeux mais sobre.

La landing n'utilise presque pas cette matière. Il faut la remonter dans la page publique, sans
faire croire que SnapLover est une app uniquement romantique.

Exemples de blocs :

```text
Pour les duos qui ne sont pas au même endroit
Un appel vidéo garde le contact. SnapLover crée le souvenir : une bande photo prise au même moment, avec vos deux visages côte à côte.
```

```text
Plus propre qu'une capture d'écran
Le compte à rebours est synchronisé, chaque pose est capturée des deux côtés, puis assemblée dans une vraie bande photo à télécharger.
```

```text
Un lien, pas de compte
Créez une séance, envoyez le lien à l'autre personne et lancez la photo dès que vos deux caméras sont prêtes.
```

### P2 — Les pages `/create` et `/join` sont indexables mais peu utiles en acquisition

Ces pages sont dans le sitemap et ont des metadata dédiées. C'est acceptable, mais elles sont plus
transactionnelles qu'éditoriales.

Risque :

- Google peut indexer `/create` ou `/join`, mais ces pages ne répondent pas à une intention de
  recherche large.
- Elles risquent d'être des pages minces.

Deux options :

1. Les garder indexables, mais améliorer légèrement les titres et descriptions.
2. Les retirer du sitemap si la stratégie est de concentrer l'acquisition sur `/`.

Recommandation MVP : les garder indexables pour l'instant, mais donner des metadata plus orientées
utilisateur.

Suggestions :

```text
Créer une séance photo à deux · SnapLover
Préparez une bande photo en ligne, choisissez le style, puis partagez un lien avec la personne invitée.
```

```text
Rejoindre une séance photo · SnapLover
Entrez votre code d'invitation pour prendre une bande photo en ligne à deux, sans compte.
```

### P2 — La description SEO globale est trop mécanique

Description actuelle :

```text
Une seule photo. À deux, même à distance. Rejoignez un lien, activez vos caméras, et prenez une bande photo synchronisée en 3·2·1 — sans compte, gratuit et open source.
```

Proposition :

```text
SnapLover est un photobooth en ligne pour prendre une bande photo à deux, même à distance : créez une séance, invitez quelqu'un et repartez chacun avec le même souvenir, sans compte.
```

Alternative plus douce :

```text
Créez une bande photo à deux, même à distance. SnapLover synchronise vos caméras dans le navigateur pour composer un souvenir partagé, sans compte.
```

### P3 — Les keywords existent mais ne compensent pas le manque de contenu

`keywords` contient déjà des expressions pertinentes. C'est bien, mais la balise keywords a très
peu de poids aujourd'hui. Les mêmes termes doivent apparaître naturellement dans le contenu visible.

Termes à intégrer naturellement :

- photobooth en ligne ;
- cabine photo en ligne ;
- photomaton virtuel ;
- duo à distance ;
- couple à distance ;
- amis à distance ;
- proches à distance ;
- bande photo souvenir ;
- photo à deux à distance ;
- sans compte ;
- directement dans le navigateur.

### P3 — Les visuels décoratifs n'ont pas besoin d'alt, mais il manque un texte explicatif proche

Les images décoratives de la landing ont `alt=""`, ce qui est correct si elles sont purement
décoratives. En revanche, elles ne remplacent pas une explication textuelle visible.

Suggestion : ajouter près du visuel une courte légende ou un bloc "Ce que vous obtenez" :

```text
Une bande photo partageable, composée automatiquement avec vos poses et celles de l'autre personne.
```

## Point technique repéré au build

Le build production passe avec accès réseau pour récupérer les polices Google via `next/font`.

Commande vérifiée :

```bash
pnpm --dir web build
```

Warning important observé :

```text
NEXT_PUBLIC_SITE_URL not set — metadataBase and absolute OG/canonical/sitemap URLs will be unavailable.
metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000".
```

Interprétation :

- le code prévoit bien `NEXT_PUBLIC_SITE_URL` ;
- `.env.example` documente la valeur de production ;
- l'environnement de build local ne l'avait pas ;
- en production, il faut vérifier que la variable est définie, sinon les previews sociales et URLs
  absolues peuvent pointer vers `localhost`.

Action recommandée :

- vérifier la variable sur Vercel ou l'environnement de build web ;
- garder `NEXT_PUBLIC_SITE_URL=https://snaplover.hbdwall.xyz` en production.

## Architecture de contenu recommandée

### Hero

Objectif : dire immédiatement ce que c'est et pour qui.

Proposition :

```text
La cabine photo en ligne pour prendre une bande à deux
```

Sous-titre :

```text
Créez une séance photo à deux, partagez un lien, activez vos caméras et repartez chacun avec la même bande photo souvenir.
```

CTA :

```text
Créer une séance photo
Rejoindre une séance
```

Micro-copy :

```text
Sans compte · Directement dans le navigateur · Téléchargement PNG
```

### Section "Comment ça marche"

```text
1. Créez votre séance
Choisissez le nombre de poses, le style de bande et le cadre.

2. Invitez l'autre personne
Envoyez le lien. Chacun rejoint depuis son téléphone ou son ordinateur.

3. Lancez le 3·2·1
SnapLover synchronise les deux caméras et assemble votre bande photo.
```

### Section "Pourquoi c'est utile"

```text
Les captures d'écran de visio ratent souvent le moment : un sourire trop tôt, une image floue, un cadrage coupé. SnapLover déclenche les deux captures au même instant et compose une vraie bande souvenir.
```

### Section "Pour qui"

```text
Pensé pour les couples à distance, les amis séparés entre deux villes, les proches dans la diaspora, et tous ceux qui veulent garder une photo commune sans être dans la même pièce.
```

### FAQ SEO

Questions utiles :

- Est-ce qu'il faut créer un compte ?
- Est-ce que ça marche sur téléphone ?
- Est-ce que la photo est stockée sur un serveur ?
- Est-ce que je peux télécharger la bande ?
- Est-ce que SnapLover est gratuit ?
- Pourquoi autoriser la caméra ?

## Proposition de nouvelle copy centralisée

### SEO global

```text
defaultTitle:
SnapLover — Cabine photo en ligne à deux, même à distance

defaultDescription:
Créez une bande photo à deux, même à distance. SnapLover synchronise vos caméras dans le navigateur pour composer un souvenir partagé, sans compte.
```

### Landing

```text
title:
La cabine photo en ligne pour prendre une bande à deux

subtitle:
Créez une séance photo à deux, partagez un lien, activez vos caméras et repartez chacun avec la même bande photo souvenir.

createCta:
Créer une séance photo

joinCta:
Rejoindre une séance

noAccount:
Sans compte · Directement dans le navigateur · Téléchargement PNG
```

### Create

```text
title:
Préparer votre séance

submit:
Créer et copier le lien

seo title:
Créer une séance photo à deux

seo description:
Préparez une bande photo en ligne, choisissez le style, puis partagez un lien avec la personne invitée.
```

### Join

```text
eyebrow:
Vous avez reçu un lien ?

title:
Rejoindre une séance

createInstead:
Créer ma propre séance

seo title:
Rejoindre une séance photo

seo description:
Entrez votre code d'invitation pour prendre une bande photo en ligne à deux, sans compte.
```

### États room

```text
roomFullMessage:
Cette séance est déjà complète : SnapLover fonctionne à deux.

invalidRoomMessage:
Ce lien a expiré ou le code d'invitation est incorrect.

status.roomFull:
Cette séance est déjà complète

status.invalidRoom:
Code d'invitation invalide
```

## Ordre d'exécution conseillé

1. Réécrire les textes dans `web/src/i18n/messages.ts`.
2. Ajouter 3 ou 4 sections SSR dans `web/src/app/page.tsx`.
3. Améliorer le JSON-LD avec `inLanguage`, `isAccessibleForFree`, `browserRequirements` et
   éventuellement `audience`.
4. Vérifier que `NEXT_PUBLIC_SITE_URL` est bien défini dans l'environnement de production.
5. Relancer `pnpm --dir web build`.
6. Vérifier le rendu mobile et desktop de la landing.
7. Reconsidérer plus tard les pages SEO dédiées seulement si la landing est déjà solide.

## Ne pas faire maintenant

- Ne pas créer dix pages SEO vides.
- Ne pas indexer les rooms privées.
- Ne pas ajouter de blog avant d'avoir une landing claire.
- Ne pas changer les routes techniques juste pour éviter le mot "room".
- Ne pas promettre de stockage cloud, historique ou galerie tant que le MVP ne les fournit pas.

## Conclusion

SnapLover a déjà les fondations techniques SEO nécessaires pour être propre. Le levier principal
est la copy : passer d'une explication de fonctionnalité à une promesse claire de souvenir partagé
pour deux personnes à distance.

La phrase directrice recommandée :

```text
SnapLover est la cabine photo en ligne pour créer une vraie bande photo à deux, même à distance.
```
