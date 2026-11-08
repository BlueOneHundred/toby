# One Gratis identity

Desktop and phone read the same agent records. A phone does not create a second profile, and changing an agent's name, avatar, or pin updates the desktop record. Deleting it removes the same agent and conversations. Group portraits show the same first two members; the complete roster remains available in the group.

## Shared visuals and preferences

`src/gratis-theme.css` supplies both interfaces with the same neutral surfaces, blue accent, foreground colors, and light/dark palette. Layout density adapts to the screen. The saved appearance setting is shared; Match system follows each device's system preference. Older desktop-only appearance settings continue to work until a shared preference is saved.

The avatar artwork, animation rig, shape choices, color choices, and appearance resolver are shared. Existing desktop agents now have an explicit shape-and-color editor as well as image upload. The phone uses the same choices. Pinned agents use the shared large portrait tile.

## Stable identity

Older agents receive fallback identity metadata without changing their rendered shape, color, photos, names, or conversations. Renaming an agent or removing another agent cannot change its fallback face. Phone thumbnails cover the bounded recent-agent set instead of falling back to a generated character after the first 32 photos.

## Interaction consistency

Both interfaces use the same pin and deletion lifecycle. Phone deletion asks for explicit confirmation. The phone editor tracks its own save attempt, so an old successful receipt cannot close a newly opened editor. Changing appearance or model settings preserves agent identity and chat history.

## Verification

Unit and browser tests cover the migration, renames, deletion, shared appearance, pins, group identity, editing twice, and attachment delivery. The release is also checked on the installed iPhone Home Screen app and the existing desktop workspace using only disposable test agents. No private chat fixtures or reference screenshots are committed.

### On-device release check, 8 November 2026

Gratis 0.15.0 was checked in the installed desktop app and the paired iPhone Home Screen app through iPhone Mirroring. The disposable reference agent was pinned and opened from its large portrait tile. Changing its cloud avatar from blue to green on desktop appeared on the phone; changing it back to blue on the phone was confirmed in the desktop picker. Reopening the mobile editor after saving remained open. The original blue avatar and unpinned state were restored. The phone model sheet showed both existing subscriptions connected.

Shared light/dark preferences, deletion, and chat delivery were verified in isolated automated profiles. This check establishes shared identity and the tested layouts, not exhaustive pixel equality with another product or every native feature.
