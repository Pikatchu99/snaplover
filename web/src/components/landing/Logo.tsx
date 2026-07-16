interface LogoProps {
  dark?: boolean;
  className?: string;
}

// Marque SnapRoom — mini bande photo (3 barres) + wordmark.
export function Logo({ dark, className }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="flex size-7 items-center justify-center gap-0.5 rounded-md bg-white p-1.5 ring-1 ring-[#ece4d8]">
        <span className="h-full w-1 rounded-sm bg-[#fb5a46]" />
        <span className="h-full w-1 rounded-sm bg-[#6a48f4]" />
        <span className="h-full w-1 rounded-sm bg-[#fb5a46]" />
      </span>
      <span className={`font-heading text-lg font-bold ${dark ? "text-white" : "text-[#1c1712]"}`}>SnapRoom</span>
    </div>
  );
}
