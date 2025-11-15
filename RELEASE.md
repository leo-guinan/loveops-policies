# Release Process

This document describes how to release new versions of `loveops-policies`.

## Overview

This package uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation. Releases are automated via GitHub Actions.

## Making a Release

### 1. Make Changes

Make your code changes and commit them to a branch.

### 2. Create a Changeset

When you make changes that should be released, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:
- Select which packages to include (if in a monorepo)
- Choose the version bump type (major, minor, patch)
- Write a summary of the changes

This creates a file in `.changeset/` that describes your changes.

### 3. Commit and Push

Commit your changes and the changeset:

```bash
git add .
git commit -m "feat: add new matching algorithm"
git push
```

### 4. Create Pull Request

Open a pull request with your changes. The CI workflow will:
- Build the package
- Run linting
- Check that a changeset exists (if it's a PR)

### 5. Merge to Main

Once your PR is merged to `main`, the release workflow will:
- Create a "Version Packages" PR if there are unreleased changesets
- Automatically version the package and update the changelog
- Publish to npm when the version PR is merged

### 6. Publish (Automatic)

When the "Version Packages" PR is merged:
- The package version is bumped
- CHANGELOG.md is updated
- A git tag is created
- The package is published to npm

## Manual Release (if needed)

If you need to manually trigger a release:

```bash
# 1. Build the package
pnpm build

# 2. Version packages (updates version and changelog)
pnpm version

# 3. Publish to npm
pnpm release
```

**Note:** You'll need to be authenticated with npm and have publish access.

## Version Bump Types

- **Patch** (`0.1.0` → `0.1.1`): Bug fixes, small improvements
- **Minor** (`0.1.0` → `0.2.0`): New features, backward-compatible changes
- **Major** (`0.1.0` → `1.0.0`): Breaking changes

## Changelog

The changelog is automatically generated from changesets and updated in `CHANGELOG.md` during the release process.

## NPM Publishing

The package is published to npm automatically when:
- Changesets are present
- The version PR is merged
- The build succeeds

Make sure `NPM_TOKEN` is set in GitHub repository secrets.

## Pre-release Checklist

Before releasing:

- [ ] All tests pass
- [ ] Code is linted
- [ ] Changeset is created
- [ ] README is up to date
- [ ] Breaking changes are documented
- [ ] Dependencies are up to date

## Troubleshooting

### Changeset not detected

Make sure you've run `pnpm changeset` and committed the changeset file.

### Build fails

Check that:
- All dependencies are installed (`pnpm install`)
- TypeScript compiles without errors (`pnpm build`)
- No linting errors (`pnpm lint`)

### Publish fails

Check that:
- `NPM_TOKEN` is set in GitHub secrets
- You have publish access to the npm package
- Package name is available (if first publish)

