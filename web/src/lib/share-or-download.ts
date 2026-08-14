// Partage-ou-télécharge un PNG déjà généré (data URL) : Web Share API si
// dispo (mobile, la cible la plus probable pour ce genre de contenu), sinon
// téléchargement — même fallback pour la bande photo (PhotoStrip.tsx) et le
// récap Doodle Duel (DuelRecap.tsx).
export async function shareOrDownload(url: string, filename: string, text: string) {
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "SnapLover", text });
      return;
    } catch {
      // annulé ou indisponible : on retombe sur le téléchargement
    }
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
