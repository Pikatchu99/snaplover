import { useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2 } from "lucide-react";
import { CameraTile } from "@/components/room/CameraTile";
import { Countdown } from "@/components/room/Countdown";
import type { CaptureSessionStatus } from "@/hooks/use-capture-session";
import type { StripCell } from "@/lib/capture/compose-strip";
import { Link } from "@/i18n/navigation";

interface CaptureStageProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  status: CaptureSessionStatus;
  currentPose: number;
  poses: number;
  countdownMs: number;
  // Une pose est en attente de déclenchement mais le partenaire n'est pas
  // (ou plus) joignable — countdown suspendu si aucune pose n'est encore
  // faite, "partenaire déconnecté" sinon (voir SNAPROOM-SPEC.md §12, états 3/4).
  awaitingPeer: boolean;
  // Poses déjà composées (mises à jour au fil de la séance, pas seulement à
  // la fin) — alimente l'aperçu live en bas d'écran.
  cells: StripCell[];
}

// Rangée de vignettes montrant où on en est dans la séance (quelle pose
// est déjà faite, laquelle reste) — un slot par pose prévue.
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
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL, décoratif */}
                <img src={cell.right} alt="" className="h-full flex-1 object-cover" />
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

function AwaitingPeerOverlay({ currentPose }: { currentPose: number }) {
  const t = useTranslations("captureStage");
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const disconnectedMidSession = currentPose > 0;

  async function resendLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/60 px-6 text-center">
      <span className="font-heading text-lg font-bold text-white">
        {disconnectedMidSession ? t("partnerDisconnectedTitle") : t("awaitingPeerTitle")}
      </span>
      <span className="max-w-xs text-sm text-white/70">
        {disconnectedMidSession ? t("partnerDisconnectedMessage") : t("awaitingPeerSubtitle")}
      </span>
      {disconnectedMidSession && (
        <button
          onClick={resendLink}
          className="mt-1 flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
        >
          {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
          {copied ? t("linkCopied") : t("resendLink")}
        </button>
      )}
      {/* Si le partenaire a du mal à rejoindre (ou ne revient plus), permettre
          de sortir de la room plutôt que de rester bloqué sur cet écran. */}
      <Link href="/" className="mt-1 text-sm text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
        {tCommon("backToHome")}
      </Link>
    </div>
  );
}

function ComposingOverlay() {
  const t = useTranslations("captureStage");
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/60 px-6 text-center">
      <span className="font-heading text-lg font-bold text-white">{t("composingTitle")}</span>
      <span className="max-w-xs text-sm text-white/70">{t("composingSubtitle")}</span>
    </div>
  );
}

// Écran de séance (compte à rebours 3·2·1 synchrone) — SNAPROOM-SPEC.md §12 (E5).
export function CaptureStage({
  localStream,
  remoteStream,
  localVideoRef,
  status,
  currentPose,
  poses,
  countdownMs,
  awaitingPeer,
  cells,
}: CaptureStageProps) {
  const t = useTranslations("captureStage");
  const tLobby = useTranslations("lobby");
  const poseNumber = Math.min(currentPose + 1, poses);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-[#161319] px-5 pt-6 pb-16">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
          {t("pose", { current: poseNumber, total: poses })}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#fb5a46]">
          <span className="size-1.5 rounded-full bg-[#fb5a46]" />
          {t("instruction")}
        </span>
      </div>

      <div className="relative mx-auto grid w-full max-w-2xl flex-1 grid-cols-2 gap-4">
        <CameraTile stream={localStream} label={tLobby("you")} state="ready" mirrored muted videoRef={localVideoRef} />
        <CameraTile stream={remoteStream} label={tLobby("partner")} state={remoteStream ? "ready" : "off"} />
        {status === "countdown" && <Countdown remainingMs={countdownMs} poseNumber={poseNumber} poses={poses} />}
        {status === "composing" && <ComposingOverlay />}
        {awaitingPeer && <AwaitingPeerOverlay currentPose={currentPose} />}
      </div>

      <PoseProgress cells={cells} poses={poses} />
    </div>
  );
}
