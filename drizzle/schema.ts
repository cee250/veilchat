import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  phoneE164: varchar("phoneE164", { length: 20 }).unique(),
  countryCode: varchar("countryCode", { length: 6 }),
  displayName: varchar("displayName", { length: 80 }).notNull(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  avatarUrl: text("avatarUrl"),
  allowDiscovery: boolean("allowDiscovery").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  participantAId: int("participantAId").notNull(),
  participantBId: int("participantBId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  participantIdx: index("conversation_participants_idx").on(table.participantAId, table.participantBId),
}));

export const messageRequests = mysqlTable("messageRequests", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
}, (table) => ({ requestIdx: index("request_recipient_status_idx").on(table.recipientId, table.status) }));

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  body: text("body").notNull(),
  senderDeleted: boolean("senderDeleted").default(false).notNull(),
  recipientDeleted: boolean("recipientDeleted").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  kind: mysqlEnum("kind", ["text", "image", "video"]).default("text").notNull(),
  mediaUrl: text("mediaUrl"),
  viewOnce: boolean("viewOnce").default(false).notNull(),
  viewed: boolean("viewed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ conversationIdx: index("messages_conversation_idx").on(table.conversationId, table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type MessageRequest = typeof messageRequests.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
