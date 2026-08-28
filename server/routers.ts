import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { conversations, messageRequests, messages, profiles } from "../drizzle/schema";
import { getConversationsForUser, getDb, getMessagesForConversation, getProfileByUserId, getRequestsForRecipient, getRequestsForSender, findProfilesByUsername } from "./db";

const usernameSchema = z.string().min(3).max(32).regex(/^[a-z0-9_]+$/);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    me: protectedProcedure.query(({ ctx }) => getProfileByUserId(ctx.user.id)),
    save: protectedProcedure.input(z.object({ displayName: z.string().min(1).max(80), username: usernameSchema, avatarUrl: z.string().url().optional().or(z.literal("")), allowDiscovery: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const existingByUsername = await db.select().from(profiles).where(eq(profiles.username, input.username)).limit(1);
      if (existingByUsername[0] && existingByUsername[0].userId !== ctx.user.id) throw new TRPCError({ code: "CONFLICT", message: "That username is already taken." });
      const existing = await getProfileByUserId(ctx.user.id);
      const values = { ...input, avatarUrl: input.avatarUrl || null };
      if (existing) await db.update(profiles).set(values).where(eq(profiles.userId, ctx.user.id));
      else await db.insert(profiles).values({ ...values, userId: ctx.user.id });
      return getProfileByUserId(ctx.user.id);
    }),
  }),
  discovery: router({
    byUsername: protectedProcedure.input(z.object({ username: usernameSchema })).query(({ ctx, input }) => findProfilesByUsername(input.username, ctx.user.id)),
  }),
  requests: router({
    incoming: protectedProcedure.query(({ ctx }) => getRequestsForRecipient(ctx.user.id)),
    send: protectedProcedure.input(z.object({ recipientId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      if (input.recipientId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot message yourself." });
      const alreadyConnected = await db.select().from(conversations).where(or(and(eq(conversations.participantAId, ctx.user.id), eq(conversations.participantBId, input.recipientId)), and(eq(conversations.participantAId, input.recipientId), eq(conversations.participantBId, ctx.user.id)))).limit(1);
      if (alreadyConnected[0]) throw new TRPCError({ code: "CONFLICT", message: "You already have a conversation with this person." });
      const existingRequest = await db.select().from(messageRequests).where(and(eq(messageRequests.senderId, ctx.user.id), eq(messageRequests.recipientId, input.recipientId), eq(messageRequests.status, "pending"))).limit(1);
      if (existingRequest[0]) throw new TRPCError({ code: "CONFLICT", message: "Request already sent." });
      await db.insert(messageRequests).values({ senderId: ctx.user.id, recipientId: input.recipientId });
      return { success: true } as const;
    }),
    respond: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), action: z.enum(["accepted", "declined"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const request = await db.select().from(messageRequests).where(and(eq(messageRequests.id, input.requestId), eq(messageRequests.recipientId, ctx.user.id), eq(messageRequests.status, "pending"))).limit(1);
      if (!request[0]) throw new Error("Request not found");
      if (input.action === "declined") {
        // A decline is recipient-local: remove the pending request without creating sender-observable state.
        await db.delete(messageRequests).where(eq(messageRequests.id, input.requestId));
        return { success: true } as const;
      }
      await db.update(messageRequests).set({ status: input.action, respondedAt: new Date() }).where(eq(messageRequests.id, input.requestId));
      if (input.action === "accepted") {
        const a = Math.min(request[0].senderId, request[0].recipientId), b = Math.max(request[0].senderId, request[0].recipientId);
        const existingConversation = await db.select().from(conversations).where(or(and(eq(conversations.participantAId, a), eq(conversations.participantBId, b)), and(eq(conversations.participantAId, b), eq(conversations.participantBId, a)))).limit(1);
        if (!existingConversation[0]) await db.insert(conversations).values({ participantAId: a, participantBId: b });
      }
      return { success: true } as const;
    }),
  }),
  conversations: router({
    list: protectedProcedure.query(({ ctx }) => getConversationsForUser(ctx.user.id)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => getMessagesForConversation(input.conversationId, ctx.user.id)),
    send: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), body: z.string().min(1).max(10000), expiresAt: z.number().int().positive().optional(), kind: z.enum(["text", "image", "video"]).default("text"), mediaUrl: z.string().url().optional().or(z.literal("")), viewOnce: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const convo = await db.select().from(conversations).where(and(eq(conversations.id, input.conversationId), or(eq(conversations.participantAId, ctx.user.id), eq(conversations.participantBId, ctx.user.id)))).limit(1);
      if (!convo[0]) throw new Error("Conversation not found");
      const recipientId = convo[0].participantAId === ctx.user.id ? convo[0].participantBId : convo[0].participantAId;
      await db.insert(messages).values({ conversationId: input.conversationId, senderId: ctx.user.id, recipientId, body: input.body.trim(), kind: input.kind, mediaUrl: input.mediaUrl || null, viewOnce: input.viewOnce, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null });
      await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, input.conversationId));
      return { success: true } as const;
    }),
    deleteLocally: protectedProcedure.input(z.object({ messageId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const message = await db.select().from(messages).where(eq(messages.id, input.messageId)).limit(1);
      if (!message[0]) throw new Error("Message not found");
      const convo = await db.select().from(conversations).where(and(eq(conversations.id, message[0].conversationId), or(eq(conversations.participantAId, ctx.user.id), eq(conversations.participantBId, ctx.user.id)))).limit(1);
      if (!convo[0]) throw new Error("Not authorized");
      await db.update(messages).set(message[0].senderId === ctx.user.id ? { senderDeleted: true } : { recipientDeleted: true }).where(eq(messages.id, input.messageId));
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
