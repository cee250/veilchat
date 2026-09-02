import { nanoid } from "nanoid";

export const ROOM_TTL_MS = 30 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_VOICE_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export type TemporaryAlias = string;

type Participant = {
  id: string;
  alias: TemporaryAlias;
};

export type TemporaryMessage = {
  id: string;
  memberId: string;
  alias: TemporaryAlias;
  body: string;
  sentAt: number;
  deliveredBy?: string;
  readBy?: string;
};

type TemporaryMedia = {
  id: string;
  memberId: string;
  alias: TemporaryAlias;
  kind: "voice" | "photo";
  dataUrl: string;
  sentAt: number;
  consumedBy?: string;
};

export type TemporaryMediaSnapshot = Omit<TemporaryMedia, "dataUrl"> & { dataUrl?: string };

type Room = {
  id: string;
  inviteToken: string;
  expiresAt: number;
  host: Participant;
  guest?: Participant;
  messages: TemporaryMessage[];
  media: TemporaryMedia[];
  typing?: { memberId: string; expiresAt: number };

};

export type RoomSnapshot = {
  roomId: string;
  expiresAt: number;
  hostAlias: string;
  guestAlias?: string;
  currentMemberId: string;
  currentAlias: string;
  participantCount: number;
  typingAlias?: string;
  messages: TemporaryMessage[];
  media: TemporaryMediaSnapshot[];
};

const rooms = new Map<string, Room>();

export function validateAlias(alias: string) {
  const normalized = alias.trim();
  if (!/^[A-Za-z0-9 ._-]{2,32}$/.test(normalized)) {
    throw new Error("Alias must be 2–32 characters using letters, numbers, spaces, dots, dashes, or underscores.");
  }
  return normalized;
}

function removeExpiredRooms(now = Date.now()) {
  rooms.forEach((room, roomId) => {
    if (room.expiresAt <= now) rooms.delete(roomId);
  });
}

function requireRoom(roomId: string, inviteToken: string) {
  removeExpiredRooms();
  const room = rooms.get(roomId);
  if (!room || room.inviteToken !== inviteToken) {
    throw new Error("This temporary chat invite is invalid or expired.");
  }
  return room;
}

function snapshot(room: Room, currentMemberId: string): RoomSnapshot {
  if (room.typing && room.typing.expiresAt <= Date.now()) room.typing = undefined;
  const current = room.host.id === currentMemberId ? room.host : room.guest;
  if (!current) throw new Error("You are not a participant in this room.");
  return {
    roomId: room.id,
    expiresAt: room.expiresAt,
    hostAlias: room.host.alias,
    guestAlias: room.guest?.alias,
    currentMemberId,
    currentAlias: current.alias,
    participantCount: room.guest ? 2 : 1,
    typingAlias: room.typing && room.typing.memberId !== currentMemberId
      ? (room.typing.memberId === room.host.id ? room.host.alias : room.guest?.alias)
      : undefined,
    messages: room.messages.slice(),
    media: room.media.map((item) => ({
      ...item,
      dataUrl: item.consumedBy ? undefined : item.dataUrl,
    })),
  };
}

export function createTemporaryRoom(aliasInput: string) {
  removeExpiredRooms();
  const alias = validateAlias(aliasInput);
  const room: Room = {
    id: nanoid(16),
    inviteToken: nanoid(32),
    expiresAt: Date.now() + ROOM_TTL_MS,
    host: { id: nanoid(12), alias },
    messages: [],
    media: [],
  };
  rooms.set(room.id, room);
  return {
    ...snapshot(room, room.host.id),
    inviteToken: room.inviteToken,
  };
}

export function joinTemporaryRoom(roomId: string, inviteToken: string, aliasInput: string) {
  const room = requireRoom(roomId, inviteToken);
  if (room.guest) throw new Error("This temporary room already has two participants.");
  const alias = validateAlias(aliasInput);
  room.guest = { id: nanoid(12), alias };
  return snapshot(room, room.guest.id);
}

export function getTemporaryRoom(roomId: string, inviteToken: string, memberId: string) {
  return snapshot(requireRoom(roomId, inviteToken), memberId);
}

export function setTemporaryTyping(roomId: string, inviteToken: string, memberId: string, isTyping: boolean) {
  const room = requireRoom(roomId, inviteToken);
  if (room.host.id !== memberId && room.guest?.id !== memberId) {
    throw new Error("You are not a participant in this room.");
  }
  room.typing = isTyping ? { memberId, expiresAt: Date.now() + 6_000 } : undefined;
  return snapshot(room, memberId);
}

export function acknowledgeTemporaryMessages(roomId: string, inviteToken: string, memberId: string) {
  const room = requireRoom(roomId, inviteToken);
  if (room.host.id !== memberId && room.guest?.id !== memberId) {
    throw new Error("You are not a participant in this room.");
  }
  room.messages.forEach((message) => {
    if (message.memberId !== memberId) message.deliveredBy = memberId;
  });
  return snapshot(room, memberId);
}

export function markTemporaryMessagesRead(roomId: string, inviteToken: string, memberId: string, messageIds: string[] = []) {
  const room = requireRoom(roomId, inviteToken);
  if (room.host.id !== memberId && room.guest?.id !== memberId) {
    throw new Error("You are not a participant in this room.");
  }
  const targetIds = new Set(messageIds);
  room.messages.forEach((message) => {
    if (message.memberId !== memberId && (targetIds.size === 0 || targetIds.has(message.id))) message.readBy = memberId;
  });
  return snapshot(room, memberId);
}

export function sendTemporaryMessage(roomId: string, inviteToken: string, memberId: string, bodyInput: string) {
  const room = requireRoom(roomId, inviteToken);
  const member = room.host.id === memberId ? room.host : room.guest?.id === memberId ? room.guest : undefined;
  if (!member) throw new Error("You are not a participant in this room.");
  const body = bodyInput.trim();
  if (!body || body.length > MAX_MESSAGE_LENGTH) throw new Error("Message must contain 1–2,000 characters.");
  room.typing = undefined;
  room.messages.push({ id: nanoid(12), memberId, alias: member.alias, body, sentAt: Date.now() });
  return snapshot(room, memberId);
}

function getParticipant(room: Room, memberId: string) {
  const member = room.host.id === memberId ? room.host : room.guest?.id === memberId ? room.guest : undefined;
  if (!member) throw new Error("You are not a participant in this room.");
  return member;
}

function validateMedia(kind: "voice" | "photo", dataUrlInput: string) {
  const match = dataUrlInput.match(/^data:(audio\/(?:webm|ogg|mp4)|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Unsupported media format.");
  const isVoice = match[1].startsWith("audio/");
  if ((kind === "voice") !== isVoice) throw new Error("Media type does not match the selected action.");
  const bytes = Buffer.byteLength(match[2], "base64");
  const maxBytes = kind === "voice" ? MAX_VOICE_BYTES : MAX_PHOTO_BYTES;
  if (bytes > maxBytes) throw new Error(`${kind === "voice" ? "Voice note" : "Photo"} is too large.`);
  return dataUrlInput;
}

export function sendTemporaryMedia(roomId: string, inviteToken: string, memberId: string, kind: "voice" | "photo", dataUrlInput: string) {
  const room = requireRoom(roomId, inviteToken);
  const member = getParticipant(room, memberId);
  const dataUrl = validateMedia(kind, dataUrlInput);
  room.media.push({ id: nanoid(12), memberId, alias: member.alias, kind, dataUrl, sentAt: Date.now() });
  return snapshot(room, memberId);
}

export function consumeTemporaryMedia(roomId: string, inviteToken: string, memberId: string, mediaId: string) {
  const room = requireRoom(roomId, inviteToken);
  getParticipant(room, memberId);
  const item = room.media.find((media) => media.id === mediaId);
  if (!item) throw new Error("This media is no longer available.");
  if (item.memberId === memberId) throw new Error("Only the recipient can consume this media.");
  if (item.consumedBy) throw new Error("This media is no longer available.");
  item.consumedBy = memberId;
  return snapshot(room, memberId);
}

export function leaveTemporaryRoom(roomId: string, inviteToken: string, memberId: string) {
  const room = requireRoom(roomId, inviteToken);
  if (room.host.id !== memberId && room.guest?.id !== memberId) {
    throw new Error("You are not a participant in this room.");
  }
  rooms.delete(roomId);
  return { success: true as const };
}

export function clearTemporaryRoomsForTests() {
  rooms.clear();
}

export function roomCountForTests() {
  removeExpiredRooms();
  return rooms.size;
}
