# Additional reference review

Reviewed the public [nickvasilescu/grokbot-clone repository](https://github.com/nickvasilescu/grokbot-clone/tree/7ee6a7ed8464311dbb467bb9ee7c76d9286e56be), including the runtime, schedules, memory, computer, voice and UI modules. This is a capability comparison, not a claim that either project has undergone a security audit. No artwork or implementation from that repository was imported.

| Area | Gratis assessment | Action |
|---|---|---|
| Per-bot instructions, model and avatar | Already present | Keep current Claude/Codex subscription workflow and existing agents. |
| Bot groups, mentions and delegation | Already present | Retain primary-bot judgment and isolated teammate sessions. |
| Persistent memory | Already present with profile/bot/thread scopes and provenance | Do not replace it with a second memory database. |
| Recurring routines | Daily, weekly and interval schedules existed | Added five-field cron for monthly and other custom schedules, with validation and timezone tests. |
| File library | Bot-scoped files and nested paths existed | Added path/name filtering and recent/name/size sorting. |
| Computer takeover | Already present, including automatic continuation from user changes | Keep the existing browser runtime and resume checkpoints. |
| Idle computer behavior | Cloud backend already sets a five-minute idle sleep policy | Avoid a second desktop timer that might interrupt active work. |
| Tool approvals and connected apps | Already present | Keep explicit scoped authorization; do not copy an unrestricted shell policy. |
| Long-running external tasks | T3 handoff and recovery already present | Keep durable task IDs and existing ownership checks. |
| Proactive check-ins with a silent outcome | Scheduled checks can already be configured; a dedicated quiet/no-message check-in mode is not yet present | Separate community follow-up; requires lifecycle and notification tests, not a background prompt enabled by default. |
| Event-triggered routines | Not yet present | Separate community integration: authenticated event delivery, deduplication, scoped credentials and opt-in activation are required. |
| History compaction | Provider sessions and durable memory exist; Gratis does not implement the reference project's xAI-specific compaction endpoint | Do not import a provider-specific encrypted-history format into Claude/Codex sessions. Evaluate bounded replay and resume behavior separately. |
| Full voice calls | Dictation exists; a real-time spoken conversation with TTS is distinct | Not a drop-in change: the reference uses paid xAI realtime services. Keep this out of the subscription-only baseline. |
| General Linux GUI desktop | Browser/computer and command tools exist; the reference uses a different Orgo VM/VNC stack | An optional backend would need its own account, deployment and tests. Do not replace the working Cloudflare browser connection. |
| Native X search | No dedicated xAI search API integration | Existing research tools remain available. A paid provider integration is not silently configured. |
| Human team accounts | Current app is one person with multiple agents | Continue the separately scoped team plan; bot groups are not proof of human account isolation. |
| Skills/task recording | Bot instructions, files and T3 are available; complete recording/replay is not implemented | The reference also lists file-based skills/task recording as planned. Do not treat a roadmap entry as a feature to copy. |

The shared desktop improvements in this pass are also implemented in public core. Phone and human-team features remain community-only. Larger integration ideas above are recorded explicitly rather than being advertised as shipped.

Validation includes malformed cron rejection, timezone and DST cases, persistence, missed-run coalescing, file filtering/sorting, and UI checks that switching bots does not reveal another bot's files.
