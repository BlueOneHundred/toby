# Toby

Toby is Tavin's personal team of bots, built on the open-source Gratis community edition (MIT licence; see LICENSE, which must stay in place).

## What's different from Gratis
- App name, data folder and app ID: `edition.json` (Toby, `%APPDATA%\Toby`, com.blueonehundred.toby)
- Installer name, shortcut and Windows icon: `electron-builder.cjs`, `assets/toby-icon.png` (signAndEditExecutable is on so the .exe carries the Toby name and icon; there is no code-signing certificate, so nothing is signed)
- User-facing wording: "Gratis" replaced with "Toby" in `src/` (one-for-one, no logic changes)
- Windows build: `.github/workflows/toby-windows.yml` (Actions tab, "Build Toby for Windows", Run workflow)
- **Fixed bot order** (Toby-only): `src/sidebar-items.mjs` (`TEAM_ORDER`) keeps bots in team order instead of by recent activity; group chats come after the bots. Pinned bots get a "Team lead" label when Toby is the only one pinned (`src/renderer.mjs`, `src/bot-tile.css`). Add new team bots to `TEAM_ORDER`.
- **Custom connections** (Toby-only): Settings → Connections → Custom connections. Any MCP server (e.g. treg, Apify) with name, https address, token (stored encrypted in connections.secure, never shown) and "Ask me before each use". Given to bots with Connected apps on (`src/connections.mjs`, `src/agent-tools.mjs`, `src/claude-backend.mjs`, `src/workspace-ui.mjs`, `src/index.html`). Tests: `test/custom-connections.test.mjs`.
- **Image tool** (Toby-only): `view_image` for bots with Web on: fetches a public https image (PNG, JPEG, WebP, GIF, up to 4.5 MB, private addresses blocked) so the bot can see it; optional saveAs into Files (`src/web-tools.mjs` fetchImage, `WorkspaceFiles.writeBytes`).
- **Real local time** (Toby-only): `localTimeLine()` in `src/claude-backend.mjs` adds the computer's local date and time to each tool-enabled bot's instructions every turn, so run logs and briefs use the real time.
- **Shared team folder** (Toby-only feature): `src/team-folder.mjs`, wired in `src/main.cjs` and `src/agent-tools.mjs`. Every bot with Files on gets `list_team_files`, `read_team_file`, `write_team_file`, `append_team_file`, `copy_to_team` and `copy_from_team`, all limited to one folder: `Desktop\Toby\Income` (or `TOBY_TEAM_FOLDER`; `<data>\team-folder` when a test data folder is set). Same safety rules as private Files (no `..`, hidden paths or symlinks; one write at a time), 500 MB / 5,000 files. Tests: `test/team-folder.test.mjs`. When merging Gratis updates, keep the `teamFolder` lines in those three files.

- **Build 6, research-friendly runs** (Toby-only, 13 Nov 2026): `src/run-limits.mjs` counts tool failures **in a row** (a success resets the count) and upgrades the old Gratis defaults (10 min, 100 calls, 5 failures) to 30 min, 200 calls, 8 failures in a row. `read_webpage` and `view_image` return blocked or missing pages as a normal result (`opened:false`) instead of a tool error; the page reader identifies as a desktop browser; `search_web` asks Bing for US-English results. `MAX_MCP_OUTPUT_TOKENS=60000` in `src/claude-backend.mjs` so large paid-data results stay readable. Tests: `test/toby-build6.test.mjs`.
- **make_pdf** (Toby-only): bots with Files get `make_pdf` (team-folder HTML to team-folder PDF) using Chromium's printer in a hidden window with scripts off and network blocked (`src/pdf-maker.cjs`, wired in `src/main.cjs`). Books use CSS `@page` rules (size, margins, margin boxes for page numbers).
- **Team order** updated for the 7-step creator process: Toby, Daily Planner, Product Scout, Ebook Builder, Creator Partnerships, Outreach Writer, Partner Manager, Creative Studio, Income Coach, Maintenance, Lead Researcher.

## Pulling in Gratis updates
```
git remote add upstream https://github.com/earlyaidopters/gratis-community.git   # once
git fetch upstream
git merge upstream/main
# re-run: grep -rn "\bGratis\b" src   and replace any new user-facing "Gratis" with "Toby"
```
Then run the Windows build again. Keep the previous installer for rollback.
