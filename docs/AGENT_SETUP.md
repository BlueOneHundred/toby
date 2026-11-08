# Set up Gratis with a local coding assistant

This guide is for Claude Code, Codex or another local assistant with terminal access. It is also usable by a person. Read the repository README and applicable AGENTS.md first. Use this repository as source, not an unrelated app with a similar name.

## Establish the installation route

1. Ask whether the person wants to use Gratis or develop its source.
2. Inspect OS and CPU architecture with read-only tools. Check for an existing Gratis installation before replacing anything.
3. For app use, prefer the matching installer from this repository's GitHub Releases. For development, use a fresh source directory.
4. Explain that releases are currently unsigned previews. Never remove quarantine flags, disable Gatekeeper/SmartScreen/antivirus, or tell the user that a checksum is a trusted-publisher signature. Let the person decide whether to install.
5. Preserve the existing app name, bundle ID and data directory. Do not create a second Community app. Do not read unrelated private chats to test installation.

## Installer route

Read [Downloads](DOWNLOADS.md) for filenames, platform limits and checksum verification. Get files from this repository's release page. Check the downloaded file against `SHA256SUMS.txt` before installation. A matching checksum checks bytes, not whether software is safe.

Mac: open the matching DMG and drag Gratis to Applications. Windows: run the x64 installer. Ubuntu: use apt with the local `.deb` filename. Handle system confirmation through the person. Never silently replace their existing binary or data.

An installed app does not need npm, but live replies require a native provider client and login. Finish with the provider and acceptance steps below.

## Source route

Check these commands before installing prerequisites:

```sh
node --version
npm --version
git --version
```

Use Node.js 22+ and npm. Install missing tools from their official distributions. Package installations and OS-level changes should be explained before execution. Do not run commands requiring administrator access without the person's authorization.

```sh
git clone https://github.com/earlyaidopters/gratis-community.git
cd gratis-community
npm ci
npm run setup:assets
npm start
```

If the checkout already exists, inspect its remote, branch and uncommitted work; do not reset it or overwrite modifications. Read `scripts/setup-assets.mjs`: it downloads fixed/checksummed public assets into the checkout. Never copy account tokens from another project to make setup work.

For a clean verification without touching an existing source workspace:

macOS/Linux:

```sh
GRATIS_DATA_DIR="$PWD/.cache/setup-check" npm start
```

PowerShell:

```powershell
$env:GRATIS_DATA_DIR = Join-Path (Get-Location) '.cache/setup-check'
npm start
Remove-Item Env:GRATIS_DATA_DIR
```

This is an isolated test profile. The normal source run uses `data/` in this checkout. The packaged app uses the OS Gratis directory. Do not copy a mock test profile over the person's real workspace.

Ubuntu needs a graphical session, Electron system libraries and an unlocked Secret Service keyring. Prefer the packaged `.deb` when the person just wants to use the app, because apt resolves its declared dependencies. See [Downloads](DOWNLOADS.md) for the supported packages. Do not bypass Electron's sandbox to make a test appear successful.

## Native provider setup

Let the person choose Claude or Codex. Read the provider's current official setup page before installing its client:

- Claude Code: https://code.claude.com/docs/en/setup
- Codex: https://github.com/openai/codex

Do not assume a browser subscription is a native CLI login. Check whether the native executable exists. On Windows, a `.cmd` wrapper or WSL-only binary is not interchangeable with the native executable expected by the app. Gratis resolves native clients and common installation locations; use its Settings connection check as the final check.

Let the person perform sign-in through the official client. Never request raw tokens, read auth files, copy browser cookies, or print environment secrets. Do not switch a subscription to API billing silently. Choose the provider in Gratis Settings and a model it actually offers.

Send one short, harmless prompt and wait for a final response. Record whether the answer came from the real provider or the demo path. Network failure, usage limits and unavailable models are setup findings, not reasons to fabricate a successful test.

## Optional capabilities are separate

Do not create paid infrastructure automatically. Ask before provisioning a relay or cloud computer.

- Phone: follow [Mobile](MOBILE.md). An operator must deploy/configure the HTTPS relay and give the desktop its own enrollment secret. Trust the phone, then verify text travels both ways. The desktop must remain awake and running.
- Computer: follow [Cloud](CLOUD.md). Verify backend health, enrollment and a scoped desktop token. Test one public page, Take control and Give control back. Do not use another person's existing credentials.
- Composio: connect through **+ → Connected apps**. The person authorizes each external account. Windows/Linux use the documented Advanced API-key path.
- Voice: local FFmpeg/Whisper is required; optional Haiku cleanup is text processing, not direct audio transcription. See [Quickstart](QUICKSTART.md#optional-voice-input).
- T3: follow [T3](../T3.md) and use the person's authorized environment. Do not claim background work continues if its execution host is unavailable.

## Acceptance checklist

Report each item as **passed**, **not requested**, **not tested** or **blocked**. Never conflate them.

- Correct Gratis app/edition and CPU architecture.
- App opens using the documented launch method.
- Real provider connection verified, or demo mode clearly labeled.
- One created assistant keeps its name and avatar after restart.
- A harmless conversation and final reply remain after restart.
- Existing personal workspace was preserved; tests used a disposable chat/profile.
- If requested: phone and desktop show the same agent and both directions of message sync work.
- If requested: cloud browser starts, human takeover works and giving control back resumes rather than repeats completed work.
- Optional features left unconfigured are listed explicitly.

For source changes, run `npm run check` and the relevant desktop/mobile check in a synthetic profile. For installation alone, do not run a production-account automation just to manufacture a test result.

## Handoff to the person

Give the app version, download/source path, launch command or application location, normal data directory, selected provider/model, live-response result, optional services configured, and concrete remaining blockers. Explain how to quit the app and that schedules/phone requests need the desktop awake.

Preserve troubleshooting logs privately and redact them before sharing. Do not commit data, credential files, personal screenshots or local provisioning secrets. Never claim this guide makes the app signed, fully offline, unlimited, or independent of provider terms.
