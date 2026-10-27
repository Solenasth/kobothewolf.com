---
id: preserve-history
title: Preserve git history
version: 1
scope: opt-in
enforcement: hard
---

## Rule
Once a commit is pushed, it is never rewritten. Mistakes are undone with new commits (reverts or fixes), not by amending, rebasing, resetting or force-pushing. This applies to every branch, not only `main`.

## Why
History is the audit trail. Rewriting it erases what happened, breaks other clones and links to commits, and invalidates review and CI results. An honest record, including mistakes and how they were fixed, is worth more than a tidy one.

## How to apply
- Undo a pushed commit with `git revert <sha>`. The message keeps the project's commit format, and its body says `This reverts commit <sha>.` and why.
- Tidy commits **only before their first push**: `git commit --fixup` plus a local `git rebase --autosquash`. Once pushed, commits are final.
- Never run `git push --force` or `--force-with-lease`. Where the host allows it, block force-pushes and branch deletion on `main` (ruleset or branch protection).
- Land PRs with **merge commits**, so the branch's individual commits survive on `main`. Disable squash and rebase merges.
- Project exception (this repo only, [decision 0008](../docs/decisions/0008-release-please.md)): release-please force-updates its own release branch, `release-please--branches--main`. No person commits there, and only its final state reaches `main`, through a reviewed merge commit.
- Exception: a leaked secret. Rotate it first; rewriting history then needs the user's explicit OK for that specific case.

## Verification
Before any push, check that it is a fast-forward of the remote branch (no force flags). `git log` on `main` shows the PR merge commits with their original branch commits.
