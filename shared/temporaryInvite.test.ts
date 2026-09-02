import { describe, expect, it } from "vitest";
import { createTemporaryInvite, encodeTemporaryInvite, parseTemporaryInvite } from "./temporaryInvite";

describe("temporary invites", () => {
  const invite = createTemporaryInvite({
    roomId: "room_123456",
    inviteToken: "token_1234567890123456",
    hostAlias: "ShadowFox",
    expiresAt: Date.now() + 1_000,
  });

  it("round-trips the shared QR payload", () => {
    expect(parseTemporaryInvite(encodeTemporaryInvite(invite))).toEqual(invite);
  });

  it("rejects malformed or wrong-type payloads", () => {
    expect(() => parseTemporaryInvite("not-json")).toThrow("invalid or expired");
    expect(() => parseTemporaryInvite(JSON.stringify({ ...invite, type: "identity" }))).toThrow("invalid or expired");
  });
});
