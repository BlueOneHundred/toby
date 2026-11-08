# Mobile companion

## Pair once

1. Keep Gratis running on an awake computer.
2. Open **Connect phone** in the desktop sidebar.
3. Scan the QR code with the iPhone camera and open the link in Safari. The invitation expires after two minutes and can be claimed once.
4. Click **Trust this phone** on the desktop. Chats are not shared until this approval.
5. In Safari, use Share → Add to Home Screen for a standalone window. If iOS uses a separate browser storage profile for the installed app, pair that profile once as well.

The connection is remembered across reloads and desktop restarts. One phone/browser profile is supported per desktop. **Disconnect phone** revokes the old credential. Closing the desktop window keeps a confirmed mobile connection running; quitting the app or putting the desktop computer to sleep makes it unavailable.

## Shared appearance

The phone and desktop use the same agent identities, avatar artwork, group portraits and pins. Choose **Appearance** in the phone model/settings panel, or in desktop Settings, to share a Light, Dark, or Match system preference. Renames and deletions preserve the other agents’ appearances. See [One Gratis identity](SHARED_APPEARANCE.md).

## What syncs

The phone shows up to 200 recent root conversations, including group chats, and the latest 60 messages in the selected chat (bounded to 100,000 characters, 30,000 per message). The home list shows agents by their desktop names and avatars, plus shared group chats. From the home screen, tap your profile picture and choose **All chats** for individual conversation history. You can create an agent, edit its name or avatar, start another chat with the agent you are viewing, send text, watch streamed responses and stop a response. Agent edits and pins update the existing desktop record. The Delete action confirms before removing that same agent on both devices. The open conversation is remembered after a reload. Choosing a chat on the phone does not change the desktop's selected chat.

Messages use the same desktop chat runtime and subscriptions. From the home screen, tap your profile picture and choose the provider/model row. You can also open **Edit → Model** from an agent profile. Choose Claude (Haiku, Sonnet or Opus) or one of the models available to your signed-in Codex account. Changing the provider also updates the desktop workspace settings; the selected bot remembers its model. Credentials stay on the desktop computer. Use **Refresh connections** after signing in on the desktop.

New workspaces start in the explicitly labeled demo mode until a provider is selected. Demo history stays labeled Demo after switching; the model settings identify the active provider/model.

The phone does not need a separate Claude or Codex login. It sends the message to your running Mac, which performs the subscription-backed request and streams the same response into the shared conversation. The phone does not receive provider API keys. Use **+** for Photo or Video, Take Photo, or Choose File. Attachments are limited to 1 MB after optional image compression and are stored in the same bot workspace as desktop attachments. The profile shows routines and files. Its Notifications switch enables completion notifications while the phone app is open; it does not register a background push service. The phone can start and view the same cloud computer, take control, click, drag, scroll, type, and give control back. Approval decisions and Composio account management remain desktop features.



If the desktop computer is offline, the composer keeps your draft but does not queue new work. A command accepted just before a network failure is tracked by its sequence and content digest. Retries cannot execute it twice. If a restart interrupts delivery at an ambiguous point, the phone asks you to check the chat rather than silently replaying it.

## Voice input

Tap the microphone to record, then tap stop. A waveform shows that audio is being captured. The phone sends the recording to the desktop computer for transcription and Haiku cleanup; the result appears in the composer for review before sending. Microphone permission is required. The Mac needs the voice dependencies described in [Quickstart](QUICKSTART.md). Recordings are limited to two minutes and 1 MB.

Audio travels through the same relay as chat commands and is processed by the desktop computer. The relay operator can access in-flight audio. The waveform control also starts a recording; it is not a continuous voice-call feature.

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

## Relay updates

This chat relay uses immediate Durable Object code updates so its request validator and the mobile UI advance together. It does not execute the AI job: the desktop computer retains that work. Pairing hashes and command receipts remain durable through an update, and the desktop republishes the transient chat view. The phone also checks the relay protocol version before enabling model controls.

Cloudflare changed active objects to deferred updates by default on 30 October 2026. Without an explicit strategy, an existing phone connection can keep the previous validator while new assets expose new commands. See [Cloudflare’s update behavior](https://developers.cloudflare.com/changelog/post/2026-10-30-durable-objects-deferred-code-updates/).

## Privacy and reliability

Pairing credentials are encrypted on the desktop computer and stored in the phone browser's local storage. The relay stores authorization hashes, a command sequence/digest and a bounded delivery receipt. Chat projections and pending command text are transient in relay memory; they are not written to its database. The relay operator can access content while it is being relayed. Transport uses HTTPS; this is not end-to-end encryption.

Clearing Safari/site data removes the phone credential and drafts. Disconnect the old phone on the desktop computer before pairing another. If a relay restarts, it requests a fresh projection from the desktop. Provider sessions and memory remain on the desktop computer.

Normal phone polling is about 900 ms and desktop polling 1.5 seconds. While a computer view is open, the phone polls at 160 ms and the desktop checks commands at 250 ms, with frame updates throttled to 120 ms. Actual latency depends on the network and cloud browser. Background Safari is subject to iOS suspension. No instant-delivery SLA, offline agent execution or push notification service is included.

## Device verification

The [physical iPhone check](MOBILE_DEVICE_CHECK.md) records the Safari and Home Screen tests. The mobile layout shares the desktop’s neutral chat surfaces and icon set, with a compact avatar header, rounded bubbles and bottom composer. The installed view accounts for iOS status-bar and keyboard viewport differences.

## Verification

`npm test` covers bridge persistence, bounded projection, commands and access checks. `packages/mobile` tests cover invitation expiry, confirmation, revocation, ownership and duplicate commands. `test/mobile-sync.mjs` uses a real relay with an isolated Electron profile and a mocked provider to test both directions, interrupted responses, reload, restart and revocation. The test defaults to a local relay on port 18879; `MOBILE_TEST_URL` and `MOBILE_TEST_SECRETS_FILE` select a private deployed relay. No credentials belong in the test report.

`node test/mobile-screens.mjs` checks the menus, bottom search navigation, profile/empty-state layouts, create/cancel behavior and notification transitions in Chromium and WebKit using synthetic data.

## Computer and settings

Open an agent profile and choose **Computer**. It opens the same conversation computer used on desktop. You start in view mode. **Take control** pauses the bot; **Give control back** waits for pending input, inspects the current page and resumes the existing task. If inspection fails, you keep control. A control revision prevents stale input after another device changes ownership.

Tap to click, hold to right-click, drag with one finger, use two fingers to scroll, and pinch to zoom. The keyboard button accepts text; the controls menu provides keys, a web address field, refresh, restart and stop. Signed browser endpoints and service credentials stay on the desktop computer. Only bounded screen images pass through the existing authenticated relay while the view is open. Its lease expires after the phone stops keeping it alive.

The home profile button opens Settings. Profile name and photo edits update the existing desktop settings. Appearance is shared, and AI subscriptions use the existing provider selector. Connections shows status; account sign-in and credentials are managed on the desktop computer.
