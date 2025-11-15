# Changesets

This directory contains changeset files that describe changes made to the package.

## What is a changeset?

A changeset is a file that describes a change to the package. It includes:
- The type of change (major, minor, patch)
- A summary of what changed

## Creating a changeset

Run:
```bash
pnpm changeset
```

This will guide you through creating a changeset file.

## Changeset files

Files in this directory follow the pattern:
```
<random-id>.md
```

Example:
```markdown
---
"loveops-policies": patch
---

Fixed bug in MatchingEngine where emotional load wasn't being respected
```

## Release process

When changesets are merged to main:
1. A "Version Packages" PR is automatically created
2. When merged, versions are bumped and changelog is updated
3. Package is published to npm

