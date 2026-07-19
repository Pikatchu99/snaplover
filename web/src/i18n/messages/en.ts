// Dictionnaire anglais — même arborescence de clés que fr.ts, voir ce
// fichier pour le contexte/les commentaires sur le format ICU.
const en = {
  common: {
    backToHome: "Back to home",
  },
  seo: {
    siteName: "SnapLover",
    titleTemplate: "%s · SnapLover",
    defaultTitle: "SnapLover — Online photobooth for a couple, taken apart",
    defaultDescription:
      "Create a photo strip together, wherever you are — as if you were in the same room. SnapLover syncs your cameras in the browser to compose a shared keepsake, no account needed.",
    keywords: [
      "online photobooth",
      "long distance photo",
      "virtual photobooth",
      "couple photo apart",
      "synced webcam",
      "online photo strip",
      "virtual photomaton",
      "take a photo together apart",
    ],
    create: {
      title: "Create a photo session for two",
      description: "Prepare an online photo strip, pick a style, then share a link with the person you're inviting.",
    },
    join: {
      title: "Join a photo session",
      description: "Enter your invite code to take an online photo strip together, no account needed.",
    },
  },
  landing: {
    titlePrefix: "The online photobooth for taking",
    titleHighlight: "a photo strip together",
    subtitle:
      "Create a photo session for two, share a link, turn on your cameras, and both leave with the same keepsake photo strip.",
    createCta: "Create a photo session",
    joinCta: "Join a session",
    pasteLinkPlaceholder: "Paste the link / code…",
    noAccount: "No account · Right in your browser · PNG download",
    /** Decorative preview (hero) — not real data, illustrative only. */
    demoCaption: "SNAPLOVER · JUL 14",
    demoCaptionTogether: "TOGETHER",
    howItWorks: {
      title: "How it works",
      steps: [
        { title: "Create your session", description: "Choose the number of poses, the strip style and the frame." },
        {
          title: "Invite the other person",
          description: "Send the link. Each of you joins from your phone or computer.",
        },
        {
          title: "Launch the 3·2·1",
          description: "SnapLover syncs both cameras and assembles your photo strip.",
        },
      ],
    },
    why: {
      title: "Why it's useful",
      description:
        "Video-call screenshots often miss the moment: a smile too early, a blurry frame, a cut-off shot. SnapLover triggers both captures at the exact same instant and composes a real keepsake strip.",
    },
    forWhom: {
      title: "Made for long-distance duos",
      description:
        "Made for long-distance couples, friends split between two cities, family across the diaspora, and anyone who wants to keep a shared photo without being in the same room.",
    },
    faq: {
      title: "Frequently asked questions",
      items: [
        {
          question: "Do I need to create an account?",
          answer: "No, SnapLover works without an account: create a link, share it, and launch the session.",
        },
        {
          question: "Does it work on phones?",
          answer: "Yes, SnapLover runs directly in the browser, on mobile as well as on desktop.",
        },
        {
          question: "Is the photo stored on a server?",
          answer: "No, the strip is composed and downloaded on your own devices; no photo is ever kept on our servers.",
        },
        {
          question: "Can I download the strip?",
          answer: "Yes, as a PNG, directly from the result screen.",
        },
        {
          question: "Is SnapLover free?",
          answer: "A basic version is free, and the technical core is open source.",
        },
        {
          question: "Why allow camera access?",
          answer:
            "Camera access is only used to capture your poses; the video stream connects directly to the other person (WebRTC), never through a central server.",
        },
      ],
    },
  },
  join: {
    eyebrow: "Someone invited you?",
    title: "Join a session",
    nameLabel: "Your first name",
    namePlaceholder: "e.g. Camille",
    invalidCode: "Invalid code.",
    missingName: "Enter your first name.",
    submit: "Join",
    or: "or",
    createInstead: "Create my own session",
    noAccount: "No account required to join.",
  },
  create: {
    title: "Prepare your session",
    back: "Back",
    nameLabel: "Your first name",
    namePlaceholder: "e.g. Camille",
    missingName: "Enter your first name.",
    participantsLabel: "Participants",
    participantsDuo: "Duo",
    participantsSolo: "Solo",
    modeLabel: "Mode",
    modeOptionClassic: "Classic",
    modeOptionChallenge: "Challenge",
    packLabel: "Sticker pack",
    customizeLabel: "Customize",
    customizeSummary: "{n} poses · {frame}",
    posesLabel: "Poses per strip",
    posesOption: "{n} poses",
    styleLabel: "Strip style",
    styleVertical: "Vertical strip",
    styleGrid: "2×2 grid",
    frameLabel: "Frame",
    submit: "Create and copy the link",
    submitSolo: "Start my session",
    previewLabel: "PREVIEW",
  },
  lobby: {
    title: "Waiting room",
    you: "You",
    partner: "Partner",
    launch: "Launch the session",
    cameraDeniedMessage: "Camera blocked. Allow camera access in your browser settings, then reload the page.",
    cameraDeniedHelp: "Click the camera icon in your browser's address bar, allow access, then try again.",
    retry: "Try again",
    roomFullMessage: "This session is already full: SnapLover only works for two.",
    roomFullCta: "Create a new session",
    invalidRoomMessage: "This link has expired or the invite code is incorrect.",
    invalidRoomCreateCta: "Create a session",
    invalidRoomJoinCta: "Enter a code",
    turnUnavailableMessage:
      "Your two cameras can't reach each other directly, and the free relay service that usually helps in that case isn't responding (its monthly quota is probably used up). I'm on it. Try again a bit later, or from a different network (direct connections sometimes work even without it).",
    challengeTutorial: {
      title: "Here's what you'll do",
      intro:
        "You'll each take turns reproducing these {n} stickers on screen. Press the button to launch, a countdown starts right after.",
      gotIt: "Got it",
    },
    status: {
      requestingCamera: "Turning on your camera…",
      cameraDenied: "Camera blocked",
      waitingForPeer: "Waiting for your partner…",
      connecting: "Connecting…",
      connected: "2 connected · cameras ready",
      reconnecting: "Weak signal — reconnecting…",
      roomFull: "This session is already full",
      invalidRoom: "Invalid invite code",
      turnUnavailable: "Relay unavailable",
    },
  },
  cameraTile: {
    ready: "Ready",
    connecting: "Connecting",
    off: "Off",
  },
  captureStage: {
    live: "live",
    pose: "Pose {current} / {total}",
    instruction: "Look at the camera…",
    stickerLabel: "Model",
    stickerInstruction: "Copy the sticker…",
    awaitingPeerTitle: "Waiting for Partner…",
    awaitingPeerSubtitle: "The 3·2·1 only starts once you're both ready.",
    partnerDisconnectedTitle: "Partner disconnected",
    partnerDisconnectedMessage: "We'll resume as soon as they're back. Your poses so far are kept.",
    resendLink: "Resend the link",
    linkCopied: "Link copied",
    composingTitle: "Putting your strip together…",
    composingSubtitle: "Fetching each other's full-resolution half.",
  },
  countdown: {
    ready: "READY?",
    prepareFor: "Get ready · Photo {current} / {total}",
  },
  photoStrip: {
    eyebrow: "It's in the can",
    title: "Your strip is ready",
    imageAlt: "Composed photo strip",
    download: "Download PNG",
    share: "Share",
    newSession: "Create my own SnapLover session",
    doItTogether: "Do it together",
    note: "You each have your own copy. The full-resolution strip is saved on each device.",
    likePrompt: "Do you like the app?",
    filters: {
      classic: "Classic",
      bw: "B&W",
      warm: "Warm",
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
    valentine: "Valentine",
  },
  stickerPacks: {
    cats: "Cats",
    drama: "Drama",
    cute: "Cute",
  },
  strip: {
    footerWithNames: "SNAPLOVER · {date} · {host} & {guest}",
    footerGeneric: "SNAPLOVER · {date} · TOGETHER",
    footerChallenge: "SNAPLOVER CHALLENGE · {date} · {host} & {guest}",
    footerChallengeSolo: "SNAPLOVER CHALLENGE · {date} · {name}",
    footerSolo: "SNAPLOVER · {date} · {name}",
  },
  solo: {
    prepTitleClassic: "Ready for your session?",
    prepTitleChallenge: "Ready to take on the challenge?",
    prepSummaryClassic: "{n} poses",
    prepSummaryChallenge: "{n} poses · {pack} pack",
    launchClassic: "Launch the session",
    launchChallenge: "Launch the challenge",
  },
  participant: {
    defaultHost: "Host",
    defaultGuest: "Guest",
  },
  siteCredit: {
    credit: "An open source project by Yemalin",
    contribute: "Want to contribute or chat about it? The code is public.",
    likeExperience: "I like the experience",
    likeApp: "I like the app",
  },
  languageSwitcher: {
    label: "Language",
  },
  ogImage: {
    caption: "SNAPLOVER · TOGETHER",
  },
};

export default en;
