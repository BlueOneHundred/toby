# Implementation status

## Reliability baseline

Implemented: bounded local responses, partial-progress continuation, failure limits, T3 monitoring/retry limits, file quotas and folder access, rotating metadata diagnostics, version refusal, verified local checkpoints and resumable restore. Shared fixes are also in public core.

The existing platform installer/signature fixes remain. Signing is ad-hoc on macOS, not notarized. Packaged tests are distinct from actual third-party account usage. No real account conversations are used in fixtures.

## Configuration sharing

Implemented: strict versioned templates, credential-pattern checks, review-before-import UI, new local identity, and disabled tools/personal recall. No private data is included.

## Private team pilot

Implemented: separate service, per-person invitations/sessions, owner/member/guest, private bot configuration and explicit use grants, own conversation/job access, per-person local execution, shared notes with provenance and revocation, request deduplication, execution leases, expiring exact-action approvals, member/session revocation and audit metadata.

This is a text-first private pilot. No personal desktop ownership schema is migrated; team-server v1 data is backed up and upgraded with private histories preserved. It now provides nested spaces and live shared human transcripts with optional, queued AI replies. Earlier per-person chats stay private. Phone transport uses encrypted packets and exposes only authorized shared team rooms. External tools are disabled for the pilot, and approval records are not yet connected to business tool execution.

## Still required for the later plan

- Reviewed ownership migration for existing personal memories and derived summaries.
- Device-key rotation/recovery beyond explicit revocation and fresh pairing.
- Human-owned T3/team external-action integration and stronger operator-level cost limits.
- Richer custom roles, managed identities and production account administration.
- Independent deployment/recovery review and real two-device pilot before broader hosting.
- Multi-user Slack/Mattermost, isolated public business bot/MCP, read-only business data and future commerce.

These remain explicit follow-up work, not capabilities implied by the presence of the pilot UI.

## Pages

Implemented: encrypted revisioned local documents, shared Claude/Codex tools, page cards, isolated interactive viewer, title/version controls, selected team audiences, native links, republishing/revocation, browser/HTML exports and paired-phone viewing/editing. Public anonymous hosting and simultaneous source editing remain out of scope. See [Pages](PAGES.md).

## Slack owner-linked pilot

Implemented: Socket Mode setup, encrypted local credentials, single-use owner linking, existing-agent routing, separate channel conversations, explicit DM memory/tool opt-ins, persistent receipts/outbox, approval/stop controls and uncertain delivery review. This does not enable external tools for shared team jobs. Live workspace validation still requires an installed Slack app. See [Slack](SLACK.md).
