# Gratis 0.22.3 community preview

This update aligns mobile Pages with the observed iPhone reference and keeps them connected to the existing Gratis agents.

- Open Pages from the agent's Library or from a Page card in its chat. The Library contains that agent's own Pages and files.
- The phone viewer uses circular close/share controls and a full-height document. Sharing opens a rounded sheet with actual access choices, a copyable address and an Edit in chat action.
- Edit in chat targets the same saved Page and existing agent. Avatar updates do not reset the document's controls.
- Small, encrypted Page previews appear in the phone transcript. Preview frames remain isolated from the app and cannot access its credentials or network.
- Closing a Page invalidates outstanding refreshes, preventing a late response from reopening it. Actions wait for pending requests rather than dropping a fast tap.

Verified with synthetic profiles in Chromium and WebKit, including interactive controls, phone edits, desktop synchronization, live avatar updates and two-person sharing/revocation. The desktop test suite and package identity checks also run before release.

Sharing remains authenticated to a team space; anonymous public links are not implemented. The physical iPhone reference was inspected, but final on-device verification of the updated Gratis build is pending. This release does not claim complete pixel-for-pixel parity.

Mac builds use ad-hoc integrity signatures rather than Apple notarization; Windows builds remain unsigned. See [Pages documentation](https://github.com/earlyaidopters/gratis-community/blob/v0.22.3/docs/PAGES.md).
