#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_NAME="$(cd "$ROOT_DIR" && node -e "const p=require('./package.json');process.stdout.write(p.name)")"
PACKAGE_VERSION="$(cd "$ROOT_DIR" && node -e "const p=require('./package.json');process.stdout.write(p.version)")"
PACKAGE_TARBALL_BASE="${PACKAGE_NAME#@}"
PACKAGE_TARBALL_BASE="${PACKAGE_TARBALL_BASE/\//-}"
DEFAULT_TARBALL_PATH="$ROOT_DIR/${PACKAGE_TARBALL_BASE}-${PACKAGE_VERSION}.tgz"
TARBALL_PATH="${1:-$DEFAULT_TARBALL_PATH}"
HOST_DIR="$(mktemp -d /tmp/adonis-admin-smoke-XXXXXX)"

if command -v rg >/dev/null 2>&1; then
  filter_q() {
    rg -q "$1"
  }
  filter_print() {
    rg "$1"
  }
else
  filter_q() {
    grep -E -q "$1"
  }
  filter_print() {
    grep -E "$1"
  }
fi

echo "==> Root: $ROOT_DIR"
echo "==> Host: $HOST_DIR"

if [[ $# -eq 0 ]]; then
  echo "==> Building local tarball"
  rm -f "$DEFAULT_TARBALL_PATH"
  (cd "$ROOT_DIR" && npm pack --cache ./tmp/.npm-cache >/dev/null)
elif [[ ! -f "$TARBALL_PATH" ]]; then
  echo "==> Tarball missing, building..."
  (cd "$ROOT_DIR" && npm pack --cache ./tmp/.npm-cache >/dev/null)
fi

if [[ ! -f "$TARBALL_PATH" ]]; then
  echo "Tarball not found: $TARBALL_PATH" >&2
  exit 1
fi

echo "==> Preparing host app"
rsync -a \
  --exclude '.git' \
  --exclude '/build' \
  --exclude '/tmp' \
  --exclude '/adonis-admin-engine-*.tgz' \
  "$ROOT_DIR/" "$HOST_DIR/"

cd "$HOST_DIR"

npm pkg set name=adonis-admin-smoke private=true >/dev/null
npm pkg delete exports files scripts.prepack scripts.build >/dev/null
npm pkg delete imports."#filament/*" imports."#admin/*" >/dev/null

rm -rf app/Filament app/Admin package-src stubs
rm -f providers/filament_provider.ts
rm -f commands/MakeFilamentPanel.ts commands/MakeFilamentResource.ts commands/MakeFilamentPlugin.ts commands/PublishFilamentPlugins.ts

perl -0777 -i -pe "s/\nimport filament from .*?\n//s; s/\nfilament\.routes\(router\)\n/\n/s" start/routes.ts
perl -0777 -i -pe "s/, \(\) => import\('adonis-admin-engine\/commands'\)//g" adonisrc.ts
perl -0777 -i -pe "s/\n\s+\(\) => import\('#providers\/filament_provider'\)\n//s" adonisrc.ts

echo "==> Pre-install check (no filament commands)"
if node ace list | filter_q "make:filament|filament:plugin:publish"; then
  echo "Filament commands are already present before installation" >&2
  exit 1
fi

echo "==> Installing local package"
mkdir -p node_modules/adonis-admin-engine
tar -xzf "$TARBALL_PATH" -C node_modules/adonis-admin-engine --strip-components=1
npm pkg set dependencies.adonis-admin-engine="$PACKAGE_VERSION" >/dev/null

echo "==> Configuring package"
node ace configure adonis-admin-engine

echo "==> Post-install check (commands available)"
node ace list | filter_print "make:filament-panel|make:filament-resource|make:filament-plugin|filament:plugin:publish"

echo "==> Running real package commands"
node ace make:filament-panel BackofficePanel >/dev/null
test -f app/Admin/Panels/BackofficePanel.ts
node ace make:filament-plugin Audit --resource --no-register >/dev/null
test -f app/Plugins/Audit/AuditPlugin.ts
test -f app/Plugins/Audit/Resources/AuditResource.ts
test -f app/Plugins/Audit/plugin.manifest.json
node ace make:filament-plugin Billing --package --resource --npm-name adonis-admin-plugin-billing >/dev/null
test -f plugins/adonis-admin-plugin-billing/package.json
test -f plugins/adonis-admin-plugin-billing/src/index.ts
test -f plugins/adonis-admin-plugin-billing/src/resources/BillingResource.ts
test -f plugins/adonis-admin-plugin-billing/.github/workflows/publish.yml
node ace filament:plugin:publish --dry-run >/dev/null

echo "Smoke test OK"
echo "Host app: $HOST_DIR"
