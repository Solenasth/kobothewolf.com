# 0005: The repository and its history are part of the showcase

**Date:** 2026-10-25 · **Status:** Accepted · **Amended:** 2026-10-26 (history is preserved, #24)

## Context
Clients should see how the work is done, not only the result: spec-driven development, decision records, issue/PR traceability and clean git history. The input specs that started the project are internal: they contain private paths, machine details and references to unpublished material.

## Options considered
1. Publish only the code.
2. Publish the internal input specs as they are.
3. **Publish redacted external versions of the inputs, and run the whole project through a visible issue → PR → release flow.**

## Decision
Option 3.
- `docs/origin/` holds redacted inputs marked as superseded.
- Every change after bootstrap goes through an issue and a PR, with signed conventional commits, tidied before their first push and never rewritten afterwards (`preserve-history` policy).
- PRs land with **merge commits** (not squash), so the individual commits stay visible on `main` and each PR shows up as one merge.
- `CLAUDE.md` and `policies/` are published: the AI-assisted, policy-driven workflow is part of the showcase. `CONTRIBUTING.md` compiles the policies for human readers.
- Each milestone ends in a tagged release with a changelog.

## Consequences
- Slower than pushing directly, which is intended.
- `main` is not linear, which merge commits require. History quality depends on tidying commits before their first push; after that, mistakes stay visible alongside their reverts, which is the honest record the showcase is meant to show.
- Commit signing needs a one-time setup per machine.
- Redaction is a reviewed step (checklist in DESIGN §12).
- Nothing internal may be committed. `.specs/` and per-machine notes are ignored, and gitleaks runs in CI.
