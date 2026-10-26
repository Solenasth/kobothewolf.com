---
id: verified-done
title: Verified done, honestly reported
version: 1
scope: global
enforcement: hard
---

## Rule
Work is "done" only when it has actually been run and verified: built, tested, and exercised the way the user will use it. The report states exactly what was verified, what failed, and what was skipped.

## Why
"Should work" isn't done. The user decides based on the report, so the report must be true.

## How to apply
- Run the tests, start the app, exercise the changed path.
- If something can't be verified (missing credentials, hardware, an external service), say so explicitly.
- Report failures with the real output. Never paper over them.
- No hedging on things that were verified, and no confidence on things that weren't.

## Verification
Every completion report has a "Verified" section listing the commands run and their results.
