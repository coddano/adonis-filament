# Adonis Admin Engine

[![npm](https://img.shields.io/npm/v/adonis-admin-engine?label=npm)](https://www.npmjs.com/package/adonis-admin-engine)
[![npm (rc)](https://img.shields.io/npm/v/adonis-admin-engine/rc?label=rc)](https://www.npmjs.com/package/adonis-admin-engine?activeTab=versions)
[![npm downloads](https://img.shields.io/npm/dm/adonis-admin-engine)](https://www.npmjs.com/package/adonis-admin-engine)
[![CI](https://github.com/coddano/adonis-filament/actions/workflows/ci.yml/badge.svg)](https://github.com/coddano/adonis-filament/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/adonis-admin-engine)](./LICENSE)

Server-driven admin panel for **AdonisJS 6**, inspired by Laravel Filament, with:

- AdonisJS 6 + Inertia.js
- Vue 3 + Tailwind + shadcn/ui
- Resource-based CRUD (form/table/action builders)
- CLI generators (`make:filament-resource`, `make:filament-panel`)
- Multi-tenancy and permissions (RBAC)
- Soft-delete UI (`trashed`, `restore`, `force-delete`) on compatible resources

## Changelog

See `./CHANGELOG.md` for release notes.

## Requirements

- Node.js 20+
- npm 10+

## Local Installation

```bash
npm install
cp .env.example .env
node ace generate:key
node ace migration:run
npm run dev
```

## Package Installation (in another AdonisJS project)

```bash
node ace add adonis-admin-engine
```

`configure()` will:

- add provider `providers/filament_provider.ts`
- create `app/Admin/Panels/AdminPanel.ts`
- register package commands (`make:filament-resource`, `make:filament-panel`, `make:filament-plugin`, `filament:plugin:publish`)
- configure aliases `#filament/*` and `#admin/*`
- wire `filament.routes(router)` in `start/routes.ts`

## Local Install Smoke Test

To validate a real package-install flow against an isolated host app:

```bash
./scripts/smoke-install-local.sh
```

The script:

- prepares a temporary Adonis host app in `/tmp`
- checks that `make:filament-*` commands are absent before install
- installs the local tarball for the current package version
- runs `node ace configure adonis-admin-engine`
- checks commands and executes `make:filament-panel` + `make:filament-plugin` + `filament:plugin:publish --dry-run`

## Quality Checks

```bash
# TypeScript backend + frontend (vue-tsc)
npm run typecheck

# Lint
npm run lint

# Unit tests (AdminController + plugins)
npm run test:unit

# Package install smoke test
npm run smoke:install
```

## Release Candidate (npm)

Version: use `package.json > version`.

Recommended flow:

```bash
# 1) (optional) bump RC version
npm version 0.1.0-rc.2 --no-git-tag-version

# 2) full preflight (typecheck + build + pack + smoke)
npm run release:preflight

# 3) publish RC on npm
npm publish --tag rc
```

## Main Commands

```bash
# Generate an admin resource
node ace make:filament-resource User --generate

# Generate a resource with detail page (show)
node ace make:filament-resource User --generate --view

# Generate a panel
node ace make:filament-panel Admin

# Generate a plugin (with starter resource + package.json auto-registration)
node ace make:filament-plugin Audit --resource

# Generate a standalone npm plugin package
node ace make:filament-plugin Audit --package --resource

# Publish plugin assets/migrations into host project
node ace filament:plugin:publish --dry-run
```

## Soft Deletes

Soft-delete is currently enabled for:

- `users`
- `posts`
- `tags`

A resource must have:

1. `public static softDeletes = true`
2. a model field `deletedAt` mapped to `deleted_at`

## CSV Import

Enable CSV import on a resource via a `headerAction`:

```ts
import { ImportAction } from '#filament/Tables/Action'

// ...
.headerActions([
  ImportAction.make().acceptedExtensions(['csv']).maxRows(2000),
])
```

The endpoint is automatically exposed at `POST /<panel>/<resource>/import`.

## Tenancy UX (panel)

The panel now includes a tenant switcher in the topbar:

- `POST /<panel>/tenancy/switch` to force a tenant in session
- `POST /<panel>/tenancy/clear` to clear forced tenant

Tenant middleware prioritizes tenant from session, then falls back to existing strategies (header, domain, user).

## MFA / 2FA (TOTP)

The panel now includes:

- MFA challenge (`GET/POST /<panel>/mfa/challenge`)
- MFA management page (`GET /<panel>/security/mfa`)
- setup / confirm / disable / recovery codes endpoints

`mfa` middleware protects panel routes and enforces MFA verification when enabled for the user.
The TOTP secret (`two_factor_secret`) is encrypted at rest using Adonis encryption, and recovery codes are stored hashed (SHA-256).

Run migrations to add MFA columns on `users`:

```bash
node ace migration:run
```

## Plugins

Plugin engine now covers:

- stable plugin API to register `resources`, `pages`, `widgets`, table `actions` (`record/bulk/header`), `middleware`, navigation
- auto-discovery (`adonisAdmin.plugins`, `filament.plugins`, prefixed dependencies)
- per-panel enable/disable (`onlyPlugins`, `disablePlugins`, `enablePlugins`)
- global plugin config + panel overrides (`adonisAdmin.pluginOptions`, `adonisAdmin.panels.<id>.pluginOptions`)
- hooks/events (`before/after` CRUD, `render.*`, auth hooks)
- compatibility/versioning via manifest (`id`, `version`, `engine`, `assets`, `migrations`) with guardrails
- assets/migrations publishing via API (`filament.publishPluginFiles`)
- security guardrail: panel option to enforce `tenantScoped = true` for plugin resources

### Plugin Contract

Minimum:

- `getId(): string`
- `register(panel: Panel, context?): void`

Optional:

- `boot(panel: Panel, context?): void`
- `supports(panel: Panel, context?): boolean`
- `onEvent(event): void | Promise<void>`

### Plugin Manifest

Example:

```json
{
  "id": "activity-log",
  "name": "Activity Log",
  "version": "0.1.0",
  "engine": ">=0.1.0",
  "assets": ["assets/logo.svg"],
  "migrations": ["database/migrations/001_create_activity_logs.ts"]
}
```

### DX Generation

```bash
node ace make:filament-plugin Audit --resource
node ace make:filament-plugin Audit --package --resource
```

Package mode generates a standalone npm plugin (peer dependency `adonis-admin-engine`) with a publish workflow.

### Discovery

Provider calls:

```ts
await filament.discoverPlugins({ cwd: this.app.makePath() })
```

Supported sources:

- `package.json > adonisAdmin.plugins`
- `package.json > filament.plugins`
- prefixed dependencies:
  - `adonis-admin-plugin-*`
  - `@adonis-admin/plugin-*`
  - `adonis-filament-plugin-*`
  - `@adonis-filament/plugin-*`

### Plugin/Panel Configuration

```json
{
  "adonisAdmin": {
    "plugins": ["./app/Plugins/ActivityLog/ActivityLogPlugin.js"],
    "pluginOptions": {
      "activity-log": {
        "publish": {
          "assetsDir": "resources/published-assets",
          "migrationsDir": "database/published-migrations"
        }
      }
    },
    "panels": {
      "admin": {
        "disablePlugins": ["experimental-plugin"],
        "pluginOptions": {
          "activity-log": { "enabled": true }
        },
        "security": {
          "requireTenantScopedPluginResources": true
        }
      }
    }
  }
}
```

### Assets/Migrations Publishing

```ts
// Preview
await filament.publishPluginFiles({ dryRun: true })

// Real publish
await filament.publishPluginFiles()

// Filter by panel/plugins
await filament.publishPluginFiles({
  panelId: 'admin',
  pluginIds: ['activity-log', 'audit'],
})
```

### Per-panel Controls (API)

```ts
this.onlyPlugins(['activity-log', 'audit'])
this.disablePlugins(['audit'])
this.enablePlugins(['audit'])
this.requireTenantScopedPluginResources(true)
```

## Packaging Status

The package now exposes:

- `configure(command)` via npm entrypoint (`adonis-admin-engine`)
- commands via `adonis-admin-engine/commands`
- Filament classes via `adonis-admin-engine/Filament/*`

