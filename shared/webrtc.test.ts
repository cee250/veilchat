import { describe, expect, it } from "vitest";
import { isPeerSignalEnvelope } from "./webrtc";

describe("webrtc signaling envelope", () => {
  it("accepts versioned offer, answer, and ICE payloads", () => {
    expect(isPeerSignalEnvelope({ version: 1, type: "offer", payload: { type: "offer", sdp: "v=0" } })).toBe(true);
    expect(isPeerSignalEnvelope({ version: 1, type: "answer", payload: { type: "answer", sdp: "v=0" } })).toBe(true);
    expect(isPeerSignalEnvelope({ version: 1, type: "ice-candidate", payload: { candidate: "candidate:1" } })).toBe(true);
  });

  it("accepts an unexpired short-lived signal and rejects an expired one", () => {
    const now = 1_000;
    const signal = { version: 1, type: "offer", payload: { type: "offer", sdp: "v=0" }, expiresAt: 2_000 } as const;
    expect(isPeerSignalEnvelope(signal, now)).toBe(true);
    expect(isPeerSignalEnvelope(signal, 2_001)).toBe(false);
  });

  it("rejects malformed or unversioned signal data", () => {
    expect(isPeerSignalEnvelope({ type: "offer", payload: {} })).toBe(false);
    expect(isPeerSignalEnvelope({ version: 2, type: "offer", payload: {} })).toBe(false);
    expect(isPeerSignalEnvelope(null)).toBe(false);
  });
});
