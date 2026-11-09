# Team workspace architecture

The team service is a separate process with a versioned SQLite state store. One database is one workspace. Spaces form a parent tree, and each identity has a private personal space. Every bot, chat, job, explicit note and approval has one space ID. Files and connections have reserved ownership collections but are not yet enabled as shared resources.

Effective roles inherit down the space tree. Personal spaces are an explicit boundary, including against workspace owners. Callers authenticate with opaque sessions; request bodies cannot select the acting identity. Bots in shared spaces remain after their creator departs. The server rechecks role, bot revision, note revision and provider policy before accepting sensitive job operations.

Messages, partial answers, membership changes and execution transitions append ordered SQL events in the same transaction as state changes. The native client subscribes over SSE, resumes by cursor and refreshes its authorized projection. Events are filtered by authorized spaces and rooms before response serialization. Each room serializes AI requests; ordinary human messages do not require AI execution.

Each sender's local executor claims only that person's job. It creates a separate local bot with external capabilities and personal-memory recall disabled. The selected provider settings are frozen for the run. Explicit space notes and preceding conversation messages are untrusted context. Later queued prompts are excluded from an earlier request's history. Credential material never leaves the device. Job leases and stable request IDs make retries conservative; ambiguous interrupted execution requires review.

The phone is a paired view of its desktop identity. A random key delivered in a QR URL fragment derives separate AES-GCM keys for pairing proof, commands, snapshots and receipts. The phone relay receives ciphertext and routing metadata. The team server remains a trusted plaintext endpoint, distinct from that relay. See [the phone threat model](MOBILE.md#private-transport-and-trust-boundary).

Version-1 team data migrates only inside the team database, after a private SQLite backup. Prior per-person conversations remain private. No personal desktop data is reclassified or imported. The existing local workspace schema is unchanged.

Remaining architectural work includes an always-on runner pool, space-owned connectors/files, integrated external-action approvals, transport adapters, shared searchable memory beyond explicit notes, whole-space lifecycle operations, managed identity, and public-service hardening. These are not represented as completed features.
