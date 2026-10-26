# 0003: Public repo and site; meme-template art stays, unknown-author art goes

**Date:** 2026-10-25 · **Status:** Accepted

## Context
The design source's credits file says the collected art is "for personal use and as a joke, not for profit".
- Most editor stickers come from deliberately anonymous meme templates.
- "Suéter rosa" is fan art by an unidentified author.

A freelance showcase is commercial-adjacent. The private-by-default policy requires explicit approval to publish.

## Options considered
1. Public, with all third-party stickers swapped for Kobo's own or credited art.
2. **Public, keeping the meme-template art and removing unknown-author fan art.**
3. Private repo (needs GitHub Pro), with only the site public.

## Decision
Option 2, explicitly approved by Kobo on 2026-10-25 for this repo and site. "Cara feliz" replaces "Suéter rosa" as the Programming socks default.

## Consequences
- Credits stay on the faces and are listed in `CREDITS.md`.
- Only processed, approved assets enter the repo; the raw source collection stays private.
- The edgy-2000s style (unknown-author art) waits until its art is cleared.
- If a rights holder objects, the asset is removed. That's easy because assets are files, not inlined data.
