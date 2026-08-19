"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface UtttTutorialProps {
  onDismiss: () => void;
}

const X_COLOR = "#fb5a46";
const O_COLOR = "#fbf7f1";

interface DiagramProps {
  markedCell?: { board: number; cell: number; symbol: "X" | "O" };
  stampedBoard?: { board: number; symbol: "X" | "O" };
  activeBoards?: number[] | "all";
}

// Diagramme illustratif — pas le vrai plateau de jeu, juste des données
// figées choisies pour illustrer chaque étape (voir STEPS ci-dessous).
// Réutilise volontairement les mêmes classes visuelles que
// UtttBoard.tsx (anneau corail = plateau jouable, fond sombre = case vide)
// pour que la règle illustrée ici soit immédiatement reconnaissable une
// fois en jeu.
function UtttTutorialDiagram({ markedCell, stampedBoard, activeBoards }: DiagramProps) {
  return (
    <div className="mx-auto grid w-44 grid-cols-3 gap-1.5">
      {Array.from({ length: 9 }, (_, boardIndex) => {
        const isActive = activeBoards === "all" || (Array.isArray(activeBoards) && activeBoards.includes(boardIndex));
        const isStamped = stampedBoard?.board === boardIndex;
        return (
          <div
            key={boardIndex}
            className={`grid grid-cols-3 gap-0.5 rounded-md p-1 transition ${
              isActive ? "bg-white/10 ring-2 ring-[#fb5a46]" : "bg-white/5 opacity-50"
            }`}
          >
            {isStamped ? (
              <div className="col-span-3 row-span-3 flex aspect-square items-center justify-center">
                <span
                  className="font-heading text-lg font-black"
                  style={{ color: stampedBoard.symbol === "X" ? X_COLOR : O_COLOR }}
                >
                  {stampedBoard.symbol}
                </span>
              </div>
            ) : (
              Array.from({ length: 9 }, (_, cellIndex) => {
                const isMarked = markedCell?.board === boardIndex && markedCell.cell === cellIndex;
                return (
                  <div key={cellIndex} className="flex aspect-square items-center justify-center rounded-sm bg-[#1c1a20]">
                    {isMarked && (
                      <span className="text-[9px] font-bold" style={{ color: markedCell.symbol === "X" ? X_COLOR : O_COLOR }}>
                        {markedCell.symbol}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

const STEPS = ["boards", "routing", "freeMove"] as const;

// Tutoriel de règles — retour utilisateur explicite après un premier test
// ("je comprends pas les règles") : le texte seul dans la salle d'attente
// (rulesText) ne suffisait pas pour un mécanisme aussi peu intuitif que le
// routage forcé. Même schéma que le tutoriel du mode Challenge
// (components/room/Lobby.tsx "challengeTutorial") — un tap à la fois, un
// seul bouton dont le libellé change à la dernière étape — mais avec un
// diagramme dessiné plutôt qu'une photo de sticker, puisqu'il n'y a rien
// de spécifique à CETTE partie à prévisualiser ici, juste une mécanique
// toujours identique. Contrairement au tutoriel Challenge (jamais mémorisé,
// revu à chaque séance par design produit), celui-ci n'a pas besoin d'être
// revu à chaque partie une fois compris — voir UtttLobby.tsx pour le lien
// "Revoir les règles" qui permet de le rouvrir volontairement après coup.
export function UtttTutorial({ onDismiss }: UtttTutorialProps) {
  const t = useTranslations("utttLobby.tutorial");
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;
  const key = STEPS[step];

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
        {t("stepCounter", { current: step + 1, total: STEPS.length })}
      </p>

      <h2 className="font-heading text-xl font-bold text-white">{t(`${key}Title`)}</h2>

      {key === "boards" && <UtttTutorialDiagram />}
      {key === "routing" && (
        <UtttTutorialDiagram markedCell={{ board: 4, cell: 2, symbol: "X" }} activeBoards={[2]} />
      )}
      {key === "freeMove" && <UtttTutorialDiagram stampedBoard={{ board: 4, symbol: "O" }} activeBoards="all" />}

      <p className="text-sm text-white/70">{t(`${key}Text`)}</p>

      <button
        onClick={() => (isLastStep ? onDismiss() : setStep((current) => current + 1))}
        className="w-full rounded-2xl bg-linear-to-r from-[#fb5a46] to-[#ff7d54] px-6 py-3.5 font-medium text-white transition hover:opacity-90"
      >
        {isLastStep ? t("gotIt") : t("next")}
      </button>
    </div>
  );
}
