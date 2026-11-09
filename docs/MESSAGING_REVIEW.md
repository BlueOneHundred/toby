# Messaging integration review

Reviewed on 9 November 2026. This is a source review and implementation proposal, not a shipped Slack integration. No external repository was installed or executed, and no Slack account was connected. Phone and human-team features remain community-only.

## Sources inspected

| Project and revision | Useful evidence | What it actually supplies |
| --- | --- | --- |
| [OpenMausBot](https://github.com/milind-soni/OpenMausBot/tree/b33a1c6437e2b5ea55000d89210727812ea2f21d) | `server/hosted-slack.ts`, `server/routes/hosted-slack.ts`, `src/components/bot-settings/SlackSection.tsx`, `docs/verification/hosted-slack-management.md` | Its hosted Slack entry point opens a separate Admin service for a specific bot. Its own verification document says those tests do not install an app or exercise Slack messages. The visible Slack button is not a complete local Slack adapter. |
| [Rakazo](https://github.com/elie222/rakazo/tree/c76070c83a40f655fef2e298c43941f249407512) | `docs/messaging-apps.md`, `packages/adapters/src/slack-install-provider.ts`, `messaging-installations.test.ts`, `messaging-delivery.ts`, `messaging-delivery.test.ts`, `slack-messaging.test.ts`, `apps/api/src/messaging-inbound.ts` | Provider-neutral messaging, explicit account linking, room listening rules, sealed installation credentials, durable outbound delivery, retry classification and permission checks. Its tests cover concurrent delivery, revocation, failed parts and ambiguous persistence outcomes. |
| [OpenBot](https://github.com/nightly-labs/openbot/tree/bb287ece1dd2c16e4eecb21003e1fa2bb632f823) | `docs/messaging.md`, `docs/architecture/channels-and-messaging.md`, `src/backend/messaging/messaging-service.ts`, `slack/slack-events.ts`, `slack/slack-render.ts` | A Slack workspace connection, per-thread routing, coordinator delegation, quiet replies, request-owner approval/stop buttons and separate messaging memory. Its source also documents host-offline delivery limits and public-channel auto-joining. |
| [GrokBot clone](https://github.com/nickvasilescu/grokbot-clone/tree/7ee6a7ed8464311dbb467bb9ee7c76d9286e56be) | `README.md`, `server/src/triggers.ts`, `server/src/proactive.ts`, `web/src/components/DetailsPanel.tsx`; Slack references in server/UI source | The Add to Slack control starts a Composio connection. Event routines can wake a bot from a Slack event; proactive checks can remain silent. This review did not find a separate Slack conversation adapter with its own account linking and reliable reply delivery. |

These observations concern the pinned revisions, not every hosted service belonging to these projects. External tests were read, not run. Nothing here establishes production reliability or a security audit.

## Design to implement in Gratis

Use an original transport layer around the existing runtime. Do not create a second agent system, copy private memory into a transport database, or treat a connected Slack tool as a published Slack bot.

1. **A clear setup flow.** Add Settings → Connections → Messaging → Slack, separate from the existing Composio tools. Show the Slack workspace, linked Gratis identity, selected agent, allowed channels, connection status and a working disconnect action. A failed setup must leave an existing connection intact.
2. **Same agent, separate external conversations.** Persist a mapping from installation, workspace, channel and root message timestamp to a Gratis conversation and existing agent ID. Replies and delegated results return to that external thread. Existing personal chat history is never supplied merely because the agent ID matches.
3. **Explicit identity binding.** Link a Slack user to a Gratis person with a short-lived, single-use challenge. Check membership and permissions on receipt, execution, approval and delivery. Unknown users cannot spend the desktop owner's subscription by default. Display names are not authorization identifiers.
4. **Scoped memory.** Owner DMs can use explicitly enabled personal memory. Shared channels receive only approved channel/team context. Never promote a DM fact to workspace memory automatically. Shared memory should require an explicit operation, provenance and a revocation path.
5. **Durable receipt and delivery.** Record inbound events before acknowledging them; deduplicate by installation and platform event/message identity. Keep an ordered outbox with stable message keys, delivery state and returned Slack message IDs. Respect Retry-After. Preserve ambiguous sends for reconciliation instead of blindly posting a second answer.
6. **Restrained behavior.** Start with mentions and bot DMs. Continue an already linked thread without demanding another mention. Ignore self-messages and automated senders by default. Let a low-value acknowledgment finish quietly. Prefer one useful responder, with bounded delegation and a hop limit.
7. **Usable progress and control.** Show a small received/working indication, update one thread message when practical, and keep detailed tool logs in Gratis. Stop and approval buttons must bind the actor, job, exact action, expiry and current connection. A different channel member cannot approve the request.
8. **Safe outputs.** Preserve user mentions only when deliberately requested and resolved to platform IDs. Escape channel-wide mentions. Split long replies without losing code fences or duplicating sent parts. Apply file size/type checks and verify a Page recipient has access; local `gratis://` links are not a substitute for a shareable web page.

The existing `ChatService`, run limits, `TeamConnection`, `TeamExecutor`, approval flow and memory filters are useful foundations. The team executor currently disables external tools. A Slack transport must not bypass that restriction by routing coworkers directly into an unrestricted personal agent. Human-owned external-action execution is a separate prerequisite for broader team automation.

## First release boundary

Start with one private, user-created Slack app, one opted-in workspace, explicit channel access, and a selected existing Gratis agent. Keep the native Slack app identity clear. A single installed Slack app does not create a separately installable Slack bot identity for every Gratis agent; separate per-agent apps are a later setup option.

[Slack Socket Mode](https://docs.slack.dev/apis/events-api/using-socket-mode/) can receive events and interactive actions without a public HTTP request URL. It is suitable for an opt-in local pilot. The desktop must remain running, and Slack currently excludes Socket Mode apps from the public Marketplace. Do not promise durable offline acceptance when no receiver is connected.

For a later one-click community install, add OAuth and an always-on authenticated receiver with a durable inbox. Provider execution can remain on the user's own connected machine. The receiver must report offline/expired requests honestly and never silently transfer a job to another person's credentials. Managed hosting is a separate operational commitment, not a requirement for the first self-hosted pilot.

## Suggested module boundaries

| Area | Responsibility |
| --- | --- |
| `src/messaging-store.mjs` | Encrypted connection records, external-thread mappings, inbound receipts and ordered outbox state; checkpoint/recovery integration. |
| `src/messaging-router.mjs` | Identity and audience checks, per-thread ordering, existing agent selection, cancellation and bounded delegation. |
| `src/slack-transport.mjs` | Socket Mode connection lifecycle, event normalization, Slack API sends, rate limits and reconnection. |
| `src/messaging-ui.mjs` | Setup, connection health, agent/channel selection and recovery actions. |
| Future hosted receiver package | Verified HTTP events, OAuth callback/state, encrypted routing, durable offline queue and revocation. |

These are proposed files, not existing implementation claims. Use a platform-neutral envelope internally so Discord or Telegram can follow without duplicating ownership and delivery logic.

## Verification before calling it ready

- An opted-in Slack user sends a DM and a mention; both reach the chosen agent and return to the correct thread with the correct identity.
- Duplicate events, a process restart after receipt, overlapping app-mention/message events and concurrent workers do not execute a request twice.
- A send timeout after Slack accepts a post does not automatically duplicate it. Partial multi-message delivery resumes only unsent parts and preserves order.
- Rate limits, expired/revoked credentials, offline desktop and queue overflow have visible bounded outcomes.
- Unlinked users, removed members, the wrong workspace and stale channel access cannot execute work or receive queued private results.
- A second user cannot press the first user's approval or stop button. Expired or replayed controls do nothing.
- Direct-message memory is absent from channel prompts, replies, files and Page links. Bot-to-bot messages cannot create an unbounded loop.
- Disconnect stops ingestion, cancels/reconciles queued work, removes credentials and remains disconnected after restart.
- Test with synthetic events and a fake Slack server first, then a disposable Slack workspace and opted-in human accounts. Do not treat mocked API tests as live-account verification.

## Reuse boundary

The inspected OpenMausBot and Rakazo revisions carry Apache-2.0 licenses; the clone carries MIT. OpenBot carries PolyForm Noncommercial 1.0.0. Keep this implementation original and preserve Gratis's existing license. No third-party implementation or artwork was imported during this review. In particular, do not transplant OpenBot code into the MIT distribution.

Useful additional follow-ups are event-triggered routines and quiet scheduled check-ins. Both should share the new receipt/queue machinery and remain opt-in. Slack comes first; additional channels should follow after the same privacy and failure tests pass.
