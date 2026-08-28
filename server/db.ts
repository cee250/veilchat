import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, conversations, messageRequests, messages, profiles, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result[0];
}

export async function findProfilesByUsername(username: string) {
  const db = await getDb(); if (!db) return [];
  // Search by username prefix for better UX, require allowDiscovery=true, no phone number requirement
  return db.select({ id: profiles.id, userId: profiles.userId, username: profiles.username, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl })
    .from(profiles).where(and(eq(profiles.allowDiscovery, true), eq(profiles.username, username))).limit(10);
}

export async function getRequestsForRecipient(recipientId: number) {
  const db = await getDb(); if (!db) return [];
  const requests = await db.select().from(messageRequests).where(and(eq(messageRequests.recipientId, recipientId), eq(messageRequests.status, "pending"))).orderBy(desc(messageRequests.createdAt));
  // Enrich with sender profile data
  const enriched: Array<typeof requests[number] & { senderProfile?: Awaited<ReturnType<typeof getProfileByUserId>> }> = [];
  for (const req of requests) {
    const senderProfile = await getProfileByUserId(req.senderId);
    enriched.push({ ...req, senderProfile });
  }
  return enriched;
}

export async function getRequestsForSender(senderId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(messageRequests).where(and(eq(messageRequests.senderId, senderId), eq(messageRequests.status, "pending"))).orderBy(desc(messageRequests.createdAt));
}

export async function getConversationsForUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select().from(conversations)
    .where(or(eq(conversations.participantAId, userId), eq(conversations.participantBId, userId)))
    .orderBy(desc(conversations.updatedAt));
  return Promise.all(rows.map(async (conversation) => {
    const peerId = conversation.participantAId === userId ? conversation.participantBId : conversation.participantAId;
    const peer = await getProfileByUserId(peerId);
    return {
      ...conversation,
      peer: peer ? {
        userId: peer.userId,
        username: peer.username,
        displayName: peer.displayName,
        avatarUrl: peer.avatarUrl,
      } : null,
    };
  }));
}

export async function deleteUserAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async (tx) => {
    const userConversations = await tx.select({ id: conversations.id }).from(conversations)
      .where(or(eq(conversations.participantAId, userId), eq(conversations.participantBId, userId)));
    const conversationIds = userConversations.map((conversation) => conversation.id);
    if (conversationIds.length) {
      await tx.delete(messages).where(inArray(messages.conversationId, conversationIds));
    }
    await tx.delete(messageRequests).where(or(eq(messageRequests.senderId, userId), eq(messageRequests.recipientId, userId)));
    await tx.delete(conversations).where(or(eq(conversations.participantAId, userId), eq(conversations.participantBId, userId)));
    await tx.delete(profiles).where(eq(profiles.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}

export async function getMessagesForConversation(conversationId: number, userId: number) {
  const db = await getDb(); if (!db) return [];
  const conversation = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), or(eq(conversations.participantAId, userId), eq(conversations.participantBId, userId)))).limit(1);
  if (!conversation[0]) return [];
  const now = new Date();
  const rows = await db.select().from(messages).where(and(eq(messages.conversationId, conversationId), or(isNull(messages.expiresAt), gt(messages.expiresAt, now)))).orderBy(messages.createdAt);
  return rows.filter((message) => !(message.senderId === userId ? message.senderDeleted : message.recipientDeleted));
}
