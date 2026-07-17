import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// Link/redirect/usePathname/useRouter conscients de la locale (préfixe /en
// ajouté/retiré automatiquement) — à utiliser partout à la place des
// équivalents next/navigation bruts pour toute navigation interne.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
