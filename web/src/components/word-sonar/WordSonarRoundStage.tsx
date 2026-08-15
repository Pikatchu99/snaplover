"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import type { UseWordSonarSessionReturn } from "@/hooks/use-word-sonar-session";
import type { WordSonarEvent } from "@/types/word-sonar";

interface WordSonarRoundStageProps {
  session: UseWordSonarSessionReturn;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Ce que je sais du mot de mon·ma partenaire, déduit de MES propres questions
// (jamais transmis tel quel sur le réseau — reconstruit localement à partir
// de `events`, la même donnée que la révélation "as-tu la lettre X ?").
function buildKnownBoard(events: WordSonarEvent[], length: number): (string | null)[] {
  const board: (string | null)[] = Array.from({ length }, () => null);
  for (const event of events) {
    if (event.askerIsMe && event.kind === "letter" && event.positions) {
      for (const pos of event.positions) board[pos] = event.letter ?? null;
    }
  }
  return board;
}

function askedLetterState(events: WordSonarEvent[]): { found: Set<string>; eliminated: Set<string> } {
  const found = new Set<string>();
  const eliminated = new Set<string>();
  for (const event of events) {
    if (event.askerIsMe && event.kind === "letter" && event.letter) {
      if (event.positions && event.positions.length > 0) found.add(event.letter);
      else eliminated.add(event.letter);
    }
  }
  return { found, eliminated };
}

function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

function EventLog({ events }: { events: WordSonarEvent[] }) {
  const t = useTranslations("wordSonarRound");
  if (events.length === 0) return null;
  return (
    <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto text-sm">
      {events.map((event, index) => {
        const who = event.askerIsMe ? t("you") : t("partner");
        if (event.kind === "skip") {
          return (
            <li key={index} className="text-white/40 italic">
              {t("turnSkipped", { who })}
            </li>
          );
        }
        if (event.kind === "letter") {
          const found = (event.positions?.length ?? 0) > 0;
          return (
            <li key={index} className="flex items-center gap-2 text-white/70">
              {found ? (
                <Check className="size-3.5 shrink-0 text-emerald-400" />
              ) : (
                <X className="size-3.5 shrink-0 text-white/30" />
              )}
              {who} · {event.letter}
              {found && ` (${(event.positions ?? []).map((p) => p + 1).join(", ")})`}
            </li>
          );
        }
        return (
          <li key={index} className="flex items-center gap-2 text-white/70">
            {event.correct ? (
              <Check className="size-3.5 shrink-0 text-emerald-400" />
            ) : (
              <X className="size-3.5 shrink-0 text-white/30" />
            )}
            {who} · {event.word}
          </li>
        );
      })}
    </ul>
  );
}

interface PlayingBoardProps {
  session: UseWordSonarSessionReturn;
  board: (string | null)[];
  found: Set<string>;
  eliminated: Set<string>;
  canAskLetter: boolean;
  guessReady: boolean;
  mergedGuess: string;
  guessBoxes: string[];
  setGuessBoxes: (next: string[]) => void;
  roundLabel: string;
}

// Séparé du rendu principal pour isoler l'effet d'auto-soumission (dépend de
// `mergedGuess`/`guessReady`, qui ne doivent être calculés qu'en phase
// "playing" — les hooks ne peuvent pas être posés après un `return` précoce).
function PlayingBoard({
  session,
  board,
  found,
  eliminated,
  canAskLetter,
  guessReady,
  mergedGuess,
  guessBoxes,
  setGuessBoxes,
  roundLabel,
}: PlayingBoardProps) {
  const t = useTranslations("wordSonarRound");

  // Une tentative de mot entier n'attend ni le tour ni un clic explicite —
  // retour utilisateur réel après test : "pourquoi faire submit si j'ai tapé
  // la dernière lettre et trouvé ?". Dès que toutes les cases sont remplies,
  // on tente automatiquement (guessWord() protège lui-même contre les
  // doublons/l'attente d'un aller-retour réseau en cours, voir le hook).
  useEffect(() => {
    if (guessReady) session.guessWord(mergedGuess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guessReady, mergedGuess]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <span className="font-mono text-lg font-bold text-white">{formatSeconds(session.turnRemainingMs)}</span>
      </div>

      <p className="text-center text-sm text-white/60">{session.isMyTurn ? t("yourTurn") : t("partnerTurn")}</p>

      <p className="text-center text-xs text-white/40">{t("guessHint")}</p>
      <div className="mx-auto flex flex-wrap justify-center gap-2">
        {board.map((letter, i) => (
          <input
            key={i}
            data-wordsonar-box={i}
            value={letter ?? guessBoxes[i]}
            disabled={letter != null}
            maxLength={1}
            onChange={(event) => {
              const next = [...guessBoxes];
              next[i] = event.target.value.toUpperCase().slice(0, 1);
              setGuessBoxes(next);
            }}
            className="size-11 rounded-lg border border-white/20 bg-white/5 text-center font-mono text-lg font-bold text-white uppercase focus:border-white/40 focus:outline-none disabled:border-emerald-400/40 disabled:bg-emerald-400/10 disabled:text-emerald-300"
          />
        ))}
      </div>

      <p className="text-center text-xs text-white/40">{t("orAskLetter")}</p>
      <div className="mx-auto grid max-w-md grid-cols-7 gap-1.5 sm:grid-cols-9">
        {ALPHABET.map((letter) => {
          const isFound = found.has(letter);
          const isEliminated = eliminated.has(letter);
          return (
            <button
              key={letter}
              onClick={() => session.askLetter(letter)}
              disabled={!canAskLetter || isFound || isEliminated}
              className={`rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                isFound
                  ? "bg-emerald-400/20 text-emerald-300"
                  : isEliminated
                    ? "bg-white/5 text-white/20 line-through"
                    : "bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <EventLog events={session.events} />
    </div>
  );
}

// Écran de manche — voir hooks/use-word-sonar-session.ts pour la machine à
// états. Trois phases : "picking" (chacun tape son mot secret), "playing"
// (tableau de lettres connues + alphabet + tentative), "reveal" (résultat).
export function WordSonarRoundStage({ session }: WordSonarRoundStageProps) {
  const t = useTranslations("wordSonarRound");
  const [wordInput, setWordInput] = useState("");
  const [guessBoxes, setGuessBoxes] = useState<string[]>(() => Array.from({ length: session.length }, () => ""));

  const roundLabel = t("roundLabel", { current: session.round + 1, total: session.totalRounds });

  if (session.phase === "picking") {
    if (session.myWordReady) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
          <p className="text-sm text-white/60">{t("waitingForPartnerWord")}</p>
          <h2 className="font-heading text-3xl font-extrabold tracking-widest text-white">{session.myWord}</h2>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
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
    const board = buildKnownBoard(session.events, session.length);
    const { found, eliminated } = askedLetterState(session.events);
    // Demander une lettre reste soumis au tour (alternance question/réponse),
    // mais PAS une tentative de mot entier — voir hooks/use-word-sonar-session.ts
    // guessWord() : retour utilisateur réel après test, quelqu'un ayant déjà
    // trouvé le mot devait attendre le tour de l'autre avant de pouvoir
    // valider sa réponse. Remplir les cases suffit désormais, à tout moment.
    const canAskLetter = session.isMyTurn && !session.awaitingResult;
    const guessReady = board.every((letter, i) => letter != null || guessBoxes[i].trim() !== "");
    const mergedGuess = board.map((letter, i) => letter ?? guessBoxes[i]).join("");

    return (
      <PlayingBoard
        session={session}
        board={board}
        found={found}
        eliminated={eliminated}
        canAskLetter={canAskLetter}
        guessReady={guessReady}
        mergedGuess={mergedGuess}
        guessBoxes={guessBoxes}
        setGuessBoxes={setGuessBoxes}
        roundLabel={roundLabel}
      />
    );
  }

  if (session.phase === "reveal" && session.lastResult) {
    const { iWon, word, turns } = session.lastResult;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">{roundLabel}</p>
        <p className="text-sm text-white/60">{iWon ? t("youFoundIt") : t("partnerFoundIt")}</p>
        <h2 className="font-heading text-3xl font-extrabold tracking-widest text-white">{word}</h2>
        <p className="text-white/50">{t("turnsUsed", { count: turns })}</p>
        <button
          onClick={session.continueAfterReveal}
          className="rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          {session.isLastRound ? t("seeRecap") : t("nextRound")}
        </button>
      </div>
    );
  }

  return null;
}
