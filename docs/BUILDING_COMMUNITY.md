# Building community features

This repository is the default development target for community work. The app is called Gratis. This public repository is the destination for community changes; it updates the same installed app and existing workspace. The public core checkout remains separate.

## Where changes belong

- Shared application code lives in `src/`.
- The Gratis app name, bundle ID and data folder live in `edition.json`. Keep them compatible with the existing installation.
- Shared visual tokens live in `src/edition.css`. Desktop and mobile belong to the same product.
- Member exercises, recipes and screenshots live in `docs/` and `examples/`.
- Unit and synthetic desktop tests live in `test/`.

Do not modify generated app bundles as source. Never commit secrets, personal account fixtures, private member content or production workspace data.

## Development loop

1. Make a small change here.
2. Run `npm run check` and the relevant desktop flow.
3. Use synthetic examples to record a new screenshot when behavior changes.
4. Push to the community `origin` remote.

A pre-push hook blocks this checkout from pushing to the public core. It is installed by `npm ci` and can also be installed with `node scripts/install-hooks.mjs`.

## Receiving shared fixes

```sh
git fetch upstream
```

Review the incoming commits before merging. Preserve the Gratis app identity, existing workspace and community documentation. Resolve conflicts deliberately and rerun the tests. Fetching does not change either repository.

## Contributing a fix to the public core

Use the separate public checkout. Port only the small, reviewed change that should be public. Remove private examples, member-specific behavior, account details and incidental logs. Run its privacy check and full-history secret scan before pushing. Do not merge the community branch wholesale into the Prompt Advisers core without review.

## Before a member-facing release

Verify a new profile, an existing profile, group judgment, schedules, connection errors, keyboard access and the narrow layout. Record what is actually supported on the tested platform. A source build is not automatically a signed, notarized installer or a hosted service.
