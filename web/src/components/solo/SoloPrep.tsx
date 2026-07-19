import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import { CameraTile } from "@/components/room/CameraTile";
import { Link } from "@/i18n/navigation";
import type { UserMediaStatus } from "@/hooks/use-user-media";
import type { StickerPackId } from "@/types/sticker";

interface SoloPrepProps {
  localStream: MediaStream | null;
  status: UserMediaStatus;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  poses: number;
  stickerPackId: StickerPackId;
  onLaunch: () => void;
  onRetryCamera: () => void;
}

// Écran de préparation solo — volontairement plus simple que Lobby.tsx (pas
// de room, pas de code à copier, pas de partenaire à attendre) : voir
// docs/STICKER-CHALLENGES.md "En mode solo, cette étape devient un écran de
// préparation plus simple".
export function SoloPrep({ localStream, status, localVideoRef, poses, stickerPackId, onLaunch, onRetryCamera }: SoloPrepProps) {
  const t = useTranslations("solo");
  const tLobby = useTranslations("lobby");
  const tCommon = useTranslations("common");
  const tStickerPacks = useTranslations("stickerPacks");

  if (status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#161319] px-5 pt-16 pb-16 text-center">
        <p className="max-w-sm text-white">{tLobby("cameraDeniedMessage")}</p>
        <p className="max-w-sm text-sm text-white/60">{tLobby("cameraDeniedHelp")}</p>
        <button
          onClick={onRetryCamera}
          className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          {tLobby("retry")}
        </button>
        <Link href="/" className="text-sm text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
          {tCommon("backToHome")}
        </Link>
      </div>
    );
  }

  return (
    // pt-16 (pas pt-6) : même raison que Lobby.tsx (LanguageSwitcher fixe).
    <div className="flex min-h-screen flex-col bg-[#161319] px-5 pt-16 pb-16">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
        <h1 className="font-heading text-2xl font-bold text-white">{t("prepTitle")}</h1>

        <CameraTile
          stream={localStream}
          label={tLobby("you")}
          state={status === "ready" ? "ready" : "connecting"}
          mirrored
          muted
          videoRef={localVideoRef}
        />

        <p className="text-sm text-white/60">{t("prepSummary", { n: poses, pack: tStickerPacks(stickerPackId) })}</p>

        <button
          onClick={onLaunch}
          disabled={status !== "ready"}
          className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90 disabled:from-white/15 disabled:to-white/15 disabled:text-white/50"
        >
          {t("launch")}
        </button>

        <Link href="/" className="text-center text-sm text-white/40 underline-offset-2 hover:text-white/70 hover:underline">
          {tCommon("backToHome")}
        </Link>
      </div>
    </div>
  );
}
