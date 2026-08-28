export type PolicyMessage = {
  senderId: number;
  body: string;
  senderDeleted: boolean;
  recipientDeleted: boolean;
};

export function isMessageVisibleToUser(message: PolicyMessage, viewerId: number) {
  return !(message.senderId === viewerId ? message.senderDeleted : message.recipientDeleted);
}

export function shouldNotifyRequestSenderOnDecline() {
  return false;
}

export function shouldPersistDeclinedRequestForSender() {
  return false;
}

export function shouldSuppressUsername(username: string, blockedUsernames: string[]) {
  return blockedUsernames.includes(username);
}

export function includesReadReceiptOrTypingSignal(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const keys = Object.keys(payload as Record<string, unknown>);
  return keys.includes("readAt") || keys.includes("readReceipt") || keys.includes("typing");
}
