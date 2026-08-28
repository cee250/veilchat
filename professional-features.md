# VeilChat professional feature architecture

VeilChat now uses a **local-first storage path** for device state. The browser vault stores drafts, preview messages, profile details, and local-deletion state in IndexedDB with a localStorage fallback. Users can export and restore a portable JSON vault from the profile panel. The authenticated tRPC layer remains an optional sync path for users who choose server-backed cross-device conversations.

A local-only app cannot synchronize between devices by itself. Cross-device sync requires a relay or synchronization provider. VeilChat therefore keeps that concern behind a provider boundary rather than hardwiring the product UI to one database vendor. A future user-owned Supabase, Firebase, self-hosted API, or other compatible provider can implement the same sync contract without rewriting the client vault.

| Professional capability | Current prototype behavior | Production extension |
|---|---|---|
| Privacy center | Privacy settings surface and explicit security limitation notice | Persist granular retention, discoverability, session, and deletion controls. |
| Local vault | IndexedDB/localStorage persistence plus export/restore | Encrypt the export with a user-provided passphrase and add integrity checks. |
| Safety | Quiet request decline and participant authorization | Add block, mute, report, abuse throttling, and moderation workflows. |
| Message controls | Local removal, draft persistence, no receipts or typing signals | Add reply/edit policy, copy controls, attachment scanning, and disappearing-message policy. |
| Device continuity | Optional authenticated sync hook | Add a user-owned relay, device registry, conflict resolution, and session revocation. |
| Accessibility and resilience | Keyboard send, responsive layout, reduced-motion CSS | Add full focus audit, PWA install flow, offline queue, and sync conflict states. |

The architecture deliberately avoids describing the app as anonymous, government-proof, or immune from lawful access. Server-backed sync, if enabled, must be paired with clear retention policy, provider disclosure, and an audited end-to-end encryption protocol before production privacy claims are made.
