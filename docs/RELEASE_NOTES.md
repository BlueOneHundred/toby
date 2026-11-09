# Gratis 0.23.0 community preview

- Added optional Slack Socket Mode messaging with a manifest-based setup, encrypted credentials and single-use account linking.
- Routes owner DMs and allowed-channel mentions to separate conversations under an existing agent, without changing desktop selection.
- Channel requests exclude private memory and tools. Owner DM memory and tools require separate opt-ins.
- Saves receipts before acknowledging events; maintains ordered delivery, rate-limit handling and uncertain-delivery review.
- Added request-owner Stop and scoped, expiring approval buttons. Sensitive action details remain in Gratis.
- Retains the mobile Pages and profile-photo fixes from the previous source build.

This is a one-owner, one-workspace pilot. The desktop must stay online. Hosted OAuth, multi-user Slack execution, inbound files and public Page links are not included. See [Slack setup and verification](SLACK.md). Synthetic transport and packaged UI checks are separate from a live Slack workspace test.

Mac builds remain ad-hoc signed, not Apple-notarized. Windows builds remain unsigned.
