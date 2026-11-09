# Private team pilot

Each server data directory is one workspace; roles apply within that workspace. This optional feature is community-only and off until you connect it. It is a bounded text-first pilot, not a hardened public multi-tenant service. Keep it on loopback or a private authenticated network. The server operator is trusted with plaintext team content. Existing personal chats, memory and credentials are not uploaded or migrated.

## Start a private server

Use Node.js 22.16 or newer. From the community repository:

```sh
npm run team:start -- "PATH_TO_PRIVATE_TEAM_DATA" 8788
```

The server binds only `127.0.0.1`. On first launch it writes `owner-invitation.txt` with private filesystem permissions in the chosen data directory. Open that file locally, then open Gratis Settings → **Team workspace · pilot**. Enter `http://127.0.0.1:8788`, your name and the invitation code. The invitation is single-use and expires after 24 hours. Session tokens expire after seven days and are saved encrypted by the desktop app. Owner-created member/guest invitations are also single-use. Owners can renew access for an existing member without creating a second identity, or remove a member to revoke all their sessions. A server operator who loses the owner login can run `node packages/team/owner-access.mjs PRIVATE_TEAM_DATA_DIRECTORY` locally; this writes a one-hour owner-renewal code to a private file, without modifying chats. Disconnect revokes the current server session when reachable; an offline disconnect reports that remote revocation remains outstanding.

For another device, put the loopback service behind your own private HTTPS tunnel, such as Tailscale Serve. Use application invitations in addition to private network membership. This repository does not create a tunnel, open a public port or provision a hosting bill automatically. Keep the server running for availability. Back up the SQLite database and its WAL consistently, or stop the server before copying the data directory. Do not store it in the repository.

## Use it

1. The owner creates an invitation for a member or guest and shares it privately.
2. A member selects a local bot and chooses **Publish privately**. Only reviewed configuration is copied. It remains visible only to its creator until they choose a person and **Allow use**.
3. Each person starts their own chat with a permitted bot. Even the bot owner does not gain access to another person's conversations through the application.
4. **Send using this computer** queues a durable job and executes it through that person's local Gratis provider. No Claude or Codex token is uploaded to the team service. The result returns to their team chat. This creates a local bot with tools and personal-profile recall disabled.
5. Explicit shared notes belong to a bot. Only its owner can publish or revoke them. They are supplied as untrusted context to new jobs. Revocation blocks stale in-flight result commits. It cannot erase already downloaded copies or earlier messages.

A job has a stable request ID and one execution lease. A lost connection never automatically launches a second local run. Completed results can be delivered again idempotently. An interrupted or expired execution requires review. Cancellation stops an active local task on the connected desktop; a disconnected worker must observe the cancellation before stopping. No guarantees are made about third-party actions already accepted.

The service implements owner/member/guest membership, explicit use grants, session/member revocation, private conversation ownership, a metadata-only audit log, bounded daily job creation, and exact-action expiring one-use approvals. The approval queue is viewable in the UI. External tools are disabled in this pilot, so approval records are not advertised as an integrated business-action executor.

## Remaining gates

- Existing personal memory is not migrated into the team service. Shared notes do not replace the local memory system.
- Account recovery is operator-mediated. There is no managed identity provider, email recovery, MFA, or self-service organization administration.
- Relay-blind phone transport, team access from the phone, Slack/Mattermost, public business bots/MCP, ePOS, hosted billing and payments are not enabled by this pilot.
- No enterprise identity provider, independent penetration test, production service-level commitment or Internet-facing hardening is claimed.
- Do not expose the service publicly. HTTP bearer sessions are acceptable only on loopback; remote clients require HTTPS and your private network controls.

The UI uses synthetic fixtures in automated checks; a real multi-device pilot is still required before broader rollout.

Run `npm run test:team` for server boundary tests and `node test/community-sharing-desktop.mjs` for the isolated native UI exercise.
