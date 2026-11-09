# Shared team workspace pilot

This optional, community-only service supports nested client/project spaces and live human conversations. It is a text-first pilot for a private network, not a managed Internet-facing multi-tenant service. The team server operator is trusted with plaintext team content. Existing desktop chats, memory and credentials are never automatically uploaded.

## Start the server

Use Node.js 22.16 or newer. From the community repository:

```sh
npm ci
npm run team:start -- "PATH_TO_PRIVATE_TEAM_DATA" 8788
```

The service binds to `127.0.0.1`. On first launch it writes a single-use owner invitation to `owner-invitation.txt` with private filesystem permissions. Open that file locally. In Gratis, choose Settings → **Team workspace · pilot**, enter `http://127.0.0.1:8788`, your name and the invitation. Invitations expire after 24 hours; sessions expire after seven days. **Renew my access** preserves your identity and conversations. Disconnect revokes the session when the server is reachable.

For other computers, use a private HTTPS endpoint, for example your own authenticated private-network tunnel. Invitations are required in addition to network access. This repository does not create a tunnel, expose a port or purchase hosting. Keep the service running. Stop it before copying its data directory, or use a SQLite-aware backup that includes its WAL. Never put this directory in Git.

Lost owner access can be recovered by the server operator with `node packages/team/owner-access.mjs PRIVATE_TEAM_DATA_DIRECTORY`. The command writes a short-lived renewal invitation locally; it does not change chat contents.

## Spaces and access

1. The owner selects Workspace and creates a child space for a client. Create project spaces inside that client as needed (up to eight levels).
2. Select the intended space before creating a member or guest invitation. Members can create bots; guests can use shared bots and chat. Access is inherited down the space tree, never sideways to another client.
3. Each person also has a private personal space. Even a workspace owner cannot browse another person's personal space through the API. The server operator still has filesystem access.
4. **Publish privately** copies a local bot's reviewed instructions, avatar and model preferences into your personal space. It does not copy chats, files, credentials or personal memory. **Move to this space** moves the published configuration and its explicitly published notes into the selected space.
5. A bot in a business space belongs to that space. Its creator is recorded, but the bot and shared conversations remain when that creator leaves. Removing membership removes access and cancels that person's queued/running tasks in inaccessible spaces. Membership inherited from a parent must be removed at the parent.
6. Owners set **Allowed AI services** for each space. Restrictions intersect with ancestor restrictions. They apply to new claims and are checked while a response is running and before committing its result.

## Live human chats and optional AI

Choose **New chat** beside a bot in the selected space. Everyone with access to that space can see the shared conversation. Human messages sync without starting an AI job. Select **Ask the assistant to reply** when you want an answer. The sender's desktop runs the request using their selected provider and subscription; provider credentials stay there. Other people see the same partial and completed answer, with speaker labels. A second AI request waits for the earlier response in that room.

The server records messages and events transactionally. Event streams reconnect using a monotonically increasing cursor. Request IDs prevent duplicate sends. Jobs use one execution lease and idempotent result delivery. An ambiguous interrupted job is not blindly executed again. Existing version-1 per-person conversations remain private after migration; the server creates a mode-0600 database backup before upgrading to version 2.

Shared notes are explicit, scoped context, not automatic personal-memory sharing. Retrieval filters authorized space IDs in SQL before returning content, with no sibling-space search. Revocation removes notes from future retrieval and invalidates stale in-flight context. It cannot erase content already downloaded or incorporated in earlier replies.

## Phone access

Pair the phone with your own desktop using the current private QR flow described in [Mobile](MOBILE.md). Open **Team chats** in the phone menu. Choose a space and room; send human messages or check **Ask the assistant to reply**. The phone uses the desktop's existing team identity. It cannot name another acting person or bypass space membership. Phone packets are encrypted end to end between that browser profile and its desktop; the separate team server still stores shared content in plaintext.

## Current limits and next phases

- Keep the team service on a private network. No managed identity provider, MFA, SSO, tenant billing, public guest links or service-level promise is included.
- The sender's desktop must be awake and connected for its AI jobs. A separate always-on runner and failover ownership are future work.
- Team AI runs with external tools and personal-memory recall disabled. Exact-action approvals exist as a primitive; space-owned connectors and an integrated external-action executor are future work.
- Files/connectors have space-ownership extension points; full shared file storage, transport adapters, public business bots/MCP, audit export/retention controls and whole-space export/deletion remain later phases.
- The shared chat API supports explicit participant lists. The UI currently shares rooms with all authorized space members.
- A server operator can read the service database. Shared team storage itself is not end-to-end encrypted.

## Verification

```sh
npm run check
node test/community-sharing-desktop.mjs
# In another terminal, start an isolated local phone relay first:
# cd packages/mobile && npx wrangler dev --local --port 18879 --var MOBILE_ENROLLMENT_KEY:<64-character-test-secret>
node test/shared-human-phone.mjs
node test/mobile-sync.mjs
node test/mobile-screens.mjs
```

The phone fixtures default to a synthetic enrollment secret (`a` repeated 64 times), only for an isolated local test relay. Never use it on a deployed relay. Tests use temporary desktop profiles and a mock keychain. The shared-phone check exercises two people, two browser profiles, streamed/queued responses, human-only messaging and membership revocation. It uses a synthetic provider, not paid live subscriptions.
