"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, LayoutGrid, Rows3 } from "lucide-react";
import { generateRoomCode } from "@/lib/room-code";
import { FRAME_IDS } from "@/lib/frames/frame-registry";
import { PACK_IDS, DEFAULT_PACK_ID } from "@/lib/stickers/sticker-registry";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { RoomPreview } from "@/components/landing/RoomPreview";
import {
  trackChallengePackSelected,
  trackChallengeRoomCreated,
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
  const [stickerPackId, setStickerPackId] = useState<StickerPackId>(DEFAULT_PACK_ID);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  // Aucun prénom requis en solo (une seule personne, pas de partenaire à
  // nommer dans le footer) — voir docs/STICKER-CHALLENGES.md.
  const requiresName = !(mode === "challenge" && challengeType === "solo");

  const STYLE_OPTIONS: { id: StripStyle; label: string; icon: typeof Rows3 }[] = [
    { id: "vertical", label: t("styleVertical"), icon: Rows3 },
    { id: "grid", label: t("styleGrid"), icon: LayoutGrid },
  ];

  async function handleCreate() {
    if (requiresName && !name.trim()) {
      setNameError(true);
      return;
    }

    // Challenge solo : pas de room, pas de code à partager, pas de prénom —
    // on file droit vers l'écran de capture locale (voir docs/STICKER-CHALLENGES.md
    // "pas besoin de room partagée"). L'event "démarré" part plus tard, au
    // lancement réel de la séance (use-solo-capture-session.ts), pas ici.
    if (mode === "challenge" && challengeType === "solo") {
      const soloParams = new URLSearchParams({ poses: String(poses), frame: frameId, pack: stickerPackId });
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
    }
    const sharePath = `/r/${code}?${shareParams.toString()}`;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
    } catch {
      // clipboard indisponible : on continue quand même vers la room
    }

    if (mode === "challenge") trackChallengeRoomCreated();

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
          {requiresName && (
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
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
              {t("modeLabel")}
            </legend>
            <div className="flex gap-2">
              <button onClick={() => setMode("classic")} className={PILL_CLASS(mode === "classic")}>
                {t("modeClassic")}
              </button>
              <button
                onClick={() => {
                  setMode("challenge");
                  setStyle("vertical");
                }}
                className={PILL_CLASS(mode === "challenge")}
              >
                {t("modeChallenge")}
              </button>
            </div>
          </fieldset>

          {mode === "challenge" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
                {t("challengeTypeLabel")}
              </legend>
              <div className="flex gap-2">
                <button onClick={() => setChallengeType("duo")} className={CARD_CLASS(challengeType === "duo")}>
                  {t("challengeTypeDuo")}
                </button>
                <button onClick={() => setChallengeType("solo")} className={CARD_CLASS(challengeType === "solo")}>
                  {t("challengeTypeSolo")}
                </button>
              </div>
            </fieldset>
          )}

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

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
              {t("posesLabel")}
            </legend>
            <div className="flex gap-2">
              {config.roomConfig.validPoses.map((n) => (
                <button key={n} onClick={() => setPoses(n)} className={PILL_CLASS(poses === n)}>
                  {t("posesOption", { n })}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-widest text-[#8c8378] uppercase">
              {t("styleLabel")}
            </legend>
            <div className="flex gap-2">
              {STYLE_OPTIONS.filter((opt) => mode !== "challenge" || opt.id === "vertical").map((opt) => (
                <button key={opt.id} onClick={() => setStyle(opt.id)} className={CARD_CLASS(style === opt.id)}>
                  <opt.icon className="size-5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

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

          <div className="flex-1 md:hidden" />

          <button
            onClick={handleCreate}
            className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90"
          >
            {t("submit")}
          </button>
        </div>
      </div>
    </main>
  );
}
