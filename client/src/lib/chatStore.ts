import { importVaultFile, readVault, writeVault, type VaultState } from "./localVault";

export type ChatStore = {
  load(): Promise<VaultState>;
  save(state: VaultState): Promise<void>;
  exportBackup(passphrase: string): Promise<void>;
  importBackup(file: File, passphrase: string): Promise<VaultState>;
};

export function createChatStore(remote?: Partial<ChatStore>): ChatStore {
  return {
    load: remote?.load ?? readVault,
    save: remote?.save ?? writeVault,
    exportBackup: remote?.exportBackup ?? (async (passphrase: string) => {
      const state = await readVault();
      if (!passphrase || passphrase.length < 8) throw new Error("Use a passphrase with at least 8 characters.");
      const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state })], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `veilchat-vault-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    }),
    importBackup: remote?.importBackup ?? importVaultFile,
  };
}

export const localChatStore = createChatStore();
