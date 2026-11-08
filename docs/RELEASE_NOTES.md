Gratis 0.18.3 fixes the duplicated custom-answer field in bot setup. “Something else” now focuses the main composer, so there is only one editable draft. Quick-answer buttons share the same send protection and Stop handling as typed messages.

Includes the sending, streaming and computer-preview improvements from 0.18.2:

- The circular Stop control appears as soon as a message is submitted. Rapid clicks no longer submit the same message twice, and failed sends preserve the draft.
- Existing messages and sidebar rows stay in place while responses stream. Sidebar previews strip Markdown formatting, and background status updates no longer reorder chats.
- Computer startup keeps a calm placeholder instead of flashing an empty white browser. The last useful preview remains visible until a replacement image is ready. Real connection and navigation errors still appear.
- Creating a bot keeps the conversation in view while its computer prepares in the background.
- Settings menus have roomier targets. A remembered phone connection now includes a Copy phone address button.

The packaged-build checks exercise rapid Send/Stop, cancellation during a pending send, failed draft recovery, streamed Markdown, stable message elements, settings menus, computer previews and narrow windows.

Available for Apple silicon Mac, Intel Mac, Windows x64 and Ubuntu x64. Returning Home closes the Computer preview on desktop and phone without stopping the bot or deleting its browser state.

Download the installer matching your computer. These are unsigned community preview builds, distributed from the Early AI-dopters public repository. Signing and notarization are not configured yet. See `docs/DOWNLOADS.md` for installation, verification, platform requirements and feature limits.

Existing Gratis data is preserved when updating. Provider accounts, phone pairing, Composio and cloud computers are configured by each user; downloads contain no accounts or chat data.
