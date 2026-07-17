import type { IceServer } from "@/types/webrtc";

export type SignalPayload =
  | { sdp: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit };

interface PeerConnectionOptions {
  iceServers: IceServer[];
  initiator: boolean;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onDataChannel: (channel: RTCDataChannel) => void;
  sendSignal: (data: SignalPayload) => void;
  // Le serveur TURN a rejeté la demande d'allocation (creds invalides, quota
  // épuisé côté fournisseur...) — voir onicecandidateerror ci-dessous. Un
  // échec isolé n'est pas forcément fatal (le direct P2P peut réussir quand
  // même) : à combiner avec onConnectionStateChange côté appelant.
  onTurnCandidateError?: (event: RTCPeerConnectionIceErrorEvent) => void;
  // Connu une fois la paire de candidats ICE effectivement retenue identifiée
  // (voir reportConnectionType) — "relay" si la vidéo transite par le TURN,
  // "direct" sinon (host/srflx/prflx). Appelé une seule fois par connexion établie.
  onConnectionTypeKnown?: (type: "direct" | "relay") => void;
}

// Type de la paire de candidats effectivement utilisée pour cette connexion
// (par opposition aux candidats simplement *rassemblés*, voir onicecandidate
// ci-dessus) — seule source fiable pour savoir si le relais TURN est utilisé.
async function resolveConnectionType(pc: RTCPeerConnection): Promise<"direct" | "relay" | null> {
  const stats = await pc.getStats();
  let selectedPairId: string | undefined;

  stats.forEach((report) => {
    if (report.type === "transport" && report.selectedCandidatePairId) {
      selectedPairId = report.selectedCandidatePairId;
    }
  });
  if (!selectedPairId) {
    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.nominated && report.state === "succeeded") {
        selectedPairId = report.id;
      }
    });
  }
  if (!selectedPairId) return null;

  const pairReport = stats.get(selectedPairId);
  if (!pairReport) return null;

  const localCandidate = stats.get(pairReport.localCandidateId);
  const remoteCandidate = stats.get(pairReport.remoteCandidateId);
  const isRelay = localCandidate?.candidateType === "relay" || remoteCandidate?.candidateType === "relay";
  return isRelay ? "relay" : "direct";
}

// Établissement WebRTC (P2P vidéo + data channel) — voir SNAPROOM-SPEC.md §9.
// L'hôte (initiator) crée le data channel "ctrl" et l'offer ; l'invité répond.
export function createPeerConnection(options: PeerConnectionOptions) {
  const {
    iceServers,
    initiator,
    localStream,
    onRemoteStream,
    onConnectionStateChange,
    onDataChannel,
    sendSignal,
    onTurnCandidateError,
    onConnectionTypeKnown,
  } = options;

  const pc = new RTCPeerConnection({ iceServers });

  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

  const remoteStream = new MediaStream();
  pc.ontrack = (event) => {
    for (const track of event.streams[0]?.getTracks() ?? []) remoteStream.addTrack(track);
    onRemoteStream(remoteStream);
  };

  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    console.debug("[webrtc] ice candidate type:", event.candidate.type);
    sendSignal({ candidate: event.candidate.toJSON() });
  };

  pc.onconnectionstatechange = () => {
    onConnectionStateChange(pc.connectionState);
    if (pc.connectionState === "connected" && onConnectionTypeKnown) {
      resolveConnectionType(pc)
        .then((type) => {
          if (type) onConnectionTypeKnown(type);
        })
        .catch((error) => console.error("[webrtc] échec de résolution du type de connexion:", error));
    }
  };

  // Ne se déclenche QUE pour un serveur STUN/TURN configuré (event.url pointe
  // vers l'un des iceServers) — un rejet côté serveur TURN (creds invalides,
  // quota fournisseur épuisé...) se manifeste ici, pas dans connectionState.
  pc.onicecandidateerror = (event) => {
    const iceErrorEvent = event as RTCPeerConnectionIceErrorEvent;
    console.debug(`[webrtc] ice candidate error (${iceErrorEvent.url}): ${iceErrorEvent.errorCode} ${iceErrorEvent.errorText}`);
    if (iceErrorEvent.url?.startsWith("turn:") || iceErrorEvent.url?.startsWith("turns:")) {
      onTurnCandidateError?.(iceErrorEvent);
    }
  };

  let dataChannel: RTCDataChannel | null = null;
  if (initiator) {
    dataChannel = pc.createDataChannel("ctrl");
    onDataChannel(dataChannel);
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      onDataChannel(dataChannel);
    };
  }

  async function createOffer() {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (pc.localDescription) sendSignal({ sdp: pc.localDescription.toJSON() as RTCSessionDescriptionInit });
  }

  async function handleSignal(data: SignalPayload) {
    if ("sdp" in data) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) sendSignal({ sdp: pc.localDescription.toJSON() as RTCSessionDescriptionInit });
      }
    } else if ("candidate" in data) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  // Remplace les pistes envoyées par une nouvelle caméra (ex. après un
  // track.stop() suivi d'un nouveau getUserMedia) SANS renégocier ni rejoindre
  // le signaling — la connexion (et le rôle hôte/invité déjà tiré) reste
  // intacte. `replaceTrack` est fait pour exactement ce cas.
  async function replaceLocalStream(newStream: MediaStream) {
    const senders = pc.getSenders();
    for (const track of newStream.getTracks()) {
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) await sender.replaceTrack(track);
    }
  }

  return {
    pc,
    createOffer,
    handleSignal,
    replaceLocalStream,
    getDataChannel: () => dataChannel,
  };
}
