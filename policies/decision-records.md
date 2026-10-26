---
id: decision-records
title: Decision records
version: 1
scope: opt-in
enforcement: soft
---

## Rule
Significant decisions get a short record in `docs/decisions/NNNN-slug.md`. Significant means architecture, security model, hosting, or major dependencies, and decisions that reverse an earlier one.

## Why
Future you (and future Claude) need to know *why*, not just *what*.

## How to apply
Each record covers:
- **Context**
- **Options considered**
- **Decision**
- **Consequences**
- **Date and status:** Accepted or Superseded by NNNN.

Keep it to one screen. Write it when the decision is made, not afterwards.

## Verification
PRs that implement a significant decision link its record.
