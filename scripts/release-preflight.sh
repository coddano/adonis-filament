#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PACKAGE_NAME="$(node -e "const p=require('./package.json');process.stdout.write(p.name)")"
PACKAGE_VERSION="$(node -e "const p=require('./package.json');process.stdout.write(p.version)")"
PACK_INFO_FILE="$(mktemp /tmp/adonis-admin-pack-info-XXXXXX.json)"

cleanup() {
  rm -f "$PACK_INFO_FILE"
}
trap cleanup EXIT

echo "==> Release preflight"
echo "==> Package: $PACKAGE_NAME@$PACKAGE_VERSION"

# CI-safe defaults for Adonis env validation during tests.
export NODE_ENV="${NODE_ENV:-test}"
export TZ="${TZ:-UTC}"
export PORT="${PORT:-3333}"
export HOST="${HOST:-127.0.0.1}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export SESSION_DRIVER="${SESSION_DRIVER:-cookie}"
export APP_KEY="${APP_KEY:-release_preflight_app_key_32_chars_minimum_ok}"

echo "==> Typecheck"
npm run -s typecheck

echo "==> Lint"
npm run -s lint

echo "==> Unit tests"
npm run -s test:unit

echo "==> Build"
npm run -s build

echo "==> Pack"
npm pack --json --ignore-scripts --cache ./tmp/.npm-cache > "$PACK_INFO_FILE"
TARBALL_FILE="$(node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(data[0].filename)" "$PACK_INFO_FILE")"
TARBALL_PATH="$ROOT_DIR/$TARBALL_FILE"

if [[ ! -f "$TARBALL_PATH" ]]; then
  echo "Tarball not generated: $TARBALL_PATH" >&2
  exit 1
fi

echo "==> Tarball: $TARBALL_FILE"
echo "==> SHA256"
shasum -a 256 "$TARBALL_PATH"

echo "==> Smoke install"
"$ROOT_DIR/scripts/smoke-install-local.sh" "$TARBALL_PATH"

echo "==> Preflight OK"
echo "==> Ready for: npm publish --tag rc"
