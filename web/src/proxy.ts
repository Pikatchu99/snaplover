import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclut api/_next et tout chemin avec extension (icônes, robots.txt,
  // sitemap.xml, opengraph-image...) — ces routes vivent hors de [locale].
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
