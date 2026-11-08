# Mobile device check

Checked on 8 November 2026 using iPhone Mirroring and a disposable Community profile.

- The Safari QR pairing completed with desktop trust.
- A message entered on the iPhone appeared in the desktop conversation.
- A message entered on the desktop appeared in the iPhone conversation.
- The desktop application was updated and restarted; the phone reconnected without another QR code.
- Gratis was installed on the iPhone Home Screen as a standalone web app.
- iOS gave that app separate storage, so its initial pairing replaced the Safari pairing.
- The standalone app retained its pairing after being dismissed and relaunched.
- A focused composer submitted a test message with one native tap; the message reached the desktop.
- The composer retained the header while typing and returned to the home-indicator area after sending.
- Visual checks covered the compact avatar header, neutral chat bubbles, latest-message position and bottom composer.

These checks used the explicitly labeled local demo responder. They verify device pairing, rendering and chat transport; they are not a claim of live Claude or Codex inference on the phone. Provider requests still run on the desktop.

## Subscription follow-up

The follow-up check used actual signed-in desktop subscriptions, not the demo responder:

- From the iPhone, Claude Haiku returned `CLAUDE-LIVE-OK`; the same desktop thread showed Claude/Haiku usage.
- The phone model picker switched the workspace to Codex GPT-6.1-Sol.
- From the iPhone, Codex returned `CODEX-LIVE-OK`; the same desktop thread showed Codex/GPT-6.1-Sol usage.
- Credentials remained on the Mac. No API key was entered on the phone.
- The existing paired relay was upgraded without creating a new pairing.

This confirms real subscription-backed chat and cross-device history for the Community workspace. It is not a claim of pixel-identical visual parity or independent AI execution on an offline Mac.
