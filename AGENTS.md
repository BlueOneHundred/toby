# Gratis Community development

- This private repository is the default target for all ongoing feature work in this workspace.
- `origin` must point to `promptadvisers/gratis-community`. `upstream` is the public `promptadvisers/gratis` repository and is for fetching reviewed shared changes.
- Never push this branch or its community-only content to the public repository. Port a deliberately selected, sanitized fix from a separate public checkout when requested.
- Preserve the separate app identity, data folder, starter roles and community documentation.
- Never copy the personal installation's data, credentials, chats, memory, screenshots or service endpoints into this repository.
- Use synthetic test profiles and screenshots. Keep provider calls mocked in unit tests.
- Run `npm run check` and relevant desktop checks. Source is in `src/`; generated `release/`, downloaded assets and runtime `data/` are not source.
- Do not modify the personal app in `/Applications/Gratis.app` as part of community work unless explicitly requested.
