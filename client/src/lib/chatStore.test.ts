import { describe, expect, it, vi } from "vitest";
import { createChatStore } from "./chatStore";

describe("chat store adapter", () => {
  it("delegates to an optional sync provider without changing the client contract", async () => {
    const state = { messages: [], drafts: {}, locallyDeleted: [] };
    const load = vi.fn().mockResolvedValue(state);
    const save = vi.fn().mockResolvedValue(undefined);
    const exportBackup = vi.fn().mockResolvedValue(undefined);
    const importBackup = vi.fn().mockResolvedValue(state);
    const store = createChatStore({ load, save, exportBackup, importBackup });

    await expect(store.load()).resolves.toEqual(state);
    await store.save(state);
    await store.exportBackup();
    await store.importBackup(new File(["{}"], "vault.json", { type: "application/json" }));
    expect(load).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(state);
    expect(exportBackup).toHaveBeenCalledOnce();
    expect(importBackup).toHaveBeenCalledOnce();
  });
});
