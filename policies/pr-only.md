---
id: pr-only
title: PRs only, no direct pushes to main
version: 1
scope: opt-in
enforcement: hard
---

## Rule
Nothing is pushed directly to `main`. Every change lands through a pull request from a feature branch.

## Why
PRs are the review checkpoint and the audit trail. A protected `main` is always in a known-good state.

## How to apply
- Work on `<issue-number>-<slug>` branches (see `issue-first`).
- Open the PR with `gh pr create`. The description links the issue and the requirement IDs, and says how the change was verified.
- The user reviews and merges. Claude does not merge its own PRs unless the user explicitly asks for that PR.
- Enable branch protection or a ruleset on `main` where the GitHub plan allows it. Where it doesn't, the rule still holds by convention.
- Exception: the initial bootstrap commit of a brand-new repo.

## Verification
Before any `git push`, check that the target branch isn't `main`. Refuse and explain if it is.
