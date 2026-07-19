import { type RefObject } from "react";
import { useTranslations } from "next-intl";
import { CameraTile } from "@/components/room/CameraTile";
import { Countdown } from "@/components/room/Countdown";
import { ComposingOverlay } from "@/components/room/CaptureStage";
import { StickerTile, StickerThumb } from "@/components/room/StickerTile";
import { cn } from "@/lib/utils";
import type { CaptureSessionStatus } from "@/hooks/use-capture-session";
import type { StripCell } from "@/lib/capture/compose-strip";
import type { ChallengeMode, StickerDefinition } from "@/types/sticker";

interface SoloCaptureStageProps {
  localStream: MediaStream | null;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  status: CaptureSessionStatus;
  currentPose: number;
  poses: number;
  countdownMs: number;
  cells: StripCell[];
  mode: ChallengeMode;
  /** Uniquement en mode challenge. */
  currentSticker?: StickerDefinition;
}

// Rangée de vignettes (photo + sticker par pose déjà faite) — pas de 3e slot
// "partenaire" contrairement à CaptureStage.tsx (duo).
function PoseProgress({ cells, poses }: { cells: StripCell[]; poses: number }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2">
      {Array.from({ length: poses }, (_, index) => {
        const cell = cells[index];
        return (
          <div
            key={index}
            className={`flex h-10 flex-1 gap-0.5 overflow-hidden rounded-lg border ${
              cell ? "border-[#fb5a46]" : "border-white/15 bg-white/5"
            }`}
          >
            {cell ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL, décoratif */}
                <img src={cell.left} alt="" className="h-full flex-1 object-cover" />
                {cell.sticker && <StickerThumb sticker={cell.sticker} />}
              </>
            ) : (
              <span className="flex flex-1 items-center justify-center text-[10px] font-semibold text-white/30">
                {index + 1}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Écran de séance solo — même mécanique que CaptureStage.tsx (duo) mais une
// seule tuile caméra, pas d'overlay "on attend Partenaire" (personne à
// attendre). Voir docs/STICKER-CHALLENGES.md.
export function SoloCaptureStage({
  localStream,
  localVideoRef,
  status,
  currentPose,
  poses,
  countdownMs,
  cells,
  mode,
  currentSticker,
}: SoloCaptureStageProps) {
  const t = useTranslations("captureStage");
  const tLobby = useTranslations("lobby");
  const poseNumber = Math.min(currentPose + 1, poses);
  const isChallenge = mode === "challenge";

  return (
    // pt-16 (pas pt-6) : même raison que Lobby.tsx (LanguageSwitcher fixe).
    <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-16 pb-16">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
          {t("pose", { current: poseNumber, total: poses })}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#fb5a46]">
          <span className="size-1.5 rounded-full bg-[#fb5a46]" />
          {isChallenge ? t("stickerInstruction") : t("instruction")}
        </span>
      </div>

      {/* Sans sticker (solo classique), une seule tuile caméra — pas la
          peine d'occuper toute la largeur comme pour la grille à 2 cases. */}
      <div
        className={cn(
          "relative mx-auto grid w-full flex-1 gap-4",
          isChallenge ? "max-w-2xl grid-cols-2" : "max-w-sm grid-cols-1",
        )}
      >
        <CameraTile stream={localStream} label={tLobby("you")} state="ready" mirrored muted videoRef={localVideoRef} />
        {isChallenge && currentSticker && <StickerTile sticker={currentSticker} />}
        {status === "countdown" && <Countdown remainingMs={countdownMs} poseNumber={poseNumber} poses={poses} />}
        {status === "composing" && <ComposingOverlay />}
      </div>

      <PoseProgress cells={cells} poses={poses} />
    </div>
  );
}
