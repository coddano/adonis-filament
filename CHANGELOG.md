# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0-rc.2] - 2026-02-19

### Added

- Stable plugin API for registering resources, pages, widgets, table actions, middleware, and navigation.
- Plugin auto-discovery from `adonisAdmin.plugins`, `filament.plugins`, and supported dependency prefixes.
- Plugin manifest compatibility checks and publish support for assets/migrations.
- Panel-level plugin controls (`onlyPlugins`, `enablePlugins`, `disablePlugins`) and plugin options overrides.
- MFA/TOTP flow (challenge, setup, confirm, disable, recovery codes) with encrypted secret storage.
- Soft-delete table UX (`trashed` filter, `restore`, `force-delete`) and related routes/tests.
- Dedicated frontend type-checking with `vue-tsc` and script wiring.
- Plugin scaffolding CLI (`make:filament-plugin`) and publish command (`filament:plugin:publish`).

### Changed

- Release preflight now validates pack + smoke-install flow end-to-end.
- Smoke install script executes real post-install generator commands for stronger package validation.

### Fixed

- `make:filament-resource --generate` template crash caused by incorrect Tempura branching syntax.
- Smoke install script now supports environments without `rg` (fallback to `grep -E`).
- Plugin registration path made resilient so plugin failures do not crash panel boot.

## [0.1.0-rc.1] - 2026-02-18

### Added

- First release candidate with server-driven CRUD resources, panels, forms, tables, actions, tenancy, and permissions.
- CLI generators for resources and panels with model column inference.

[Unreleased]: https://github.com/coddano/adonis-filament/compare/v0.1.0-rc.2...HEAD
[0.1.0-rc.2]: https://github.com/coddano/adonis-filament/compare/v0.1.0-rc.1...v0.1.0-rc.2
[0.1.0-rc.1]: https://github.com/coddano/adonis-filament/releases/tag/v0.1.0-rc.1
