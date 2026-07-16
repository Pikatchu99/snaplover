export {};

declare global {
  interface Window {
    // Présent uniquement si le script Umami est chargé (voir app/layout.tsx,
    // NEXT_PUBLIC_UMAMI_SCRIPT_URL/WEBSITE_ID) — toujours vérifier l'existence
    // avant d'appeler, absent en dev/si l'analytics est désactivé.
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}
