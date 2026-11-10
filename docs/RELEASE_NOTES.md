# Gratis 0.23.2 community preview

- Fixed Cancel and Close buttons inheriting the small header-icon dimensions. Footer text now has proper padding, while the header × stays compact.
- Moved encrypted storage to one shared asynchronous unlock path. Requests are serialized, and a failed or denied unlock stops further attempts until you explicitly retry.
- Preserved existing chats, settings, credentials and memory. Compatibility tests cover old encrypted files and rollback readability.
- Added optional Slack messaging with encrypted credentials, single-use owner linking, scoped channel access, durable delivery, Stop and approval controls.
- Includes the existing phone, team and Pages features. These remain community-only.

Mac downloads cover Apple Silicon and Intel. Windows downloads target x64. Ubuntu downloads include a .deb and AppImage for x64.

This is an experimental preview. Mac builds are ad-hoc signed, not Apple-notarized; Windows builds are unsigned. An OS security warning or initial Keychain approval can still occur. The fixes do not bypass operating-system security or promise that future updates never prompt.

Slack is a one-owner, one-workspace pilot. Gratis must stay online. Hosted OAuth, multi-user Slack execution, inbound files and public Page links are not included. See [Slack setup](SLACK.md).
