# Pages

Pages are saved interactive documents created by your existing Gratis agents. They stay attached to the same agent and chat, with immutable revisions. The viewer runs self-contained HTML, CSS and JavaScript without giving it access to the native app, your files, credentials or network.

## Create and edit

Choose your Claude or Codex subscription in Settings. In a chat, choose **Pages → Create a page**, or ask directly:

> Create an interactive Page explaining easing curves, with a curve selector, play/pause, speed controls and moving examples.

The agent calls the Pages tools and a page card appears in the conversation. Click it to open the document. The existing sidebar, agent and composer remain available. Pages use the document-scale layout; closing returns to your previous chat zoom and view.

Type changes in the page's composer, for example:

> Add a comparison with linear motion and a slider for duration. Keep the rest unchanged.

The agent reads the current revision before saving its replacement. Concurrent or stale edits are rejected. Failed generation leaves the previous version intact. Click the title to review saved versions; earlier versions are read-only. The small pencil beside the title renames the same page. Creating or editing a page does not create a duplicate agent.

The agent's Files permission controls access to page-generation tools. Models cannot silently enable it. The scripted demo does not generate pages; select a subscription first. Connector-backed pages use data retrieved by the agent before rendering. A page itself cannot call a connector or refresh from the web.

## Share

Click **Share**, select a connected team space and choose the people who may read the page. Save the access change. Recipients need an active membership in that space as well as inclusion in the selected audience. The default is private. Sharing copies only the page, its embedded data/source references and the agent's display identity, not the originating chat or provider credentials. Review embedded data before sharing.

**Copy link** produces a `gratis://page/...` link. For team pages it opens in the recipient's installed Gratis app using their existing team sign-in. For a private page it works only in the workspace that owns it. The installers register this protocol. A repository-run app can open pages from its Pages library without OS protocol registration.

After making a local edit, use Share and save access again to publish the new revision. The shared page keeps its ID; viewers receive the update. Select **People you invite** (the private option) and save to remove team access. Revocation blocks future reads, though it cannot erase data someone previously downloaded.

**Open in browser** opens a temporary, read-only loopback viewer on this computer. It is not a public hosting link. **Export HTML**, in the title's version menu, creates a portable interactive document with an isolated inner frame. Exported copies do not receive later changes and cannot be revoked remotely.

## Phone

The phone's **Pages** menu lists pages available to its paired desktop. Open one to use its controls. For your own page, the composer sends changes to the same agent and synchronizes the new revision to desktop. Shared recipient views are read-only. Phone sharing offers space-wide access or removal; use desktop to select individual people. Page content passes through the encrypted phone transport and is never placed into plaintext relay requests.

## Boundaries and recovery

- HTML is limited to 250 KB per revision, 50 revisions per page, 200 active local pages and 16 MB of Pages storage. Pages are encrypted at rest in `pages.secure` and included in local recovery checkpoints and workspace exports.
- External scripts, linked styles and nested frames are rejected. Page renderers have no native preload, Node integration or native API. Network, microphone, camera, popups and form submission are blocked.
- The team server remains trusted with shared page content, as with shared chats. Team membership is rechecked for each read; a guessed page ID is not authorization.
- Pages are snapshot documents. Scheduled refresh, anonymous public links and simultaneous multi-person source editing are not included.
- Existing desktop chats, memory, connections and avatars are not migrated by this feature.

## Verification

`npm run check` includes revision, encryption, access, conflict and provider-tool tests. `node test/pages-desktop.mjs` exercises the real renderer and hostile-page isolation. `node test/pages-sharing-desktop.mjs` checks two native app profiles, deep links, publication updates and revocation. `node test/pages-browser.mjs` checks the portable/browser viewer in Chromium and WebKit. With the local phone relay running on port 18879, `node test/pages-phone.mjs` verifies the encrypted phone viewer, interactive controls and editing through the agent. All fixtures use synthetic content and temporary profiles.

Visual regression uses the same 1280×720 viewport as the reference video. The rail, document origin, toolbar, composer and share surface are checked separately from generated content and changing animation positions. No claim of byte-identical pixels from a compressed video is made.
