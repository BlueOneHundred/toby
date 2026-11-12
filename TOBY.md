# Toby

Toby is Tavin's personal team of bots, built on the open-source Gratis community edition (MIT licence; see LICENSE, which must stay in place).

## What's different from Gratis
- App name, data folder and app ID: `edition.json` (Toby, `%APPDATA%\Toby`, com.blueonehundred.toby)
- Installer name, shortcut and Windows icon: `electron-builder.cjs`, `assets/toby-icon.png`
- User-facing wording: "Gratis" replaced with "Toby" in `src/` (one-for-one, no logic changes)
- Windows build: `.github/workflows/toby-windows.yml` (Actions tab, "Build Toby for Windows", Run workflow)

## Pulling in Gratis updates
```
git remote add upstream https://github.com/earlyaidopters/gratis-community.git   # once
git fetch upstream
git merge upstream/main
# re-run: grep -rn "\bGratis\b" src   and replace any new user-facing "Gratis" with "Toby"
```
Then run the Windows build again. Keep the previous installer for rollback.
