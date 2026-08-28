import { describe, expect, it } from "vitest";
import { includesReadReceiptOrTypingSignal, isMessageVisibleToUser, shouldNotifyRequestSenderOnDecline, shouldPersistDeclinedRequestForSender, shouldSuppressUsername } from "./policy";

describe("VeilChat privacy policy", () => {
  const message = { senderId: 7, body: "private", senderDeleted: false, recipientDeleted: false };

  it("hides a message only for the user who removed it locally", () => {
    expect(isMessageVisibleToUser({ ...message, senderDeleted: true }, 7)).toBe(false);
    expect(isMessageVisibleToUser({ ...message, senderDeleted: true }, 9)).toBe(true);
    expect(isMessageVisibleToUser({ ...message, recipientDeleted: true }, 9)).toBe(false);
    expect(isMessageVisibleToUser({ ...message, recipientDeleted: true }, 7)).toBe(true);
  });

  it("keeps declined requests private from the sender", () => {
    expect(shouldNotifyRequestSenderOnDecline()).toBe(false);
    expect(shouldPersistDeclinedRequestForSender()).toBe(false);
  });

  it("suppresses locally blocked usernames", () => {
    expect(shouldSuppressUsername("@arirowan", ["@arirowan"])).toBe(true);
    expect(shouldSuppressUsername("@mira", ["@arirowan"])).toBe(false);
  });

  it("does not permit read receipts or typing signals in message payloads", () => {
    expect(includesReadReceiptOrTypingSignal({ body: "hello", createdAt: Date.now() })).toBe(false);
    expect(includesReadReceiptOrTypingSignal({ body: "hello", readReceipt: true })).toBe(true);
    expect(includesReadReceiptOrTypingSignal({ body: "hello", typing: true })).toBe(true);
  });
});

import { decryptVault, encryptVault } from "../client/src/lib/localVault";

describe("encrypted local vault", () => {
  it("round-trips state with a passphrase and rejects the wrong passphrase", async () => {
    const state = { messages: [{ id: 1, mine: true, body: "secret", time: "12:00" }], drafts: { "1": "draft" }, locallyDeleted: [2], blockedUsernames: ["@quiet"], rejectedRequestIds: [3] };
    const encrypted = await encryptVault(state, "correct horse battery");
    expect(encrypted).not.toContain("secret");
    await expect(decryptVault(encrypted, "correct horse battery")).resolves.toMatchObject(state);
    await expect(decryptVault(encrypted, "wrong passphrase")).rejects.toThrow("Unable to unlock vault");
  });
});
