---
id: dependency-hygiene
title: Dependency hygiene
version: 2
scope: opt-in
enforcement: hard
---

## Rule
Keep dependencies minimal and justified, pin them exactly, lock them, and keep them audited.

## Why
Every dependency is attack surface and maintenance cost.

## How to apply
- Before adding a dependency, check whether the platform or standard library already covers it. If it's still needed, state why in the PR.
- Use exact versions (`save-exact`) and commit the lockfile. Use `npm ci` in CI and container builds.
- `npm audit` (or the ecosystem equivalent) runs in CI and is clean, or each exception is documented.
- Prefer well-maintained packages with few transitive dependencies.
- Pin CI building blocks immutably: GitHub Actions by full commit SHA (the version as a comment), container images by digest.
- When two pins must match (such as a test runner package and its container image), a CI check fails if they drift, and they change in the same commit.

## Verification
The PR lists any new dependencies with a justification. The audit step passes in CI. Every `uses:` is a commit SHA, and every container image has an `@sha256:` digest.
