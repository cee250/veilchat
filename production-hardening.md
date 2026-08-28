# VeilChat production hardening boundary

VeilChat is currently a privacy-focused authenticated messaging prototype. It intentionally does not claim anonymity, immunity from lawful access, or government-proof security. The current server persists application data in the project database and therefore should not be marketed as end-to-end encrypted until a reviewed cryptographic protocol is implemented.

| Area | Prototype status | Production requirement |
|---|---|---|
| End-to-end encryption | Not implemented; authenticated server procedures are present | Use a reviewed protocol such as Signal-style pre-key sessions, audited client key storage, forward secrecy, key rotation, and safety-number verification. Do not invent cryptography. |
| Abuse prevention | Basic access checks and duplicate guards are present | Add server-side rate limiting, abuse reports, account throttling, moderation queues, and operational logging with data minimization. |
| Account integrity | Manus OAuth session plus captured country code and phone field | Add a verified SMS/voice provider, replay-safe OTP expiry, attempt limits, recovery policy, and clear retention/deletion rules. |
| Media | Avatar URL field only; no binary upload path | Add S3-backed uploads with MIME/size limits, malware scanning, signed URLs, retention controls, and authorization checks. |
| Devices and sessions | Single authenticated session abstraction | Add device registry, session revocation, key/device verification, suspicious-login alerts, and privacy-preserving session metadata. |
| Disappearing messages | Local removal semantics only | If added, define retention timers, server deletion behavior, offline-device behavior, and user-visible policy language before implementation. |

The present UI and server contracts preserve the requested exclusions: no phone numbers in chat, no read receipts, no typing indicators, and no sender notification when a recipient declines a request. These are product behaviors, not guarantees that metadata cannot exist elsewhere in the hosting or network stack.
