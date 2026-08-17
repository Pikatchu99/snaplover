"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ReflexShape } from "@/components/reflex-match/ReflexShape";
import type { UseReflexMatchSessionReturn } from "@/hooks/use-reflex-match-session";
import type { ReflexRound } from "@/types/reflex-match";

interface ReflexMatchRoundStageProps {
  session: UseReflexMatchSessionReturn;
}

interface ReflexMatchGridProps {
  session: UseReflexMatchSessionReturn;
  // Composant séparé plutôt qu'un bloc inline dans ReflexMatchRoundStage :
  // reçu ici comme prop typée non-nullable, `activeRound` échappe au piège
  // classique de TypeScript où le rétrécissement d'une garde `&&` sur un
  // accès de propriété (`session.activeRound &&`) ne survit pas à une
  // fermeture imbriquée (le `.map()` ci-dessous) — bug réel qui a fait
  // échouer le build de production (jamais le mode dev de l'e2e, qui ne
  // fait pas échouer le typecheck), trouvé après coup sur le déploiement
  // de preview plutôt qu'avant de committer.
  activeRound: ReflexRound;
}

function ReflexMatchGrid({ session, activeRound }: ReflexMatchGridProps) {
  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2.5">
      {activeRound.cells.map((cell, index) => (
        <motion.button
          key={index}
          data-reflex-cell={index}
          data-reflex-cell-odd={index === activeRound.oddIndex}
          onClick={() => session.tap(index)}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={
            session.lastMiss && index !== activeRound.oddIndex
              ? { scale: [1, 0.9, 1], x: [0, -4, 4, 0] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.2, ease: "easeOut" }}
          disabled={session.myTapAt !== null}
          className={`flex aspect-square items-center justify-center rounded-xl bg-[#1c1a20] transition ${
            session.myTapAt !== null && index === activeRound.oddIndex ? "ring-2 ring-[#1f9d55]" : ""
          }`}
        >
          <ReflexShape cell={cell} />
        </motion.button>
      ))}
    </div>
  );
}

// Écran de manche — voir hooks/use-reflex-match-session.ts. Aucun tour :
// les deux côtés voient la grille se révéler au MÊME instant (horloge
// synchronisée) et peuvent taper librement, sans jamais attendre l'autre
// (voir CLAUDE.md "Reflex Match"). Phase "pending" : placeholders qui
// pulsent (jamais un décompte visible — un chiffre laisserait deviner le
// rythme de révélation et permettrait un faux départ "au son"). Phase
// "active" : les 9 vraies formes apparaissent en même temps, sans
// décalage entre cases (un stagger biaiserait quelle case attire l'œil
// en premier).
export function ReflexMatchRoundStage({ session }: ReflexMatchRoundStageProps) {
  const t = useTranslations("reflexMatchRound");
  const roundLabel = t("roundLabel", { current: session.round + 1, total: session.totalRounds });
  const suddenDeath = session.round + 1 > session.totalRounds;

  const myScore = session.mySide === "host" ? session.scores.host : session.scores.guest;
  const partnerScore = session.mySide === "host" ? session.scores.guest : session.scores.host;

  function resultText() {
    if (!session.result) return "";
    if (session.result.winner === "draw") return t("draw");
    return session.result.winner === session.mySide ? t("youWon") : t("partnerWon");
  }

  function deltaText() {
    if (!session.result) return null;
    const { hostTapAt, guestTapAt } = session.result;
    const myTapAt = session.mySide === "host" ? hostTapAt : guestTapAt;
    const partnerTapAt = session.mySide === "host" ? guestTapAt : hostTapAt;
    if (myTapAt !== null && partnerTapAt !== null) {
      return t("resultDelta", { delta: Math.round(Math.abs(myTapAt - partnerTapAt)) });
    }
    if (myTapAt !== null) return t("resultDefaultWin");
    if (partnerTapAt !== null) return t("resultDefaultLoss");
    return t("resultNobodyTapped");
  }

  return (
    <div className="flex flex-1 flex-col gap-5" data-reflex-phase={session.phase}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
          {suddenDeath ? t("suddenDeath") : roundLabel}
        </p>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span>
            {t("you")} <strong className="text-white">{myScore}</strong>
          </span>
          <span>·</span>
          <span>
            {t("partner")} <strong className="text-white">{partnerScore}</strong>
          </span>
        </div>
      </div>

      {session.phase === "pending" && (
        <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }, (_, index) => (
            <motion.div
              key={index}
              animate={{ opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              className="aspect-square rounded-xl bg-white/10"
            />
          ))}
        </div>
      )}

      {session.phase === "active" && session.activeRound && (
        <ReflexMatchGrid session={session} activeRound={session.activeRound} />
      )}

      {session.phase === "result" && session.result && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="font-heading text-xl font-bold text-white">{resultText()}</p>
          <p className="text-sm text-white/60">{deltaText()}</p>
          <button
            onClick={session.continueAfterResult}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            {session.willEndMatchAfterThisRound ? t("seeRecap") : t("nextRound")}
          </button>
        </div>
      )}
    </div>
  );
}
