# Mobile device check

Checked on 8 November 2026 using iPhone Mirroring and an isolated test profile.

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

This confirms real subscription-backed chat and cross-device history for the isolated test workspace. It is not a claim of pixel-identical visual parity or independent AI execution on an offline Mac.

## Single-app identity

The installed application, desktop window, mobile page and Home Screen manifest are named Gratis. The private community repository updates the existing Gratis app and data folder; it does not install a separate community app or copy personal history into the repository. The extra test app was removed while preserving its data. The original application and data were backed up before updating it.

The automated relay test passed with the single-app configuration, including microphone recording into a draft, provider/model changes, both directions of chat delivery, reconnection after restart and revocation. The physical iPhone was then paired to the original workspace with explicit trust. A phone message received `GRATIS-SYNC-OK` from Claude Opus and appeared in the same desktop chat; a desktop message received `DESKTOP-SYNC-OK` and appeared on the phone. The connection was transferred from Safari to the installed Gratis Home Screen app on the same phone. Avatar artwork and animation now come from the same renderer as the existing desktop app. The Home Screen app remained paired after updating and restarting Gratis on the Mac. The reference and Gratis were inspected on the same iPhone, including the top controls and bottom composer. Full screen-by-screen pixel identity is not claimed.
