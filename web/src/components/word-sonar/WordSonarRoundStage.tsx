"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { UseWordSonarSessionReturn } from "@/hooks/use-word-sonar-session";
import { WordSonarLengthPicker } from "@/components/word-sonar/WordSonarLengthPicker";

interface WordSonarRoundStageProps {
  session: UseWordSonarSessionReturn;
  isInitiator: boolean;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Écran de partie — voir hooks/use-word-sonar-session.ts. La vraie
// conversation ("as-tu telle lettre ? à quelle position ?") se passe à
// l'oral entre les deux joueur·euses (caméra/micro déjà branchés via
// FaceBubbles.tsx) : cet écran n'est qu'un carnet de notes personnel
// (cases toujours éditables, jamais remplies automatiquement) et un moyen
// de tenter le mot entier à tout moment.
export function WordSonarRoundStage({ session, isInitiator }: WordSonarRoundStageProps) {
  const t = useTranslations("wordSonarRound");
  const tLobby = useTranslations("wordSonarLobby");
  const [wordInput, setWordInput] = useState("");
  const [guessBoxes, setGuessBoxes] = useState<string[]>(() => Array.from({ length: session.length }, () => ""));

  const guessReady = guessBoxes.every((letter) => letter.trim() !== "");
  const mergedGuess = guessBoxes.join("");

  // Aucun bouton "Valider" : dès que toutes les cases sont remplies, on
  // tente automatiquement — retour utilisateur réel ("pourquoi faire submit
  // si j'ai tapé la dernière lettre et trouvé ?"). guessWord() protège
  // lui-même contre les doublons/l'attente d'un aller-retour réseau en
  // cours (voir le hook), donc rappeler cet effet ne spamme rien.
  useEffect(() => {
    if (session.phase === "playing" && guessReady) session.guessWord(mergedGuess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase, guessReady, mergedGuess]);

  // "Rejouer" (voir WordSonarRecap.tsx) ramène ici, pas à la salle d'attente
  // complète (déjà connectée, caméras déjà affichées via FaceBubbles) —
  // même convention que DuelRoundStage gérant sa propre phase "lobby".
  if (session.phase === "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {isInitiator ? <WordSonarLengthPicker onLaunch={session.launch} /> : <p className="text-white/50">{tLobby("waitingForHost")}</p>}
      </div>
    );
  }

  if (session.phase === "picking") {
    if (session.myWordReady) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-white/60">{t("waitingForPartnerWord")}</p>
          <h2 className="font-heading text-3xl font-extrabold tracking-widest text-white">{session.myWord}</h2>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h2 className="font-heading text-xl font-bold text-white">{t("pickPrompt", { length: session.length })}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            session.submitWord(wordInput);
            setWordInput("");
          }}
          className="flex w-full max-w-xs flex-col items-stretch gap-3"
        >
          <input
            value={wordInput}
            onChange={(event) => setWordInput(event.target.value.slice(0, session.length))}
            placeholder={t("wordPlaceholder")}
            maxLength={session.length}
            autoFocus
            className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-center tracking-widest text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={wordInput.trim().length !== session.length}
            className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {t("confirmWord")}
          </button>
        </form>
      </div>
    );
  }

  if (session.phase === "playing") {
    const warning = session.isRelayTimed && session.gameRemainingMs <= 60_000;
    return (
      <div className="flex flex-1 flex-col gap-6">
        {session.isRelayTimed && (
          <div className="flex flex-col items-center gap-1">
            <span className={`font-mono text-2xl font-bold ${warning ? "text-[#fb5a46]" : "text-white"}`}>
              {formatClock(session.gameRemainingMs)}
            </span>
            <p className="text-xs text-white/40">{t("relayTimerHint")}</p>
          </div>
        )}

        <p className="text-center text-sm text-white/60">{t("notepadHint")}</p>

        <div className="mx-auto flex flex-wrap justify-center gap-2">
          {guessBoxes.map((letter, i) => (
            <input
              key={i}
              data-wordsonar-box={i}
              value={letter}
              maxLength={1}
              onChange={(event) => {
                const next = [...guessBoxes];
                next[i] = event.target.value.toUpperCase().slice(0, 1);
                setGuessBoxes(next);
              }}
              className="size-11 rounded-lg border border-white/20 bg-white/5 text-center font-mono text-lg font-bold text-white uppercase focus:border-white/40 focus:outline-none"
            />
          ))}
        </div>

        <p className="text-center text-sm text-white/60">{t("myWordReminder", { word: session.myWord ?? "" })}</p>
      </div>
    );
  }

  return null;
}
