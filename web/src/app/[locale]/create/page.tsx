"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, LayoutGrid, Rows3 } from "lucide-react";
import { generateRoomCode } from "@/lib/room-code";
import { FRAME_IDS } from "@/lib/frames/frame-registry";
import { PACK_IDS, DEFAULT_PACK_ID, STICKERS } from "@/lib/stickers/sticker-registry";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { RoomPreview } from "@/components/landing/RoomPreview";
import {
  trackChallengePackSelected,
  trackChallengeRoomCreated,
  trackRoomCreated,
} from "@/lib/analytics";
import type { FrameId, StripStyle } from "@/types/frame";
import type { ChallengeMode, ChallengeType, StickerPackId } from "@/types/sticker";

const PILL_CLASS = (active: boolean) =>
  cn(
    "flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition",
    active ? "border-[#1c1712] bg-[#1c1712] text-white" : "border-[#ece4d8] text-[#8c8378] hover:border-[#8c8378]",
  );

const CHIP_CLASS = (active: boolean) =>
  cn(
    "rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
    active ? "border-[#1c1712] bg-[#1c1712] text-white" : "border-[#ece4d8] text-[#8c8378] hover:border-[#8c8378]",
  );

const CARD_CLASS = (active: boolean) =>
  cn(
    "flex flex-1 flex-col items-center gap-2 rounded-2xl border px-4 py-5 text-sm font-medium transition",
    active ? "border-[#1c1712] bg-[#1c1712] text-white" : "border-[#ece4d8] text-[#1c1712] hover:border-[#8c8378]",
  );

// Créer une room (E3) — SNAPROOM-SPEC.md §12. Aucune BDD au MVP : la config
// (poses/style/cadre) est encodée dans l'URL partagée (voir lib/room-config.ts).
// Deux colonnes à partir de md (aperçu / réglages) pour bien remplir l'espace
// sur laptop — une seule colonne empilée en dessous.
export default function CreateRoomPage() {
  // useSearchParams() (pour préremplir mode/type depuis le CTA "Le faire à
  // deux") force un boundary Suspense, sinon Next.js échoue au prerender
  // statique de cette page.
  return (
    <Suspense fallback={null}>
      <CreateRoomForm />
    </Suspense>
  );
}

function CreateRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("create");
  const tFrames = useTranslations("frames");
  const tStickerPacks = useTranslations("stickerPacks");
  const [poses, setPoses] = useState<number>(config.roomConfig.defaultPoses);
  const [style, setStyle] = useState<StripStyle>("vertical");
  const [frameId, setFrameId] = useState<FrameId>("classic");
  // Préremplis depuis l'URL — voir le CTA "Le faire à deux" de PhotoStrip.tsx
  // (?mode=challenge&type=duo), sinon défauts habituels.
  const [mode, setMode] = useState<ChallengeMode>(() => (searchParams.get("mode") === "challenge" ? "challenge" : "classic"));
  const [challengeType, setChallengeType] = useState<ChallengeType>(() =>
    searchParams.get("type") === "solo" ? "solo" : "duo",
  );
  // Préremplis depuis le CTA "Pack du jour" de la landing (?pack=...&stickers=...) :
  // pack + stickers imposés, tant que l'utilisateur ne change ni le pack ni le
  // nombre de poses ci-dessous (sinon incohérent, on abandonne le pin).
  const [stickerPackId, setStickerPackId] = useState<StickerPackId>(() => {
    const packRaw = searchParams.get("pack");
    return packRaw && (PACK_IDS as string[]).includes(packRaw) ? (packRaw as StickerPackId) : DEFAULT_PACK_ID;
  });
  const [pinnedStickerIds, setPinnedStickerIds] = useState<string[] | null>(() => {
    const packRaw = searchParams.get("pack");
    const stickersRaw = searchParams.get("stickers");
    if (!packRaw || !stickersRaw) return null;
    const ids = stickersRaw.split(",").filter(Boolean);
    if (ids.length !== config.roomConfig.defaultPoses) return null;
    return ids.every((id) => STICKERS[id]?.packId === packRaw) ? ids : null;
  });
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  // Poses/style/cadre repliés par défaut : trop d'options affichées d'un coup
  // perdait les gens (retour utilisateur) — la valeur par défaut convient à
  // la plupart, "Personnaliser" reste à un clic pour qui veut vraiment choisir.
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const STYLE_OPTIONS: { id: StripStyle; label: string; icon: typeof Rows3 }[] = [
    { id: "vertical", label: t("styleVertical"), icon: Rows3 },
    { id: "grid", label: t("styleGrid"), icon: LayoutGrid },
  ];

  async function handleCreate() {
    if (!name.trim()) {
      setNameError(true);
      return;
    }

    // Solo (classique ou challenge) : pas de room, pas de code à partager —
    // on file droit vers l'écran de capture locale (voir
    // docs/STICKER-CHALLENGES.md "pas besoin de room partagée"), mais le
    // prénom reste requis : c'est la signature du footer de la bande. L'event
    // "démarré" part plus tard, au lancement réel de la séance
    // (use-solo-capture-session.ts), pas ici.
    if (challengeType === "solo") {
      const soloParams = new URLSearchParams({ poses: String(poses), style, frame: frameId, mode, name: name.trim() });
      if (mode === "challenge") {
        soloParams.set("pack", stickerPackId);
        if (pinnedStickerIds) soloParams.set("stickers", pinnedStickerIds.join(","));
      }
      trackRoomCreated({ participants: "solo", mode });
      router.push(`/solo?${soloParams.toString()}`);
      return;
    }

    const code = generateRoomCode();
    // Le lien partagé ne contient QUE la config de room (poses/style/cadre,
    // + mode/pack en challenge) — jamais le prénom de l'hôte, qui reste local
    // à ce navigateur. mode/pack omis en classique : URL inchangée par
    // rapport à avant l'ajout du mode challenge.
    const shareParams = new URLSearchParams({ poses: String(poses), style, frame: frameId });
    if (mode === "challenge") {
      shareParams.set("mode", mode);
      shareParams.set("pack", stickerPackId);
      if (pinnedStickerIds) shareParams.set("stickers", pinnedStickerIds.join(","));
    }
    const sharePath = `/r/${code}?${shareParams.toString()}`;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
    } catch {
      // clipboard indisponible : on continue quand même vers la room
    }

    if (mode === "challenge") trackChallengeRoomCreated();
    trackRoomCreated({ participants: "duo", mode });

    const ownParams = new URLSearchParams(shareParams);
    ownParams.set("name", name.trim());
    router.push(`/r/${code}?${ownParams.toString()}`);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#fbf7f1] px-6 pt-8 pb-20">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 md:max-w-4xl">
        <button
          onClick={() => router.back()}
          aria-label={t("back")}
          className="flex size-9 items-center justify-center rounded-full border border-[#ece4d8] text-[#1c1712] transition hover:bg-[#ece4d8]/40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h1 className="font-heading text-xl font-bold text-[#1c1712]">{t("title")}</h1>
      </div>

      <div className="mx-auto grid w-full max-w-md flex-1 gap-8 py-8 md:max-w-4xl md:grid-cols-2 md:items-center md:gap-16">
        <div className="md:sticky md:top-24">
          <RoomPreview poses={poses} style={style} frameId={frameId} />
        </div>

        <div className="flex flex-col gap-8">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
              {t("nameLabel")}
            </legend>
            {/* text-base (16px), pas text-sm : sous ce seuil, Safari iOS
                zoome automatiquement toute la page au focus d'un champ. */}
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value.slice(0, config.participant.nameMaxLength));
                setNameError(false);
              }}
              placeholder={t("namePlaceholder")}
              maxLength={config.participant.nameMaxLength}
              aria-label={t("nameLabel")}
              className="rounded-2xl border border-[#ece4d8] bg-white px-4 py-3 text-base text-[#1c1712] placeholder:text-[#8c8378] focus:border-[#1c1712] focus:outline-none"
            />
            {nameError && <p className="text-sm text-red-600">{t("missingName")}</p>}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
              {t("participantsLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setChallengeType("duo")} className={PILL_CLASS(challengeType === "duo")}>
                {t("participantsDuo")}
              </button>
              <button onClick={() => setChallengeType("solo")} className={PILL_CLASS(challengeType === "solo")}>
                {t("participantsSolo")}
              </button>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
              {t("modeLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode("classic")} className={PILL_CLASS(mode === "classic")}>
                {t("modeOptionClassic")}
              </button>
              <button
                onClick={() => {
                  setMode("challenge");
                  setStyle("vertical");
                }}
                className={PILL_CLASS(mode === "challenge")}
              >
                {t("modeOptionChallenge")}
              </button>
            </div>
          </fieldset>

          {mode === "challenge" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
                {t("packLabel")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {PACK_IDS.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      setStickerPackId(id);
                      setPinnedStickerIds(null);
                      trackChallengePackSelected(id);
                    }}
                    className={CHIP_CLASS(stickerPackId === id)}
                  >
                    {tStickerPacks(id)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-4 border-t border-[#ece4d8] pt-4">
            <button
              onClick={() => setCustomizeOpen((open) => !open)}
              className="flex items-center justify-between text-left text-sm font-medium text-[#1c1712]"
              aria-expanded={customizeOpen}
            >
              <span className="flex flex-col">
                <span>{t("customizeLabel")}</span>
                {!customizeOpen && (
                  <span className="text-xs font-normal text-[#8c8378]">
                    {t("customizeSummary", { n: poses, frame: tFrames(frameId) })}
                  </span>
                )}
              </span>
              <ChevronDown className={cn("size-4 shrink-0 transition-transform", customizeOpen && "rotate-180")} />
            </button>

            {customizeOpen && (
              <div className="flex flex-col gap-8">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
                    {t("posesLabel")}
                  </legend>
                  <div className="flex gap-2">
                    {config.roomConfig.validPoses.map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setPoses(n);
                          setPinnedStickerIds(null);
                        }}
                        className={PILL_CLASS(poses === n)}
                      >
                        {t("posesOption", { n })}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {mode !== "challenge" && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
                      {t("styleLabel")}
                    </legend>
                    <div className="flex gap-2">
                      {STYLE_OPTIONS.map((opt) => (
                        <button key={opt.id} onClick={() => setStyle(opt.id)} className={CARD_CLASS(style === opt.id)}>
                          <opt.icon className="size-5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
                    {t("frameLabel")}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {FRAME_IDS.map((id) => (
                      <button key={id} onClick={() => setFrameId(id)} className={CHIP_CLASS(frameId === id)}>
                        {tFrames(id)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </div>

          <div className="flex-1 md:hidden" />

          <button
            onClick={handleCreate}
            className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90"
          >
            {/* En solo, aucun lien n'est copié (personne à qui l'envoyer) —
                le bouton ne doit pas laisser croire le contraire. */}
            {challengeType === "solo" ? t("submitSolo") : t("submit")}
          </button>
        </div>
      </div>
    </main>
  );
}
