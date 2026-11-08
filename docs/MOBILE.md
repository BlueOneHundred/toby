# Mobile companion

## Pair once

1. Keep Gratis Community running on an awake Mac.
2. Open **Connect phone** in the desktop sidebar.
3. Scan the QR code with the iPhone camera and open the link in Safari. The invitation expires after two minutes and can be claimed once.
4. Click **Trust this phone** on the desktop. Chats are not shared until this approval.
5. In Safari, use Share → Add to Home Screen for a standalone window. If iOS uses a separate browser storage profile for the installed app, pair that profile once as well.

The connection is remembered across reloads and desktop restarts. One phone/browser profile is supported per desktop. **Disconnect phone** revokes the old credential. Closing the desktop window keeps a confirmed mobile connection running; quitting the app or putting the Mac to sleep makes it unavailable.

## What syncs

The phone shows up to 200 recent root conversations, including group chats, and the latest 60 messages in the selected chat (bounded to 100,000 characters, 30,000 per message). You can switch chats, start a chat with the desktop's selected bot, send text, watch streamed responses and stop a response. Choosing a chat on the phone does not change the desktop's selected chat.

Messages use the same desktop chat runtime, model settings and accounts. The phone does not receive provider API keys. File uploads, connection settings, approvals, native voice recording and remote computer control remain desktop features in this release.

If the Mac is offline, the composer keeps your draft but does not queue new work. A command accepted just before a network failure is tracked by its sequence and content digest. Retries cannot execute it twice. If a restart interrupts delivery at an ambiguous point, the phone asks you to check the chat rather than silently replaying it.

## Hosting the relay

The small relay lives in `packages/mobile`; it is independent of the cloud browser and does not create a browser container.

```sh
cd packages/mobile
npm ci
npm run build
npm run typecheck
npm test
npx wrangler secret put MOBILE_ENROLLMENT_KEY
npx wrangler deploy
```

Choose a strong random enrollment secret of at least 32 characters. Configure the desktop's **Connect phone** form with the deployed HTTPS address and this secret. Keep the secret in private operator storage, never in Git or a distributed app bundle. Each self-hosted installation uses its own relay and secret. A community operator can provision member desktops separately; this release does not include a public sign-up or tenant-management service.

For private installation provisioning, the desktop consumes a `mobile-provision.json` file in its data directory, shaped as `{ "endpoint": "https://your-relay.example", "enrollmentKey": "YOUR_PRIVATE_SECRET" }`. Use file mode 0600. After a successful import the file is removed and settings are stored with the operating system's secure storage. Never include it in a release.

## Privacy and reliability

Pairing credentials are encrypted on the Mac and stored in the phone browser's local storage. The relay stores authorization hashes, a command sequence/digest and a bounded delivery receipt. Chat projections and pending command text are transient in relay memory; they are not written to its database. The relay operator can access content while it is being relayed. Transport uses HTTPS; this is not end-to-end encryption.

Clearing Safari/site data removes the phone credential and drafts. Disconnect the old phone on the Mac before pairing another. If a relay restarts, it requests a fresh projection from the desktop. Provider sessions and memory remain on the Mac.

Active phone polling is about 900 ms and desktop polling 1.5 seconds, with additional updates triggered by chat changes. Background Safari is subject to iOS suspension. No instant-delivery SLA, offline agent execution or push notification service is included.

## Verification

`npm test` covers bridge persistence, bounded projection, commands and access checks. `packages/mobile` tests cover invitation expiry, confirmation, revocation, ownership and duplicate commands. `test/mobile-sync.mjs` uses a real relay with an isolated Electron profile and a mocked provider to test both directions, interrupted responses, reload, restart and revocation. The test defaults to a local relay on port 18879; `MOBILE_TEST_URL` and `MOBILE_TEST_SECRETS_FILE` select a private deployed relay. No credentials belong in the test report.
