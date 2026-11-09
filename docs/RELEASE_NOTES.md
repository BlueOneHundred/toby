# Gratis 0.20.1 community preview

This release adds reliability limits, recovery checkpoints and an optional private team pilot.

- Configure local response duration, tool-call and failure limits. Pauses preserve partial work and leave queued messages paused; Retry continues from saved progress.
- Bound per-bot file storage and rotate metadata-only diagnostic logs. Open the Files folder to manage saved files.
- Cap automatic T3 reconnection and monitoring separately from remote execution. Resume monitoring keeps the same task identity.
- Verify local recovery checkpoints, reject unknown data versions, and recover from interrupted or corrupted workspace restores. Encrypted credentials stay encrypted. See [recovery instructions](https://github.com/earlyaidopters/gratis-community/blob/v0.20.1/docs/RELIABILITY.md).
- Export/import reviewed bot templates without chats, memory, files or credentials. Imported tools and personal recall start disabled.
- Active team jobs recheck grants and cancellation while running, so a revoked or cancelled job stops local work.
- The opt-in [team pilot](https://github.com/earlyaidopters/gratis-community/blob/v0.20.1/docs/TEAM_PILOT.md) supports per-person sessions, private bots with explicit grants, private per-person team chats, local subscription execution, explicit shared notes, revocation, approval records, and redacted audit metadata. It is not intended for public Internet hosting.

Phone integration, public business bots, external team-tool execution and payments are not added by the team pilot. Existing personal data is not migrated into a team database. Phone and team code remain community-only; selected reliability and recovery changes are also in public core.

Tests use isolated synthetic profiles and mock provider streams. macOS builds have ad-hoc integrity signatures and are not notarized; Windows builds remain unsigned. The installed app and private data are not replaced by publishing this preview.
