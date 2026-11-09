# Private transport and shared-chat verification

The 0.21.0 checks use temporary profiles and synthetic data. They do not read private chats, use paid provider requests, or modify the installed app's data.

| Check | Coverage |
| --- | --- |
| `npm run check` | 268 app tests and 18 team-server tests; permission filtering, job leases, provider restrictions, private-room isolation, human-only idempotency, migration backup, and in-flight revocation |
| `packages/mobile: typecheck / test / build` | Worker types/build and five relay tests; encrypted packets, expiry, trust, replay, restart, and reload without dropping active command availability |
| `test/shared-human-phone.mjs` | Two isolated desktops and two paired phone profiles; shared user messages, partial AI replies, queued responses, identical final transcript, human-only chat, membership removal |
| `test/mobile-sync.mjs` | Real local Worker; encrypted phone/desktop messaging, lost response deduplication, reload, desktop restart, subscription selector, recording fixture, avatars, profile, files, computer input and revocation; Chromium and WebKit |
| `test/mobile-screens.mjs` | Chromium/WebKit menus, search, profile, settings, creation, notifications and computer close behavior |
| Packaged macOS smoke | Same team/phone checks against the built executable, with temporary profiles and mock keychain |

The two-phone local test observed approximately 2.2–2.8 seconds from submission to the other phone displaying the user message. This is a local test result, not a network SLA. Actual provider calls were replaced by deterministic streaming fixtures.

No physical-phone verification or independent cryptography/security audit is claimed. The hosted phone client must be trusted; a malicious host could replace its JavaScript. Existing relay installations need a coordinated desktop/relay upgrade and a fresh pairing before they use the private protocol. The user's installed app and current pairing are not replaced by these automated tests.
