---
id: clean-media
title: Clean media, no metadata
version: 1
scope: global
enforcement: hard
---

## Rule
Images and other media that are committed or published keep only the data needed to render them. Strip EXIF, XMP, text chunks and content credentials (C2PA), including AI-tool credentials such as "Claude provided this file".

## Why
Metadata is invisible in review. A content credential that names an AI tool is attribution inside a file (`no-attribution`). Location, device, names and timestamps are personal details (`private-by-default`).

## How to apply
- Before committing or publishing a file, list its metadata (PNG chunks, `exiftool -a`). Strip everything but the image data.
- PNG keeps only `IHDR`, `PLTE`, `tRNS`, `IDAT` and `IEND`. A chunk the format needs for the output (such as `pHYs` for print resolution) is allowed only when the design names it.
- Strip files a tool generates (screenshots, social images, exports) the same way. Regenerating doesn't help when the tool adds the stamp itself.
- Commit only file types the check can read. A type it can't read gets its own check, or stays out of the repo.
- When a project is set up, add a CI check that rejects media carrying metadata, with a negative test.

## Verification
The CI check passes, and listing a published file's metadata shows only image data.
