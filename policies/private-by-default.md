---
id: private-by-default
title: Private by default
version: 1
scope: global
enforcement: hard
---

## Rule
New repositories, artifacts, shares, and published pages are private. Making anything public or sharing it externally requires the user's explicit OK for that specific item.

## Why
Exposure is easy to do and hard to undo: it can be cached, indexed, or forked.

## How to apply
- `gh repo create --private` unless the user said public.
- Never change visibility, publish, or share without asking.
- Don't put personal or household details in public places.

## Verification
Check visibility after creating anything new.
