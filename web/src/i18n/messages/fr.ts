// Dictionnaire français — voir CLAUDE.md "i18n (architecture prête à
// évoluer)". Les valeurs paramétrées utilisent le format ICU ({var}) lu par
// next-intl (t("clé", { var })), pas des fonctions JS.
const fr = {
  common: {
    backToHome: "Retour à l'accueil",
  },
  seo: {
    siteName: "SnapLover",
    titleTemplate: "%s · SnapLover",
    defaultTitle: "SnapLover — Cabine photo en ligne pour une bande à deux, à distance",
    defaultDescription:
      "Créez une bande photo à deux, à distance — comme si vous étiez dans la même pièce. SnapLover synchronise vos caméras dans le navigateur pour composer un souvenir partagé, sans compte.",
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
      title: "Créer une séance photo à deux",
      description: "Préparez une bande photo en ligne, choisissez le style, puis partagez un lien avec la personne invitée.",
    },
    join: {
      title: "Rejoindre une séance photo",
      description: "Entrez votre code d'invitation pour prendre une bande photo en ligne à deux, sans compte.",
    },
  },
  landing: {
    titlePrefix: "La cabine photo en ligne pour prendre",
    titleHighlight: "une bande à deux",
    subtitle:
      "Créez une séance photo à deux, partagez un lien, activez vos caméras et repartez chacun avec la même bande photo souvenir.",
    createCta: "Créer une séance photo",
    joinCta: "Rejoindre une séance",
    pasteLinkPlaceholder: "Coller le lien / code…",
    noAccount: "Sans compte · Directement dans le navigateur · Téléchargement PNG",
    /** Aperçu décoratif (hero) — pas de vraies données, juste illustratif. */
    demoCaption: "SNAPLOVER · 14 JUIL.",
    demoCaptionTogether: "À DEUX",
    howItWorks: {
      title: "Comment ça marche",
      steps: [
        { title: "Créez votre séance", description: "Choisissez le nombre de poses, le style de bande et le cadre." },
        {
          title: "Invitez l'autre personne",
          description: "Envoyez le lien. Chacun rejoint depuis son téléphone ou son ordinateur.",
        },
        {
          title: "Lancez le 3·2·1",
          description: "SnapLover synchronise les deux caméras et assemble votre bande photo.",
        },
      ],
    },
    why: {
      title: "Pourquoi c'est utile",
      description:
        "Les captures d'écran de visio ratent souvent le moment : un sourire trop tôt, une image floue, un cadrage coupé. SnapLover déclenche les deux captures au même instant et compose une vraie bande souvenir.",
    },
    forWhom: {
      title: "Pensé pour les duos à distance",
      description:
        "Pensé pour les couples à distance, les amis séparés entre deux villes, les proches dans la diaspora, et tous ceux qui veulent garder une photo commune sans être dans la même pièce.",
    },
    faq: {
      title: "Questions fréquentes",
      items: [
        {
          question: "Est-ce qu'il faut créer un compte ?",
          answer: "Non, SnapLover fonctionne sans compte : créez un lien, partagez-le, et lancez la séance.",
        },
        {
          question: "Est-ce que ça marche sur téléphone ?",
          answer: "Oui, SnapLover fonctionne directement dans le navigateur, sur mobile comme sur ordinateur.",
        },
        {
          question: "Est-ce que la photo est stockée sur un serveur ?",
          answer: "Non, la bande est composée et téléchargée sur vos appareils ; aucune photo n'est conservée sur nos serveurs.",
        },
        {
          question: "Est-ce que je peux télécharger la bande ?",
          answer: "Oui, en PNG, directement depuis l'écran de résultat.",
        },
        { question: "Est-ce que SnapLover est gratuit ?", answer: "Oui, SnapLover est gratuit et open source." },
        {
          question: "Pourquoi autoriser la caméra ?",
          answer:
            "L'accès caméra sert uniquement à capturer vos poses ; le flux vidéo se connecte directement à l'autre personne (WebRTC), sans passer par un serveur central.",
        },
      ],
    },
  },
  join: {
    eyebrow: "Quelqu'un vous a invité ?",
    title: "Rejoindre une séance",
    nameLabel: "Votre prénom",
    namePlaceholder: "Ex. Camille",
    invalidCode: "Code invalide.",
    missingName: "Entrez votre prénom.",
    submit: "Rejoindre",
    or: "ou",
    createInstead: "Créer ma propre séance",
    noAccount: "Aucun compte requis pour rejoindre.",
  },
  create: {
    title: "Préparer votre séance",
    back: "Retour",
    nameLabel: "Votre prénom",
    namePlaceholder: "Ex. Camille",
    missingName: "Entrez votre prénom.",
    modeLabel: "Mode",
    modeOptionClassic: "Classique",
    modeOptionChallengeDuo: "Challenge duo",
    modeOptionChallengeSolo: "Challenge solo",
    packLabel: "Pack de stickers",
    customizeLabel: "Personnaliser",
    customizeSummary: "{n} poses · {frame}",
    posesLabel: "Poses par bande",
    posesOption: "{n} poses",
    styleLabel: "Style de bande",
    styleVertical: "Strip vertical",
    styleGrid: "Grille 2×2",
    frameLabel: "Cadre",
    submit: "Créer et copier le lien",
    previewLabel: "APERÇU",
  },
  lobby: {
    title: "Salle d'attente",
    you: "Vous",
    partner: "Partenaire",
    launch: "Lancer la séance",
    cameraDeniedMessage:
      "Caméra bloquée. Autorisez l'accès à votre caméra dans les réglages de votre navigateur, puis rechargez la page.",
    cameraDeniedHelp: "Cliquez sur l'icône de caméra dans la barre d'adresse de votre navigateur, autorisez l'accès, puis réessayez.",
    retry: "Réessayer",
    roomFullMessage: "Cette séance est déjà complète : SnapLover fonctionne à deux.",
    roomFullCta: "Créer une nouvelle séance",
    invalidRoomMessage: "Ce lien a expiré ou le code d'invitation est incorrect.",
    invalidRoomCreateCta: "Créer une séance",
    invalidRoomJoinCta: "Saisir un code",
    turnUnavailableMessage:
      "Vos deux caméras n'arrivent pas à se parler directement, et le service gratuit qui sert de relais dans ce cas ne répond plus (son quota du mois est sûrement atteint). Je m'en occupe. Réessayez un peu plus tard, ou avec un autre réseau (le direct fonctionne parfois même sans lui).",
    challengeTutorial: {
      title: "Voici ce que vous allez faire",
      intro:
        "Vous allez reproduire ces {n} stickers, chacun votre tour à l'écran. Appuyez sur le bouton pour lancer, un compte à rebours démarre juste après.",
      gotIt: "J'ai compris",
    },
    status: {
      requestingCamera: "Activation de votre caméra…",
      cameraDenied: "Caméra bloquée",
      waitingForPeer: "En attente de votre partenaire…",
      connecting: "Connexion en cours…",
      connected: "2 connectés · caméras prêtes",
      reconnecting: "Signal faible — reconnexion…",
      roomFull: "Cette séance est déjà complète",
      invalidRoom: "Code d'invitation invalide",
      turnUnavailable: "Relais indisponible",
    },
  },
  cameraTile: {
    ready: "Prête",
    connecting: "En cours",
    off: "Off",
  },
  captureStage: {
    live: "live",
    pose: "Pose {current} / {total}",
    instruction: "Regardez l'objectif…",
    stickerLabel: "Modèle",
    stickerInstruction: "Reproduisez le sticker…",
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
    prepareFor: "Préparez-vous · Photo {current} / {total}",
  },
  photoStrip: {
    eyebrow: "C'est dans la boîte",
    title: "Votre bande est prête",
    imageAlt: "Bande photo composée",
    download: "Télécharger PNG",
    share: "Partager",
    newSession: "Créer ma propre séance SnapLover",
    doItTogether: "Le faire à deux",
    note: "Vous avez chacun votre copie. La bande pleine résolution est enregistrée sur chaque appareil.",
    likePrompt: "Vous aimez l'application ?",
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
    valentine: "Saint-Valentin",
  },
  stickerPacks: {
    cats: "Chats",
    drama: "Drama",
    cute: "Cute",
  },
  strip: {
    /** Footer imprimé sur la bande composée (canvas), pas du JSX. */
    footerWithNames: "SNAPLOVER · {date} · {host} & {guest}",
    footerGeneric: "SNAPLOVER · {date} · À DEUX",
    footerChallenge: "SNAPLOVER CHALLENGE · {date} · {host} & {guest}",
    footerChallengeSolo: "SNAPLOVER CHALLENGE · {date}",
  },
  solo: {
    prepTitle: "Prêt·e à relever le défi ?",
    prepSummary: "{n} poses · pack {pack}",
    launch: "Lancer le challenge",
  },
  participant: {
    defaultHost: "Hôte",
    defaultGuest: "Invité",
  },
  siteCredit: {
    credit: "Un projet open source de Yemalin",
    contribute: "Envie de contribuer ou d'en discuter ? Le code est public.",
    likeExperience: "J'aime l'expérience",
    likeApp: "J'aime l'app",
  },
  languageSwitcher: {
    label: "Langue",
  },
  ogImage: {
    caption: "SNAPLOVER · À DEUX",
  },
};

export default fr;
