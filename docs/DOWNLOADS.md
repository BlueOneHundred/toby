# Install Gratis

Downloads live in the private [community repository releases](https://github.com/promptadvisers/gratis-community/releases). No website or separate app edition is required. Sign in to GitHub with an account that has repository access.

| Computer | Download | Install |
| --- | --- | --- |
| Mac with Apple silicon | `Gratis-VERSION-mac-arm64.dmg` | Open and drag Gratis to Applications |
| Mac with Intel processor | `Gratis-VERSION-mac-x64.dmg` | Open and drag Gratis to Applications |
| Windows 10/11 x64 | `Gratis-VERSION-win-x64.exe` | Run the per-user installer |
| Ubuntu 24.04 x64 | `Gratis-VERSION-linux-x64.deb` | `sudo apt install ./Gratis-VERSION-linux-x64.deb` |
| Linux x64 portable | `Gratis-VERSION-linux-x64.AppImage` | Make executable, then launch; FUSE 2 may be needed |

No Windows ARM64 or Linux ARM64 installer is currently built.

## Community preview signing

These builds are unsigned and are not notarized. macOS Gatekeeper or Windows SmartScreen can require explicit approval. They are not App Store builds. Only install files from the repository release you trust. Do not disable operating-system protections globally. Signing certificates and Apple notarization credentials must be configured before presenting these as a frictionless public distribution.

Every release includes `SHA256SUMS.txt`. On macOS use `shasum -a 256 FILE`; on Linux use `sha256sum FILE`; on Windows use `Get-FileHash FILE -Algorithm SHA256`. Compare the result with the matching release entry. A checksum verifies download integrity; it is not a code signature.

Updating the existing application preserves its data. Windows uninstall also retains user data. The default packaged data locations are:

- macOS: `~/Library/Application Support/Gratis/data`
- Windows: `%APPDATA%\Gratis\data`
- Linux: `$XDG_CONFIG_HOME/Gratis/data`, or `~/.config/Gratis/data`

## Accounts and optional features

Install the official native [Claude Code client](https://code.claude.com/docs/en/setup) or [Codex CLI](https://github.com/openai/codex), and sign in on that same operating system. Choose the provider in Gratis Settings and check its connection. Account eligibility, provider terms and plan limits apply. On Windows, a client installed only inside WSL is not a native Windows login. Prefer the native Claude installer and native Codex executable. Restart Gratis after changing PATH.

| Feature | macOS | Windows x64 | Ubuntu x64 |
| --- | --- | --- | --- |
| Chats, agents, groups, schedules | Included | Included | Included |
| Claude / Codex subscription runtime | Native installed client | Native installed client | Native installed client |
| Phone pairing and shared cloud computer | Same optional relay and cloud setup | Same optional setup | Same optional setup |
| Semantic memory | Bundled encoder; OS keychain | Bundled encoder; Windows protection | Bundled encoder; unlocked Secret Service keyring |
| Composio | Bundled browser sign-in or project API key | Project API key in Advanced settings | Project API key in Advanced settings |
| T3 automatic local installation | Supported | Connect an existing T3 MCP server instead | Supported with service-manager prerequisites |
| Dictation | Optional FFmpeg/Whisper | Optional native FFmpeg/Whisper in PATH | Optional FFmpeg/Whisper in PATH |
| PDF text extraction | Optional `pdftotext` | Optional native `pdftotext.exe` in PATH | Optional `poppler-utils` |

The Ubuntu desktop needs an active graphical session and an unlocked Secret Service implementation, typically GNOME Keyring. Gratis refuses to store credentials or a memory vault key using Electron's plaintext `basic_text` fallback. In a minimal desktop, install and configure a keyring first. Linux portable AppImage may need `libfuse2t64`; source development commonly needs `libgtk-3-0t64`, `libnss3`, `libasound2t64`, `libgbm1` and `libsecret-1-0`.

Phone requests run on the paired desktop, so it must remain awake with Gratis running. No accounts, keys, chat histories or private relay configuration are included in a download. The automated release check verifies installation artifacts and application startup with a fresh isolated profile. It does not sign into real provider accounts in CI.

## Build from source

```sh
npm ci
npm run setup:assets
npm start
```

`setup:assets` downloads checksum-verified model files and the Mac Composio client where supported. It never signs in. Native installers are produced on their target OS:

```sh
npm run dist:mac -- --arm64
npm run dist:mac -- --x64
npm run dist:win
npm run dist:linux
```

Use an Apple silicon Mac for arm64, an Intel Mac for x64, Windows for the Windows installer and Ubuntu for Linux. The GitHub **Build desktop downloads** workflow does this on all four runners. Each job validates the native runtime adapter, builds installers and launches the packaged app using synthetic data. Tagged builds publish a private prerelease only after every platform passes. Manual workflow runs retain downloadable artifacts; selecting Publish also creates a private prerelease after all builds pass.
