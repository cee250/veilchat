export type PeerSignalType = "offer" | "answer" | "ice-candidate";

export type PeerSignalEnvelope = {
  version: 1;
  type: PeerSignalType;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  expiresAt?: number;
  identity?: { username: string; publicKeyFingerprint: string };
};

export function isPeerSignalEnvelope(value: unknown, now = Date.now()): value is PeerSignalEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PeerSignalEnvelope>;
  const identity = candidate.identity as { username?: unknown; publicKeyFingerprint?: unknown } | undefined;
  return candidate.version === 1 && (candidate.type === "offer" || candidate.type === "answer" || candidate.type === "ice-candidate") && typeof candidate.payload === "object" && candidate.payload !== null && (candidate.expiresAt === undefined || (typeof candidate.expiresAt === "number" && candidate.expiresAt > now)) && (identity === undefined || (typeof identity.username === "string" && typeof identity.publicKeyFingerprint === "string"));
}

export const WEBRTC_DEPLOYMENT_NOTE = "WebRTC media and data are peer-to-peer after negotiation. A user-controlled signaling endpoint is still required to exchange offer/answer/ICE messages, and TURN may be required when direct connectivity fails.";
