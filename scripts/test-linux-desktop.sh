#!/usr/bin/env bash
set -euo pipefail
# Run inside a fresh dbus-run-session. Never use a developer's login keyring.
if [[ "$(uname -s)" != Linux ]]; then echo 'Linux test runner only.' >&2; exit 1; fi
test_keyring_root="$(mktemp -d)"
trap 'rm -rf "$test_keyring_root"' EXIT
export XDG_DATA_HOME="$test_keyring_root/data"
export XDG_CONFIG_HOME="$test_keyring_root/config"
export GNOME_KEYRING_CONTROL="$test_keyring_root/control"
mkdir -p "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" "$GNOME_KEYRING_CONTROL"
printf '%s' 'temporary-ci-keyring' | gnome-keyring-daemon --daemonize --unlock --components=secrets --control-directory="$GNOME_KEYRING_CONTROL"
printf '%s' 'fixture' | timeout 20s secret-tool store --label='Gratis CI check' purpose gratis-ci
[[ "$(timeout 20s secret-tool lookup purpose gratis-ci)" == fixture ]]
node test/release-smoke.mjs
