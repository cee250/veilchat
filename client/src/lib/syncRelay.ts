export type RelayConfig = { endpoint: string; accessToken?: string };

function relayUrl(endpoint: string) {
  return `${endpoint.replace(/\/$/, "")}/v1/veilchat/vault`;
}

export async function pushEncryptedVault(config: RelayConfig, encryptedVault: string) {
  const response = await fetch(relayUrl(config.endpoint), { method: "PUT", headers: { "Content-Type": "application/json", ...(config.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : {}) }, body: JSON.stringify({ ciphertext: encryptedVault }) });
  if (!response.ok) throw new Error(`Relay upload failed (${response.status}).`);
}

export async function pullEncryptedVault(config: RelayConfig) {
  const response = await fetch(relayUrl(config.endpoint), { headers: config.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : {} });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Relay download failed (${response.status}).`);
  const payload = await response.json() as { ciphertext?: string };
  if (!payload.ciphertext) throw new Error("Relay returned an invalid vault payload.");
  return payload.ciphertext;
}
