# Gratis 0.22.2 community preview

This release adds interactive Pages to the existing Gratis app.

- Claude and Codex agents can create, read and revise self-contained interactive documents through the same Pages tool interface.
- Page cards open into a document workspace with the original agent, an isolated viewer and the existing composer. Closing restores the chat and its prior zoom.
- Encrypted local storage retains immutable versions and rejects stale edits. Pages are included in recovery checkpoints and workspace exports.
- Share a page with selected members of a team space, open it by a native link, publish revisions and revoke future access. The source conversation and provider credentials are not shared.
- Open a temporary read-only viewer in a browser or export a standalone interactive HTML copy.
- Paired phones can view and interact with the same pages, send edits through the same agent and manage space-wide sharing. The relay continues to carry encrypted payloads.
- Page content cannot access the native app, filesystem, credentials, network, device permissions or parent document.

Tests use synthetic provider responses, temporary desktop profiles and mock keychain access. Coverage includes both provider tool paths, creation/revision persistence, two-person sharing and revocation, hostile page isolation, Chromium/WebKit browser viewers and encrypted phone-to-desktop edits. Existing chats and credentials are not migrated. Pages and phone/team features remain community-only.

The private team service and paired desktop must be available for remote operations. Public anonymous hosting, automatic live data refresh and simultaneous source editing are not included. Mac builds use ad-hoc integrity signatures rather than Apple notarization; Windows builds remain unsigned.

See [Pages documentation](https://github.com/earlyaidopters/gratis-community/blob/v0.22.2/docs/PAGES.md).
