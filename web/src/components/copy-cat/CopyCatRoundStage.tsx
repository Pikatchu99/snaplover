"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2 } from "lucide-react";
import { CopyCatGhostOverlay } from "@/components/copy-cat/CopyCatGhostOverlay";
import type { UseCopyCatSessionReturn } from "@/hooks/use-copy-cat-session";

interface CopyCatRoundStageProps {
  session: UseCopyCatSessionReturn;
  localStream: MediaStream | null;
}

// Écran de manche — voir hooks/use-copy-cat-session.ts. AUCUN chrono nulle
// part (voir CLAUDE.md "Copy Cat", leçon inverse du 3·2·1 raté de Duo
// Doodle) : un bouton "Capture" manuel à son propre rythme, jamais de
// pression de temps. Trois phases actives possibles pour CE client
// ("posing" si poseur·se, "mimic-prep" si mimic, "reveal" pour les deux) —
// tout le reste affiche un état d'attente sobre.
export function CopyCatRoundStage({ session, localStream }: CopyCatRoundStageProps) {
  const t = useTranslations("copyCatRound");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Callback ref plutôt qu'un simple useEffect([localStream]) : la balise
  // <video> de "posing" et celle de "mimic-prep" sont deux nœuds DOM
  // DIFFÉRENTS (deux branches JSX distinctes selon la phase, jamais le
  // même élément persistant) — un effet qui ne redéclenche que si
  // `localStream` change ne rebranche jamais `srcObject` sur le nouveau
  // nœud quand seule la phase change (bug réel trouvé en testant : la
  // capture du·de la mimic échouait avec "vidéo pas encore prête",
  // videoWidth/videoHeight à 0, car son <video> n'affichait jamais
  // vraiment le flux). Le callback ref s'exécute à CHAQUE montage, quel
  // que soit le nœud.
  const bindVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node) node.srcObject = localStream;
    },
    [localStream],
  );

  const roundLabel = t("roundLabel", { current: session.round + 1, total: session.totalRounds });

  if (session.phase === "posing") {
    if (!session.isPoserThisRound) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
          <Loader2 className="size-6 animate-spin text-white/40" />
          <p className="text-white/60">{t("waitingForPose")}</p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-center text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <h2 className="text-center font-heading text-lg font-bold text-white">{t("poseTitle")}</h2>
        <div className="relative mx-auto aspect-3/4 w-full max-w-xs overflow-hidden rounded-2xl bg-black">
          <video ref={bindVideo} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
        </div>
        <button
          onClick={() => videoRef.current && session.capture(videoRef.current, "poser")}
          disabled={session.capturing}
          className="mx-auto flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Camera className="size-5" />
          {t("captureButton")}
        </button>
      </div>
    );
  }

  if (session.phase === "mimic-prep") {
    if (session.isPoserThisRound) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
          <Loader2 className="size-6 animate-spin text-white/40" />
          <p className="text-white/60">{t("waitingForMimic")}</p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-center text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <h2 className="text-center font-heading text-lg font-bold text-white">{t("mimicTitle")}</h2>
        <div className="relative mx-auto aspect-3/4 w-full max-w-xs overflow-hidden rounded-2xl bg-black">
          <video ref={bindVideo} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
          {session.referenceUrl && <CopyCatGhostOverlay referenceUrl={session.referenceUrl} />}
        </div>
        <button
          onClick={() => videoRef.current && session.capture(videoRef.current, "mimic")}
          disabled={session.capturing}
          className="mx-auto flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Camera className="size-5" />
          {t("captureButton")}
        </button>
      </div>
    );
  }

  if (session.phase === "reveal") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-center text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <p className="text-center text-xs text-white/50">{t("referenceLabel")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client */}
            <img src={session.referenceUrl ?? undefined} alt={t("referenceLabel")} className="aspect-3/4 w-full rounded-2xl object-cover" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-center text-xs text-white/50">{t("attemptLabel")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client */}
            <img src={session.attemptUrl ?? undefined} alt={t("attemptLabel")} className="aspect-3/4 w-full rounded-2xl object-cover" />
          </div>
        </div>

        {session.isPoserThisRound && !session.verdict && (
          <div className="mx-auto flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => session.rate("nailed-it")}
              className="rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t("verdictNailedIt")}
            </button>
            <button
              onClick={() => session.rate("close")}
              className="rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t("verdictClose")}
            </button>
            <button
              onClick={() => session.rate("not-quite")}
              className="rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t("verdictNotQuite")}
            </button>
          </div>
        )}

        {!session.isPoserThisRound && !session.verdict && (
          <p className="text-center text-sm text-white/50">{t("waitingForVerdict")}</p>
        )}

        {session.verdict && (
          <div className="flex flex-col items-center gap-3">
            <p className="font-heading text-lg font-bold text-white">
              {session.verdict === "nailed-it" ? t("verdictNailedIt") : session.verdict === "close" ? t("verdictClose") : t("verdictNotQuite")}
            </p>
            <button
              onClick={session.continueAfterReveal}
              className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
            >
              {session.round + 1 >= session.totalRounds ? t("seeRecap") : t("nextRound")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
