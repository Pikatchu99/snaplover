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
}

// Établissement WebRTC (P2P vidéo + data channel) — voir SNAPROOM-SPEC.md §9.
// L'hôte (initiator) crée le data channel "ctrl" et l'offer ; l'invité répond.
export function createPeerConnection(options: PeerConnectionOptions) {
  const { iceServers, initiator, localStream, onRemoteStream, onConnectionStateChange, onDataChannel, sendSignal } =
    options;

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

  pc.onconnectionstatechange = () => onConnectionStateChange(pc.connectionState);

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

  return {
    pc,
    createOffer,
    handleSignal,
    getDataChannel: () => dataChannel,
  };
}
