---
id: tests-required
title: Tests required
version: 1
scope: opt-in
enforcement: hard
---

## Rule
Each functional requirement and each security control has automated tests. CI runs them on every PR. A PR with failing or missing tests isn't done.

## Why
Untested behavior is unverified behavior.

## How to apply
- Tests reference the requirement IDs they cover (e.g. `FR-3`).
- Security controls (authz checks, input validation, header handling) get negative tests: prove the bad request is rejected.
- Set up CI with GitHub Actions early, in the first implementation issue.
- Bug fixes start with a failing test that reproduces the bug.

## Verification
CI is green, and the PR lists which requirements its tests cover.
