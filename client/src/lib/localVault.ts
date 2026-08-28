export type VaultState = {
  profile?: { countryCode?: string; phoneE164?: string; displayName: string; username: string; avatarUrl?: string };
  account?: { username: string; salt: string; passwordHash: string };
  messages: Array<{ id: number; mine: boolean; body: string; time: string; expiresAt?: number }>;
  drafts: Record<string, string>;
  locallyDeleted: number[];
  blockedUsernames?: string[];
  rejectedRequestIds?: number[];
};

const DB_NAME = "veilchat-local-vault";
const STORE = "state";
const KEY = "current";
const emptyState: VaultState = { messages: [], drafts: {}, locallyDeleted: [], blockedUsernames: [], rejectedRequestIds: [] };

function readFallback(): VaultState {
  try { return { ...emptyState, ...JSON.parse(localStorage.getItem("veilchat-vault") || "{}")} as VaultState; } catch { return emptyState; }
}
function writeFallback(state: VaultState) { try { localStorage.setItem("veilchat-vault", JSON.stringify(state)); } catch {} }

export async function readVault(): Promise<VaultState> {
  if (typeof indexedDB === "undefined") return readFallback();
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => resolve(readFallback());
    request.onsuccess = () => { const transaction = request.result.transaction(STORE, "readonly"); const get = transaction.objectStore(STORE).get(KEY); get.onerror = () => resolve(readFallback()); get.onsuccess = () => resolve({ ...emptyState, ...(get.result || {}) }); };
  });
}

export async function writeVault(state: VaultState) {
  writeFallback(state);
  if (typeof indexedDB === "undefined") return;
  return new Promise<void>((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => resolve();
    request.onsuccess = () => { const transaction = request.result.transaction(STORE, "readwrite"); transaction.objectStore(STORE).put(state, KEY); transaction.oncomplete = () => resolve(); transaction.onerror = () => resolve(); };
  });
}

function toBase64(bytes: Uint8Array) { let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); }
function fromBase64(value: string) { const binary = atob(value); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); }

async function deriveKey(passphrase: string, salt: Uint8Array) {
  if (!passphrase || passphrase.length < 8) throw new Error("Use a passphrase with at least 8 characters.");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 210000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptVault(state: VaultState, passphrase: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, new TextEncoder().encode(JSON.stringify(state)));
  return JSON.stringify({ version: 1, algorithm: "AES-GCM", kdf: "PBKDF2-SHA-256", iterations: 210000, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) });
}

export async function decryptVault(serialized: string, passphrase: string): Promise<VaultState> {
  try {
    const envelope = JSON.parse(serialized);
    if (envelope?.version !== 1 || envelope?.algorithm !== "AES-GCM") throw new Error("Unsupported vault format");
    const key = await deriveKey(passphrase, fromBase64(envelope.salt));
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(envelope.iv).buffer as ArrayBuffer }, key, fromBase64(envelope.ciphertext));
    return { ...emptyState, ...JSON.parse(new TextDecoder().decode(plaintext)) } as VaultState;
  } catch { throw new Error("Unable to unlock vault. Check the passphrase or file."); }
}

export async function exportVaultFile(passphrase: string) {
  const serialized = await encryptVault(await readVault(), passphrase);
  const blob = new Blob([serialized], { type: "application/vnd.veilchat.vault+json" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `veilchat-vault-${new Date().toISOString().slice(0, 10)}.veilvault`; anchor.click(); URL.revokeObjectURL(url);
}

export async function importVaultFile(file: File, passphrase: string) {
  const state = await decryptVault(await file.text(), passphrase); await writeVault(state); return state;
}

export async function wipeLocalVault() {
  try { localStorage.removeItem("veilchat-vault"); } catch {}
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase(DB_NAME); request.onsuccess = () => resolve(); request.onerror = () => resolve(); request.onblocked = () => resolve(); });
}
