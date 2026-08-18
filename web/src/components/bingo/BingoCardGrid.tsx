import { Star } from "lucide-react";
import { config } from "@/lib/config";
import type { BingoCard } from "@/types/bingo";

interface BingoCardGridProps {
  card: BingoCard;
  calledNumbers: number[];
}

// Carte 5x5 privée — jamais transmise (voir CLAUDE.md "Bingo"). Marquage
// automatique (case mise en avant dès que son numéro a été appelé) plutôt
// que manuel : garde l'expérience rapide et décontractée, cohérent avec le
// ton du reste de l'app.
export function BingoCardGrid({ card, calledNumbers }: BingoCardGridProps) {
  const marked = new Set(calledNumbers);

  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-5 gap-1.5">
      {config.bingo.columns.map((column) => (
        <div key={column.letter} className="text-center text-xs font-bold text-white/50">
          {column.letter}
        </div>
      ))}
      {card.numbers.map((value, index) => {
        const isFree = value === null;
        const isMarked = isFree || marked.has(value);
        return (
          <div
            key={index}
            className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition ${
              isMarked ? "bg-[#fb5a46] text-white" : "bg-white/10 text-white/80"
            }`}
          >
            {isFree ? <Star className="size-4 fill-current" /> : value}
          </div>
        );
      })}
    </div>
  );
}
