---
id: spec-before-code
title: Spec and requirements before code
version: 1
scope: opt-in
enforcement: hard
---

## Rule
No implementation without two approved documents in the repo:
1. **Requirements** (`docs/REQUIREMENTS.md`): *what* and *why*. Users, goals, functional requirements (numbered, e.g. `FR-1`), non-functional requirements (`NFR-1`: security, performance, platforms), constraints, and out of scope.
2. **Spec / design** (`docs/DESIGN.md`): *how*. Architecture, data model, interfaces, security model, ops, and trade-offs. Each design element should trace back to requirement IDs.

Implementation that isn't backed by both documents is rejected.

## Why
Code built on unwritten assumptions gets rebuilt. Written requirements make review and verification possible.

## How to apply
- Draft both documents with the user and get explicit approval of each before writing code. Record the approval in the doc (`Status: Approved YYYY-MM-DD`).
- A change in scope updates the docs first, then the code.
- Issues and PRs reference the requirement IDs they satisfy.
- Loose initial drafts or pasted specs are inputs, not approved documents.

## Verification
Before writing code, check that both files exist and are marked Approved, and that the task maps to a requirement. If not, stop and say what's missing.
