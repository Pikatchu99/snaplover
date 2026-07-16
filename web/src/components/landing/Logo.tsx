interface LogoProps {
  dark?: boolean;
  className?: string;
}

// Marque SnapLover — mini bande photo (3 cases empilées) + wordmark. Voir
// docs/design/snaproom-hifi.dc.html (direction "the strip", déjà en usage
// dans les écrans hi-fi finaux).
export function Logo({ dark, className }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="flex size-7 -rotate-6 flex-col items-center justify-center gap-0.5 rounded-md bg-white p-1.5 ring-1 ring-[#ece4d8]">
        <span className="h-1 w-4 rounded-xs bg-[#fb5a46]" />
        <span className="h-1 w-4 rounded-xs bg-[#6a48f4]" />
        <span className="h-1 w-4 rounded-xs bg-[#ff7d54]" />
      </span>
      <span className={`font-heading text-lg font-bold ${dark ? "text-white" : "text-[#1c1712]"}`}>SnapLover</span>
    </div>
  );
}
