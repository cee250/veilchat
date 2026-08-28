export type IdentityCard = { version: 1; type: "veilchat-identity"; username: string; publicKeyFingerprint: string };

export function makeIdentityCard(username: string, publicKeyFingerprint: string): IdentityCard {
  return { version: 1, type: "veilchat-identity", username: username.startsWith("@") ? username : `@${username}`, publicKeyFingerprint };
}

export function parseIdentityCard(raw: string): IdentityCard {
  const parsed = JSON.parse(raw) as Partial<IdentityCard>;
  if (parsed.version !== 1 || parsed.type !== "veilchat-identity" || typeof parsed.username !== "string" || !/^@[a-z0-9_]{3,32}$/.test(parsed.username) || typeof parsed.publicKeyFingerprint !== "string" || parsed.publicKeyFingerprint.length < 8) throw new Error("Invalid VeilChat identity QR.");
  return parsed as IdentityCard;
}
