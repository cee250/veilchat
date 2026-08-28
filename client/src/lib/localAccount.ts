import { readVault, writeVault, type VaultState } from "./localVault";

export type LocalAccount = { username: string; salt: string; passwordHash: string };
const encoder = new TextEncoder();
function b64(bytes: Uint8Array) { let value = ""; bytes.forEach((byte) => { value += String.fromCharCode(byte); }); return btoa(value); }
function bytes(value: string) { const raw = atob(value); return Uint8Array.from(raw, (char) => char.charCodeAt(0)); }
async function derive(password: string, salt: Uint8Array) { const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]); const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 210000, hash: "SHA-256" }, material, 256); return b64(new Uint8Array(bits)); }
export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) { if (password.length < 10) throw new Error("Use at least 10 characters for your password."); return { salt: b64(salt), passwordHash: await derive(password, salt) }; }
export async function createLocalAccount(username: string, password: string): Promise<LocalAccount> { const normalized = username.trim().toLowerCase(); if (!/^@[a-z0-9_]{3,32}$/.test(normalized.startsWith("@") ? normalized : `@${normalized}`)) throw new Error("Username must be 3–32 lowercase letters, numbers, or underscores."); const identity = normalized.startsWith("@") ? normalized : `@${normalized}`; const result = await hashPassword(password); return { username: identity, ...result }; }
export async function saveLocalAccount(account: LocalAccount) { const state = await readVault(); await writeVault({ ...state, account }); }
export async function verifyLocalAccount(username: string, password: string) { const state = await readVault(); if (!state.account || state.account.username !== username) return false; return (await hashPassword(password, bytes(state.account.salt))).passwordHash === state.account.passwordHash; }
