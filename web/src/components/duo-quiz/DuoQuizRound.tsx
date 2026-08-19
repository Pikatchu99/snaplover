"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { UseDuoQuizSessionReturn } from "@/hooks/use-duo-quiz-session";

interface DuoQuizRoundProps {
  session: UseDuoQuizSessionReturn;
  isInitiator: boolean;
}

function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

// Écran de manche — aucun tour (voir hooks/use-duo-quiz-session.ts) : les
// deux répondent au même instant, sans attendre l'autre. Le choix se
// verrouille au clic (pas de bouton "valider"), et la bonne réponse ne
// s'affiche JAMAIS avant "duoquiz-round-end" (voir CLAUDE.md) même si mon
// propre chrono local atteint 0 en premier — sinon la réponse pourrait
// apparaître chez qui a fini son décompte en premier pendant que l'autre
// choisit encore, ce qui casserait le round.
export function DuoQuizRound({ session, isInitiator }: DuoQuizRoundProps) {
  const t = useTranslations("duoQuizRound");
  const warning = session.remainingMs <= 5_000;
  const revealed = session.phase === "reveal";

  const myScore = isInitiator ? session.scores.host : session.scores.guest;
  const partnerScore = isInitiator ? session.scores.guest : session.scores.host;

  function choiceClass(index: number): string {
    if (revealed) {
      if (index === session.revealCorrectIndex) return "border-[#1f9d55] bg-[#1f9d55]/15 text-white";
      if (index === session.myAnswerIndex) return "border-[#fb5a46] bg-[#fb5a46]/15 text-white";
      return "border-white/10 bg-white/5 text-white/50";
    }
    if (index === session.myAnswerIndex) return "border-[#fb5a46] bg-[#fb5a46]/10 text-white";
    return "border-white/20 bg-white/5 text-white hover:bg-white/10";
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
          {t("questionLabel", { current: session.roundIndex + 1, total: session.totalRounds })}
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

      <div className="flex items-center justify-between">
        <h2 className="font-heading max-w-md text-xl font-bold text-white">{session.prompt}</h2>
        <motion.span
          key={session.roundIndex}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`font-mono text-lg font-bold ${warning ? "text-[#fb5a46]" : "text-white"}`}
        >
          {formatSeconds(session.remainingMs)}
        </motion.span>
      </div>

      <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
        {session.choices.map((choice, index) => (
          <button
            key={index}
            data-duoquiz-choice={index}
            data-duoquiz-revealed={revealed}
            onClick={() => session.selectAnswer(index)}
            disabled={session.phase !== "round" || session.myAnswerIndex !== null || session.remainingMs <= 0}
            className={`rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition ${choiceClass(index)}`}
          >
            {choice}
          </button>
        ))}
      </div>

      {session.awaitingPartner && !revealed && (
        <p className="text-center text-sm text-white/50">{t("awaitingPartner")}</p>
      )}
    </div>
  );
}
