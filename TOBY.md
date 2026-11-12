# Toby

Toby is Tavin's personal team of bots, built on the open-source Gratis community edition (MIT licence; see LICENSE, which must stay in place).

## What's different from Gratis
- App name, data folder and app ID: `edition.json` (Toby, `%APPDATA%\Toby`, com.blueonehundred.toby)
- Installer name, shortcut and Windows icon: `electron-builder.cjs`, `assets/toby-icon.png` (signAndEditExecutable is on so the .exe carries the Toby name and icon; there is no code-signing certificate, so nothing is signed)
- User-facing wording: "Gratis" replaced with "Toby" in `src/` (one-for-one, no logic changes)
- Windows build: `.github/workflows/toby-windows.yml` (Actions tab, "Build Toby for Windows", Run workflow)
- **Fixed bot order** (Toby-only): `src/sidebar-items.mjs` (`TEAM_ORDER`) keeps bots in team order instead of by recent activity; group chats come after the bots. Pinned bots get a "Team lead" label when Toby is the only one pinned (`src/renderer.mjs`, `src/bot-tile.css`). Add new team bots to `TEAM_ORDER`.
- **Shared team folder** (Toby-only feature): `src/team-folder.mjs`, wired in `src/main.cjs` and `src/agent-tools.mjs`. Every bot with Files on gets `list_team_files`, `read_team_file`, `write_team_file`, `append_team_file`, `copy_to_team` and `copy_from_team`, all limited to one folder: `Desktop\Toby\Income` (or `TOBY_TEAM_FOLDER`; `<data>\team-folder` when a test data folder is set). Same safety rules as private Files (no `..`, hidden paths or symlinks; one write at a time), 500 MB / 5,000 files. Tests: `test/team-folder.test.mjs`. When merging Gratis updates, keep the `teamFolder` lines in those three files.

## Pulling in Gratis updates
```
git remote add upstream https://github.com/earlyaidopters/gratis-community.git   # once
git fetch upstream
git merge upstream/main
# re-run: grep -rn "\bGratis\b" src   and replace any new user-facing "Gratis" with "Toby"
```
Then run the Windows build again. Keep the previous installer for rollback.
