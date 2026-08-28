import { describe, expect, it } from "vitest";
import { makeIdentityCard, parseIdentityCard } from "./IdentityQr";

describe("identity QR payload", () => {
  it("contains only a username and public-key fingerprint", () => {
    const card = makeIdentityCard("@mira", "vc-key-12345678");
    expect(parseIdentityCard(JSON.stringify(card))).toEqual(card);
    expect(JSON.stringify(card)).not.toContain("password");
    expect(JSON.stringify(card)).not.toContain("phone");
  });
  it("rejects malformed or private-looking payloads", () => {
    expect(() => parseIdentityCard(JSON.stringify({ version: 1, type: "veilchat-identity", username: "mira", publicKeyFingerprint: "short" }))).toThrow("Invalid VeilChat identity QR");
  });
});
