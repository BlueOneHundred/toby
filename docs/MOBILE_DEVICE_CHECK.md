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


The [follow-up visual comparison](MOBILE_FIDELITY.md) records the shared-identity and avatar-picker corrections. A green avatar edit made on the physical phone was verified in the same desktop agent, then restored to blue.

## Computer and settings on the original iPhone workspace

Gratis 0.17.0 was installed over the original application, retaining its existing data. Testing stayed in the approved disposable reference conversation. The phone and desktop used the same agent, avatar and existing subscription.

- The full-screen computer was compared with the phone reference: black viewport, compact agent header, lower controls and gesture help.
- On a real cloud browser, phone pointer input selected a field and clicked Apply. Direct keyboard input and Return produced the expected saved result. The address field navigated to the test page.
- During a live Claude task, Take control paused the bot. The phone entered a unique marker. Give control back inspected the changed page and resumed automatically. The bot preserved that marker, clicked Apply once and reported the saved value in the shared conversation.
- Stop, Retry start and Restart browser were exercised against the real browser, and the test computer was left stopped.
- The phone changed the display name and appearance; the existing desktop settings reflected both. Name, original photo and Dark appearance were restored. The final one-tap profile save was checked after relaunching the installed phone app.
- Settings and Appearance were compared on the same phone, including safe-area spacing and monochrome controls. Account credentials remain managed on the desktop; the phone shows connection status.

Automated Chromium and WebKit checks cover profile/photo saving, appearance, menus, navigation and creation. The relay/Electron integration check covers ordered computer input, control handback, settings persistence, reconnect and revocation. Physical testing confirms the specific flows above; it does not establish universal pixel identity or a latency guarantee.

## Home closes the Computer preview

On 8 November 2026, Gratis 0.18.1 was installed over the same original desktop application. On the actual desktop, opening the disposable test computer and returning to Home hid the panel and resize handle; reopening the test chat did not reopen the preview. The test computer was then stopped.

The hosted phone assets were compared byte-for-byte with the tested build. On the physical iPhone, the standalone app was relaunched, the same test agent's Computer opened, and the iPhone Home Screen visited. Returning to Gratis showed the agent profile with the Computer preview dismissed. Returning to Gratis Home and opening the same chat also kept the preview closed. The agent and avatar remained the same.

Chromium and WebKit regression checks cover Home navigation and background dismissal. All four packaged desktop builds also passed the Home-panel and preview-unsubscribe check alongside chat and restart persistence. Ubuntu was checked after installing its `.deb`.
