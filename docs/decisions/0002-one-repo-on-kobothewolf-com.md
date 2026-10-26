# 0002: One repo on kobothewolf.com

**Date:** 2026-10-25 · **Status:** Accepted (page layout refined by [0004](0004-single-page-bilingual.md))

## Context
The printed cards' site QR encodes `https://kobothewolf.com` and invites people to "see a demo of my work & make a better one!". Kobo owns both `kobothewolf.com` and `kobothewolf.dev`, and the QR target can change later. No landing page existed.

## Options considered
1. **One repo** serving the whole site on the apex `.com`.
2. **A user-site repo** (`solenasth.github.io`) for the landing page, with a separate project repo served at `kobothewolf.com/<repo>/`.
3. **`kobothewolf.dev`**, plus a redirect from the `.com`.

## Decision
Option 1, using the `.com` for v1. The repo is named `kobothewolf.com`. (The original plan put the editor at `/editor/`; 0004 replaced that with a single page.)

## Consequences
- One build, one deploy and one DNS setup. The QR lands on the page that contains the editor.
- The `.dev` stays unused until it's needed (a redirect or a new QR target).
- Splitting later means a new repo plus moving the custom domain.
