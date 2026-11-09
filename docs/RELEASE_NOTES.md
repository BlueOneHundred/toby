Gratis 0.18.4 repairs macOS bundle signing and adds checks against the actual downloaded installer contents.

- Mac apps receive a complete ad-hoc signature, including nested binaries and sealed resources. This fixes the incomplete Electron signature found in 0.18.3. It is not Developer ID signing or Apple notarization; macOS may still require approval for an unidentified developer.
- Both the DMG builder and local Mac packaging command sign and verify the final app. Release checks mount the DMG and test the app inside it. Modified signed resources fail verification.
- Local packaging excludes existing build output directories.
- Settings now show the app name, version, operating system and architecture, making wrong-edition or outdated-build reports easier to diagnose.
- Changing Reduce Motion now immediately uses the static avatar, even when an animation frame is pending. Packaged tests verify that community avatars animate, respond to the cursor and honor reduced motion. The reported avatar mismatch has not been reproduced with a confirmed affected artifact.

Includes 0.18.3's single custom-answer editor, rapid-send protection, immediate Stop handling, preserved drafts on errors, stable streamed Markdown, and computer previews that close when returning Home. These behaviors are exercised in the packaged app, using isolated synthetic profiles.

Downloads are community previews for Apple silicon Mac, Intel Mac, Windows x64 and Ubuntu x64. Windows builds are unsigned. Existing Gratis workspace data is preserved. No accounts, credentials, chats or private relay configuration are supplied. See [Downloads](DOWNLOADS.md) for platform limits and installation checks.
