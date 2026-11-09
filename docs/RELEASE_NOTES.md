# Gratis 0.21.1 community preview

This release adds private phone transport and shared human conversations in nested team spaces. Phone and team features remain exclusive to the community repository.

- New phone pairings encrypt chat text, audio, browser images, commands and delivery receipts between the desktop and paired browser. The relay sees ciphertext and routing metadata. The phone still trusts the JavaScript served by its host; the team server still stores shared team content in plaintext.
- Upgrade the desktop and your self-hosted relay together, then generate a fresh pairing code. Earlier unencrypted pairings are not silently reused.
- Organize shared work into client spaces and nested projects, with inherited owner/member/guest access and separate personal spaces.
- Send live human messages without invoking AI. Choose **Ask the assistant to reply** to use the sender's local provider. Streamed replies and queued turns appear in the same shared transcript.
- Open authorized shared rooms from the phone using the same desktop identity, agent artwork and subscription.
- Apply allowed-provider restrictions per space. Revoke access to stop queued/running work; preserve the space's existing business records.
- Persist ordered events and resume subscriptions after reconnect. Preserve prior private team chats during the backed-up database migration.
- Keep team buttons, selections and notes stable during live updates.
- Fix a phone reload race that could briefly mark a live desktop unavailable. Keep drafts when delivery is uncertain; do not silently repeat completed actions.

The team service remains a private-network text pilot. Shared external tools, always-on runners, managed identity, payments and full shared file storage are later phases. Existing personal desktop chats and credentials are not uploaded or migrated.

Validation uses isolated profiles and synthetic providers: server access/migration tests, encrypted relay tests, two-person/two-phone streaming and revocation, Chromium/WebKit phone regression, and packaged macOS team tests. This release has not been verified on a physical phone. macOS has an ad-hoc integrity signature, not notarization; Windows is unsigned.

See [Team setup](https://github.com/earlyaidopters/gratis-community/blob/v0.21.1/docs/TEAM_PILOT.md) and [private phone setup](https://github.com/earlyaidopters/gratis-community/blob/v0.21.1/docs/MOBILE.md).
