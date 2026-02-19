# Release Checklist

## Pre-release

1. Update version:

```bash
npm version 0.1.0-rc.2 --no-git-tag-version
```

2. Run release preflight:

```bash
npm run release:preflight
```

3. Verify tarball metadata and checksum printed by preflight.

## Publish RC

```bash
npm publish --tag rc
```

## Promote Stable

1. Bump stable version:

```bash
npm version 0.1.0 --no-git-tag-version
```

2. Re-run preflight:

```bash
npm run release:preflight
```

3. Publish stable:

```bash
npm publish
```
