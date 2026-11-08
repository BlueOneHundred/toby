# Phone visual comparison

Compared on the same iPhone through iPhone Mirroring on 8 November 2026. Only the approved reference chat and disposable Gratis test agents were opened. Reference app content was not edited.

## Corrected in this pass

- Agent names and avatar identities match the desktop records. The home list shows agents, with individual conversation history available separately.
- Group chats display their member avatars instead of borrowing the primary agent's face.
- The open chat is remembered after reloading.
- The chat header, composer, transcript clearance, text rhythm, neutral surfaces and voice button proportions follow the observed phone reference.
- Agent profiles and editing use full-screen navigation. The avatar picker uses the observed 4/4/5 shape arrangement and 6/5 color arrangement.
- The phone can create an agent, edit its name or avatar, find text in a chat, and attach small files to the same desktop bot workspace.

## Verification

A disposable blue cloud agent named Gratis UI reference appeared on both devices. Its avatar was changed to green on the physical phone, verified in the existing desktop record, and restored to blue. The installed Home Screen app retained its connection during desktop updates. Automated Chromium and WebKit tests verify creation, editing, attachments, chat delivery, model selection, dictation, reconnects and revocation.

This is a reference-aligned implementation, not a claim that every frame is identical. Conversation text and option counts differ; idle animations are not synchronized. Gratis exposes subscription model controls and does not copy the reference's avatar-generation or voice-call settings. The phone's Library and Routines views show existing items; full remote computer control and Composio management remain on desktop.

## Remaining-screen pass, Gratis 0.16

The same iPhone was used for another reference/app comparison. This pass covered the chat overflow menu, attachment menu, Find in Chat, agent profile and its overflow menu, edit/avatar navigation, Routines, Library, and both sizes of the creation sheet.

- Chat actions now use the compact menu. Provider settings and conversation history are available from the home account controls.
- Search sits at the bottom with a match counter and previous/next controls. Matches remain highlighted while navigating.
- The attachment menu overlaps the composer at the observed position.
- Profile actions moved into the overflow menu. The profile retains the shared desktop avatar and shows a notification preference.
- New agents are created in an expanding bottom sheet with inline shape/color selection, required name validation, and a bottom Create button. Cancelling does not create an agent.
- Routines and Library use centered empty states and centered navigation titles.
- The home account button uses a bounded thumbnail of the existing desktop profile photo.

Real-device checks confirmed search highlights and next-match navigation, menu placement, the creation sheet's expansion and footer, and the unchanged shared test agent. Existing agents, conversations and settings were compared to the pre-update backup and remained unchanged. Reference and personal-device captures are kept outside the repository.

The notification preference delivers completion notifications while this phone app is open; background push delivery is not claimed. Native iOS text-input accessories may appear while editing a web input. No voice-call or remote-computer features are implied by the visual changes.
