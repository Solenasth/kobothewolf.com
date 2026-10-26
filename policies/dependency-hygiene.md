---
id: dependency-hygiene
title: Dependency hygiene
version: 1
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

## Verification
The PR lists any new dependencies with a justification. The audit step passes in CI.
