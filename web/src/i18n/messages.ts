// Tous les textes visibles par l'utilisateur, centralisés ici — jamais de
// chaîne en dur dans les composants. Une seule locale (fr) pour l'instant,
// mais la structure (un objet par locale, une clé par écran/feature) est
// pensée pour brancher une vraie lib i18n (next-intl ou équivalent) plus
// tard sans réécrire les appelants : il suffira de remplacer l'import
// `fr` par un `useTranslations()` qui lit dans le même arbre de clés.

export const messages = {
  fr: {
    seo: {
      siteName: "SnapLover",
      /** Gabarit de titre (App Router `metadata.title.template`). */
      titleTemplate: "%s · SnapLover",
      defaultTitle: "SnapLover — Photobooth en ligne à deux, à distance",
      defaultDescription:
        "Une seule photo. À deux, même à distance. Rejoignez un lien, activez vos caméras, et prenez une bande photo synchronisée en 3·2·1 — sans compte, gratuit et open source.",
      keywords: [
        "photobooth en ligne",
        "photo à distance",
        "cabine photo virtuelle",
        "photo couple à distance",
        "webcam synchronisée",
        "bande photo en ligne",
        "photomaton virtuel",
        "prendre une photo à deux à distance",
      ],
      create: {
        title: "Créer une room",
        description:
          "Créez votre room SnapLover : choisissez le nombre de poses, le style de bande et le cadre, puis partagez le lien pour prendre votre photo à deux, où que vous soyez.",
      },
      join: {
        title: "Rejoindre une room",
        description:
          "Rejoignez la room SnapLover d'un proche avec le code reçu, activez votre caméra, et prenez votre bande photo ensemble en quelques secondes — sans compte.",
      },
    },
    landing: {
      titlePrefix: "Une seule photo. À deux, même à",
      titleHighlight: "distance.",
      subtitle:
        "Rejoignez un lien, caméras allumées, 3·2·1 — clic. Vous repartez chacun avec la même bande photo, où que vous soyez.",
      createCta: "Créer une room",
      joinCta: "Rejoindre une room",
      pasteLinkPlaceholder: "Coller le lien / code…",
      noAccount: "Aucun compte requis · directement dans le navigateur",
    },
    join: {
      eyebrow: "Quelqu'un vous a invité ?",
      title: "Rejoindre sa room",
      codeInputLabel: (index: number) => `Caractère ${index} du code`,
      nameLabel: "Votre prénom",
      namePlaceholder: "Ex. Camille",
      invalidCode: "Code invalide.",
      missingName: "Entrez votre prénom.",
      submit: "Rejoindre",
      createInstead: "Créer ma propre room",
      noAccount: "Aucun compte requis pour rejoindre.",
    },
    create: {
      title: "Nouvelle room",
      back: "Retour",
      nameLabel: "Votre prénom",
      namePlaceholder: "Ex. Camille",
      missingName: "Entrez votre prénom.",
      posesLabel: "Poses par bande",
      posesOption: (n: number) => `${n} poses`,
      styleLabel: "Style de bande",
      styleVertical: "Strip vertical",
      styleGrid: "Grille 2×2",
      frameLabel: "Cadre",
      submit: "Créer et copier le lien",
    },
    lobby: {
      title: "Salle d'attente",
      you: "Vous",
      partner: "Partenaire",
      launch: "Lancer la séance",
      cameraDeniedMessage:
        "Caméra bloquée. Autorisez l'accès à votre caméra dans les réglages de votre navigateur, puis rechargez la page.",
      cameraDeniedHelp:
        "Cliquez sur l'icône de caméra dans la barre d'adresse de votre navigateur, autorisez l'accès, puis réessayez.",
      retry: "Réessayer",
      roomFullMessage: "SnapLover, c'est à deux — cette room est déjà complète.",
      roomFullCta: "Créer une nouvelle room",
      invalidRoomMessage: "Cette room a expiré ou le code est incorrect.",
      invalidRoomCreateCta: "Créer une room",
      invalidRoomJoinCta: "Saisir un code",
      status: {
        requestingCamera: "Activation de votre caméra…",
        cameraDenied: "Caméra bloquée",
        waitingForPeer: "En attente de votre partenaire…",
        connecting: "Connexion en cours…",
        connected: "2 connectés · caméras prêtes",
        reconnecting: "Signal faible — reconnexion…",
        roomFull: "Cette room est déjà à deux",
        invalidRoom: "Code de room invalide",
      },
    },
    cameraTile: {
      ready: "Prête",
      connecting: "En cours",
      off: "Off",
    },
    captureStage: {
      live: "live",
      pose: (current: number, total: number) => `Pose ${current} / ${total}`,
      instruction: "Regardez l'objectif…",
      awaitingPeerTitle: "On attend Partenaire…",
      awaitingPeerSubtitle: "Le 3·2·1 ne se déclenche que si vous êtes prêts tous les deux.",
      partnerDisconnectedTitle: "Partenaire s'est déconnecté·e",
      partnerDisconnectedMessage: "On reprend dès son retour. Vos poses déjà prises sont conservées.",
      resendLink: "Renvoyer le lien",
      linkCopied: "Lien copié",
      composingTitle: "On assemble votre bande…",
      composingSubtitle: "On récupère la moitié pleine résolution de chacun.",
    },
    countdown: {
      ready: "PRÊT·E ?",
    },
    photoStrip: {
      eyebrow: "C'est dans la boîte",
      title: "Votre bande est prête",
      download: "Télécharger PNG",
      share: "Partager",
      retry: "Reprendre",
      note: "Vous avez chacun votre copie. La bande pleine résolution est enregistrée sur chaque appareil.",
      filters: {
        classic: "Classic",
        bw: "N&B",
        warm: "Chaud",
      },
    },
    frames: {
      classic: "Classic",
      noir: "Noir",
      film: "Film",
      pop: "Pop",
      kraft: "Kraft",
      vintage: "Vintage",
      gingham: "Gingham",
      checkers: "Checkers",
      denim: "Denim",
    },
    strip: {
      /** Footer imprimé sur la bande composée (canvas), pas du JSX. */
      footer: (date: string, names?: { host: string; guest: string }) =>
        names ? `SNAPLOVER · ${date} · ${names.host} & ${names.guest}` : `SNAPLOVER · ${date} · À DEUX`,
    },
    participant: {
      /** Prénoms par défaut si absents (ex. lien partagé collé directement, sans passer par /join). */
      defaultHost: "Hôte",
      defaultGuest: "Invité",
    },
  },
} as const;

export const fr = messages.fr;
