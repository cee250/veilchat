import { z } from "zod";

const temporaryInviteSchema = z.object({
  version: z.literal(1),
  type: z.literal("veilchat-temporary"),
  roomId: z.string().min(8).max(64),
  inviteToken: z.string().min(16).max(96),
  hostAlias: z.string().min(2).max(32),
  expiresAt: z.number().int().positive(),
});

export type TemporaryInvite = z.infer<typeof temporaryInviteSchema>;

export function encodeTemporaryInvite(invite: TemporaryInvite) {
  return JSON.stringify(invite);
}

export function parseTemporaryInvite(raw: string): TemporaryInvite {
  try {
    const decoded = raw.startsWith("{") ? raw : decodeURIComponent(raw);
    const invite = temporaryInviteSchema.parse(JSON.parse(decoded));
    if (invite.expiresAt <= Date.now()) throw new Error("expired");
    return invite;
  } catch {
    throw new Error("This temporary chat invite is invalid or expired.");
  }
}

export function createTemporaryInvite(input: Omit<TemporaryInvite, "version" | "type">) {
  return {
    version: 1 as const,
    type: "veilchat-temporary" as const,
    ...input,
  };
}
