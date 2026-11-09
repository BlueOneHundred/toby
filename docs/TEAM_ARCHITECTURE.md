# Team architecture decision

The team service is an optional separate process. It stores identities, grants, explicitly shared bot configuration/notes, private per-person team conversations, job leases, approvals and audit metadata. Personal provider executors stay on each person's device. The desktop never sends provider credentials or existing private memory to the service.

The public [ClaudeClaw source reviewed at this commit](https://github.com/earlyaidopters/claudeclaw/tree/545a6d12c43f29b5509eee1bc7d18db69087fa56) is a personal-agent runtime. Its dashboard uses one configured token, and its history route selects a caller-supplied chat ID. That source does not establish the per-person membership and grant boundary needed here. No conclusion is made about an uninspected commercial edition. No source or runtime from it was imported.

The narrow service therefore enforces authorization before each operation. Request bodies cannot select their acting principal. All mutations are serialized in SQLite transactions. A guessed resource ID cannot grant access. Revocation is checked on job claim and result commit; each result belongs to the initiating person. Retries reuse a request ID; an expired lease is reviewed instead of silently replayed. Approved actions bind actor, target approver, exact serialized parameters, expiry and one-use state.

The operator is trusted with the service's plaintext storage. This is not an encrypted relay and does not make the phone relay blind. Local bot histories remain on the local filesystem, protected by that person's OS account. Do not treat switching names in one shared OS login as isolation.

The next deployment gate is an identified operator, private HTTPS connectivity, backup/restore testing for the service, account recovery, and a reviewed two-device pilot. Browser clients, public guests, external actions and payment flows require separate integration and review. The baseline personal-app schema remains version 1; no automatic team ownership migration has occurred.
