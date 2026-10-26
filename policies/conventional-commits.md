---
id: conventional-commits
title: Conventional commits
version: 1
scope: opt-in
enforcement: soft
---

## Rule
Commit messages follow Conventional Commits: `type(scope): summary`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `security`.

## Why
A readable history makes changelogs easy to generate.

## How to apply
- The summary is imperative, ≤72 characters, with no trailing period.
- The body explains *why* when that isn't obvious.
- The footer has `Refs #n` / `Closes #n` (see `issue-first`).
- Breaking changes get `!` and a `BREAKING CHANGE:` footer.

## Verification
Review `git log --oneline` for the PR's commits before opening it.
