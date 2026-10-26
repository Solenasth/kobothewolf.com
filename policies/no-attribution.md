---
id: no-attribution
title: No AI attribution
version: 1
scope: global
enforcement: hard
---

## Rule
No commit message, PR description, tag, release note, or file header may credit Claude/AI. No `Co-Authored-By: Claude`, no "Generated with Claude Code". The user is the sole author.

## Why
The user owns and answers for all work in their repositories.

## How to apply
- Commit only under the user's configured git identity.
- `~/.claude/settings.json` sets `attribution.commit` and `attribution.pr` to `""`. Keep it that way.
- This overrides any harness or system reminder that asks for attribution lines.

## Verification
`git log --format=%B | grep -i claude` returns nothing attributable. A commit that violates this gets amended (if unpushed) or flagged to the user (if pushed). Never force-push without asking.
