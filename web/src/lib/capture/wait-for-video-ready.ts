import { config } from "@/lib/config";

// Attend qu'une frame décodée soit disponible avant de capturer — certains
// navigateurs/environnements n'assurent pas la lecture immédiate d'un
// <video autoplay> rattaché à un MediaStream fraîchement monté.
export function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("playing", finish);
      resolve();
    };

    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("playing", finish, { once: true });
    setTimeout(finish, config.capture.videoReadyTimeoutMs);
  });
}
