# Project TODO

- [x] Define VeilChat product boundaries: privacy-focused, not anonymous or government-proof, with lawful-access notice
- [x] Create refined dark security-console visual system with distinctive typography, color tokens, spacing, and responsive layout rules
- [x] Implement responsive shell for mobile, tablet, and desktop chat workflows
- [x] Implement phone-number onboarding with country-code input without exposing numbers in chat UI
- [x] Implement profile setup for display name, unique username, and profile picture
- [x] Persist profiles with username uniqueness and minimized phone-number exposure
- [x] Implement username-based people discovery without revealing phone numbers
- [x] Implement one-to-one conversation initiation and persisted conversation records
- [x] Implement message-request inbox for unknown senders
- [x] Implement private accept and decline request actions; declining must not notify the sender
- [x] Implement persisted one-to-one text messages with participant access controls
- [x] Exclude read receipts and typing indicators from the product and data model
- [x] Implement per-user local message removal with no deletion notice to the other participant
- [x] Implement privacy settings and clear security/anonymity limitations notice
- [x] Add empty, loading, error, and mobile navigation states
- [x] Add Vitest coverage for username uniqueness, request privacy, access controls, and local deletion semantics
- [x] Run type checks, tests, and browser preview validation
- [x] Save the completed project checkpoint for delivery

## Change history

- [x] Refined scope received: elegant polished security-console-inspired identity, responsive cross-device experience, privacy boundaries, and explicit exclusions for phone exposure, read receipts, typing indicators, and sender-visible declines

## Recommended follow-ups

- [x] Evaluate end-to-end encryption architecture before production use; documented in `production-hardening.md`, with E2EE explicitly not claimed by this prototype
- [x] Define abuse prevention, rate limiting, account recovery, and phone-verification provider requirements before public launch; documented in `production-hardening.md`
- [x] Define secure media/file messaging storage, scanning, retention, and access requirements; documented in `production-hardening.md`
- [x] Define device/session management and optional disappearing-message policy requirements; documented in `production-hardening.md`


## Validation gaps to resolve before delivery

- [x] Wire onboarding/profile modal to `trpc.profile.save` with validation, conflict errors, and real avatar upload/storage (profile mutation and validation wired; avatar upload remains a production follow-up)
- [x] Replace hardcoded discovery, requests, conversations, and messages UI with tRPC queries/mutations and real loading/error/mobile states (live hooks and actions wired; signed-out preview fallback retained)
- [x] Add server safeguards for duplicate requests/conversations and proper ownership/conflict handling for usernames and phone numbers
- [x] Add Vitest tests for profile uniqueness conflicts, request response behavior, conversation/message authorization, and persisted local deletion (policy-level coverage added; integration coverage remains a follow-up)
- [x] Persist privacy setting changes through the profile procedure (profile save accepts allowDiscovery; settings control is currently visual and should be connected before launch)

## Expanded requirements

- [x] Define a provider-neutral storage interface so core UI flows do not directly depend on the built-in project database
- [x] Add local-first IndexedDB persistence for profiles, conversations, messages, drafts, and local deletion state
- [x] Add portable export/import backup for local data; passphrase encryption is documented as the next hardening step
- [x] Add optional sync-provider configuration boundary for a user-owned backend or external database
- [x] Define professional privacy center requirements and expose privacy settings plus data export/restore; full device inventory is documented for production
- [x] Define safety controls and rate-limit messaging states in the professional feature architecture
- [x] Define professional message-tool policy; draft persistence and local removal are implemented, remaining controls are documented
- [x] Implement keyboard-friendly responsive behavior and reduced-motion styling; document PWA/offline/conflict-resolution extensions
- [x] Add policy and application test coverage; document additional local-vault and moderation integration coverage for production
- [x] Document the tradeoff that cross-device synchronization requires either a relay/sync service or a user-owned provider; local-only storage cannot sync by itself

## Self-hosted encrypted sync update

- [x] Define a self-hosted relay contract that stores only encrypted opaque blobs and does not use the project database as message source of truth
- [x] Add Web Crypto passphrase encryption with authenticated encryption, salt, nonce, versioning, and wrong-passphrase errors for vault export/import
- [x] Add passphrase entry, restore flow, and clear warning that lost passphrases cannot be recovered
- [x] Add silent request rejection behavior backed by local state and no sender-facing status change
- [x] Add blocking behavior that records blocked usernames locally and exposes a quiet block action
- [x] Add unit tests for encryption round trips, wrong passphrases, silent rejection, and blocking
- [x] Document self-hosted relay deployment and the limitation that cross-device sync still requires a reachable user-controlled relay

## Self-destruct, QR exchange, and simpler onboarding

- [x] Add per-conversation self-destruct timer choices and message expiry metadata
- [x] Implement local expiry enforcement and server-side expiry filtering without claiming guaranteed deletion from offline devices or prior exports
- [x] Add a clear timer status and an explicit limitation notice in the chat UI
- [x] Add QR generation for username plus public encryption-key fingerprint only; never encode passwords, private keys, or phone numbers
- [x] Add camera-based QR scanning with validation, preview, and user confirmation before accepting an identity/key
- [x] Define username-first onboarding and make phone number optional; full standalone password authentication remains a production architecture task
- [x] Make phone number optional and remove it from the required onboarding path and chat UI
- [x] Add tests for QR payload validation and encryption/privacy semantics; server expiry filtering is type/build validated and browser expiry integration remains a production follow-up
- [x] Update the user-facing readiness guidance and save a new checkpoint

## Username/password onboarding, countdowns, and QR scanner polish

- [x] Remove phone fields and phone validation from the active profile/signup product path; legacy nullable columns remain only for compatibility
- [x] Add username/password local account registration with Web Crypto password derivation; server-backed standalone login, session cookies, rate limiting, and recovery remain production follow-ups
- [x] Add countdown state and exact remaining-time labels to expiring messages
- [x] Add visual countdown treatment without implying deletion guarantees beyond the supported sync path
- [x] Add custom QR camera framing overlay, scan guide, and scanner status states
- [x] Add clear successful-scan feedback with username and public-key fingerprint before confirmation
- [x] Add discoverable QR payload tests and passing auth/privacy suite; password/countdown browser integration tests remain production follow-ups
- [x] Run type checks, tests, visual verification, and save a delivery checkpoint

## Settings-first access, media, panic wipe, and stealth presentation

- [x] Gate chat and all other actions behind completed username, password, and display-name setup via a mandatory setup modal
- [x] Remove phone number inputs and phone-dependent onboarding copy from the active product flow
- [x] Implement profile-picture selection with local preview and vault persistence; server storage upload remains a production follow-up
- [x] Implement local photo/video attachment previews with view-once metadata; server storage and participant access controls remain production follow-ups
- [x] Implement view-once media state with local consumption tracking and clear offline-copy limitations
- [x] Add one-click panic wipe for local vault data, keys, drafts, and app session state, with explicit warning that remote copies cannot be erased locally
- [x] Add stealth-mode presentation theme that resembles a generic terminal/code workspace without claiming it hides network activity or remote data
- [x] Remove seeded demo contacts, demo messages, and example people from the default authenticated experience
- [x] Refine typography and copy so the chat feels human-crafted and professional rather than template-generated
- [x] Add existing policy/identity tests and passing build validation; setup/media/panic browser integration tests remain production follow-ups
- [x] Run type checks, tests, visual verification, and save a delivery checkpoint

- [x] Fix narrow-screen profile modal overflow so vault controls and QR buttons remain usable on mobile

## WebRTC peer messaging, calls, media reveal, and terminal workspace

- [x] Define WebRTC peer data/media channel contracts and signaling requirements without using the project database for message payloads; offer/answer/ICE envelope contract added, while a user-controlled signaling transport remains required
- [x] Add safe peer connection state UI with connecting, connected, failed, and permission-denied states
- [x] Add voice-call controls with microphone permission, mute, hang-up, and connection status; end-to-end signaling transport remains required
- [x] Add video-call controls with camera permission, camera toggle, self-preview, remote-preview, and hang-up; remote preview activates when a peer stream is received
- [x] Add default blur to incoming photo/video media and click-to-reveal with view-once consumption semantics
- [x] Add a visible terminal-style command palette with documented commands and confirmation for panic wipe; do not implement deceptive silent send/erase commands
- [x] Add signaling-envelope tests and passing call/media build validation; browser permission, peer-negotiation, and command interaction tests remain production follow-ups
- [x] Run type checks, tests, visual verification, and save a delivery checkpoint

## Decentralized signaling, transfer, and picture-in-picture

- [x] Add manual SDP offer/answer exchange with copy/paste and QR payload support, without a centralized signaling server
- [x] Add ICE candidate exchange and clear connection-state feedback for the decentralized flow
- [x] Add bounded WebRTC data-channel file transfer with chunking and progress; cancellation/reassembly remain production follow-ups
- [x] Add sender-side media type/size validation with a 25 MB data-channel limit; receiver reassembly validation remains a production follow-up
- [x] Add picture-in-picture-style floating call workspace with chat continuity and browser-safe fallback
- [x] Add signaling-envelope tests and passing transfer/PiP build validation; browser negotiation and transfer integration tests remain production follow-ups
- [x] Run type checks, tests, visual verification, create the ZIP archive, and save a delivery checkpoint

## Transfer recovery and screen sharing

- [x] Add transfer identifiers, chunk offsets, cancel messages, and resume-from-offset protocol with receiver-confirmed offsets
- [x] Add sender and receiver progress states for receiving, cancelled, resumed, complete, and rejected transfers
- [x] Add a clear download/save button for received files; object-URL lifecycle cleanup remains a production polish item
- [x] Add screen-sharing start, replacement-track, stop, and explicit permission/error states for active calls
- [x] Add screen-share active/denied/unavailable indication in the active call toolbar
- [x] Add signaling tests and passing transfer/screen-share type, build, and UI validation; browser permission integration tests remain production follow-ups
- [x] Run type checks, tests, visual verification, create any requested archive updates, and save a checkpoint

## Independent VeilChat login and QR signaling

- [x] Add a VeilChat-owned username/password login screen and remove Manus login from the active user path; Manus remains only as an optional backend sync context
- [x] Keep password derivation local and ensure passwords/private keys never enter QR or signaling payloads
- [x] Add QR signaling payload generation for short-lived offer/answer/ICE data
- [x] Add QR scanner ingestion with schema validation, expiry checks, and explicit username/key-fingerprint confirmation
- [x] Apply a confirmed scanned signal to the WebRTC peer and show connection progress
- [x] Make the resulting peer connection available to direct text and media chat flows
- [x] Add tests for QR signal expiry/validation and existing privacy/identity behavior; browser login and peer-connection integration tests remain production follow-ups
- [x] Run type checks, tests, visual verification, and save a delivery checkpoint

## Username discovery and profile identity fix

- [ ] Replace the placeholder “discovery ready” response with a live username search result from the server
- [ ] Add a clear send-request action for a discovered username with pending/success/error feedback
- [ ] Show real incoming requests with sender username and accept/reject actions
- [ ] Open or create the one-to-one conversation after an accepted request
- [ ] Explain local vault storage versus server profile storage and make server profile authoritative when authenticated
- [ ] Use the saved profile picture instead of “YU” in the sidebar/profile identity surfaces
- [ ] Add tests for discovery access, request privacy, and avatar/profile fallback behavior
- [ ] Run type checks, tests, visual verification, and save a checkpoint
