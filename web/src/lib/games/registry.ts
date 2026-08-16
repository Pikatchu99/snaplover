import { Anchor, Circle, Palette, Radar, SpellCheck2, type LucideIcon } from "lucide-react";

// Registre central des rooms — SEULE source de vérité pour le type de room
// (photo + chaque mini-jeu), son préfixe de code, ses routes et sa promo
// landing. Né d'une duplication qui a mordu deux fois : lib/room-code.ts,
// InlineJoinField.tsx et app/robots.ts maintenaient chacun leur propre table
// à jour manuellement à chaque nouveau jeu, et la landing empilait une
// section plein-écran par jeu au lieu d'un bloc "Jeux" unique. Ajouter un
// jeu ne devrait toucher qu'ICI (+ ses propres fichiers de jeu) — tout le
// reste (préfixe de code, dispatch du champ "coller le lien / code",
// robots.ts, carte sur la landing) se déduit de ce tableau.
export type RoomKind = "photo" | (typeof GAMES)[number]["kind"];

export interface GameDefinition {
  kind: string;
  /** Premier caractère des codes de room de ce type — voir lib/room-code.ts. */
  prefix: string;
  /** Route de la room éphémère, sans le code (ex. "/duel/r"). */
  roomPath: string;
  /** Route "rejoindre" dédiée (ex. "/duel/join"). */
  joinPath: string;
  /** Route "créer" (ex. "/duel"). */
  createPath: string;
  /** Nom affiché — marque du jeu, jamais traduit (comme "Doodle Duel"). */
  name: string;
  icon: LucideIcon;
  /** Espace de noms i18n pour la promo landing (eyebrow/headline/subtitle/steps/cta) — voir GamesHubPromo.tsx. */
  promoNamespace: string;
}

// Le photobooth n'est PAS un "mini-jeu" du hub (pas de carte dans la section
// Jeux, sa propre page dédiée) mais partage le même système de préfixe de
// code — voir CLAUDE.md "le photobooth doit rester un pilier".
export const PHOTO_ROOM: { kind: "photo"; prefix: string; roomPath: string } = {
  kind: "photo",
  prefix: "P",
  roomPath: "/r",
};

export const GAMES = [
  {
    kind: "duel",
    prefix: "D",
    roomPath: "/duel/r",
    joinPath: "/duel/join",
    createPath: "/duel",
    name: "Doodle Duel",
    icon: Palette,
    promoNamespace: "landing.doodleDuel",
  },
  {
    kind: "word-sonar",
    prefix: "W",
    roomPath: "/word-sonar/r",
    joinPath: "/word-sonar/join",
    createPath: "/word-sonar",
    name: "Word Sonar",
    icon: Radar,
    promoNamespace: "landing.wordSonar",
  },
  {
    kind: "connect-duo",
    prefix: "C",
    roomPath: "/connect-duo/r",
    joinPath: "/connect-duo/join",
    createPath: "/connect-duo",
    name: "Connect Duo",
    icon: Circle,
    promoNamespace: "landing.connectDuo",
  },
  {
    kind: "edge-letters",
    prefix: "E",
    roomPath: "/edge-letters/r",
    joinPath: "/edge-letters/join",
    createPath: "/edge-letters",
    name: "Edge Letters",
    icon: SpellCheck2,
    promoNamespace: "landing.edgeLetters",
  },
  {
    kind: "fleet-siege",
    prefix: "F",
    roomPath: "/fleet-siege/r",
    joinPath: "/fleet-siege/join",
    createPath: "/fleet-siege",
    name: "Fleet Siege",
    icon: Anchor,
    promoNamespace: "landing.fleetSiege",
  },
] as const satisfies readonly GameDefinition[];

export const ROOM_KIND_PREFIX: Record<RoomKind, string> = {
  [PHOTO_ROOM.kind]: PHOTO_ROOM.prefix,
  ...Object.fromEntries(GAMES.map((game) => [game.kind, game.prefix])),
} as Record<RoomKind, string>;

export const ROOM_KIND_PATH: Record<RoomKind, string> = {
  [PHOTO_ROOM.kind]: PHOTO_ROOM.roomPath,
  ...Object.fromEntries(GAMES.map((game) => [game.kind, game.roomPath])),
} as Record<RoomKind, string>;
