---
id: issue-first
title: Issue first
version: 1
scope: opt-in
enforcement: hard
---

## Rule
Every unit of work (feature, fix, refactor, chore) starts from a GitHub issue. No issue means no branch and no code.

## Why
Every change gets a written intent, a discussion place, and a trail from "why" to "what changed".

## How to apply
- Before starting work, find the issue or create it (with `gh issue create`, after confirming the title and body with the user). The issue states the problem, the scope, and acceptance criteria.
- Branch name: `<issue-number>-<short-slug>`.
- Every commit references the issue (`Refs #12`). The PR closes it (`Closes #12`).
- Work discovered mid-task that falls outside the issue's scope becomes a new issue, not scope creep.

## Verification
Reject (stop and tell the user) any request to implement work with no issue. Offer to draft the issue instead.
