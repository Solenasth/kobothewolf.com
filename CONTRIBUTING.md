# Contributing

This repo is built spec-first, through a visible issue → PR → release flow. These rules compile the engineering policies in [`policies/`](policies/). The policy files are the source of truth, and each section below links to its policy.

**Enforcement:**
- **Hard** rules are not negotiable: work that breaks one is rejected.
- **Soft** rules are defaults: they can be waived, with the reason stated in the PR.

---

## 1. Specs before code (hard)
[`spec-before-code`](policies/spec-before-code.md)
- Nothing is implemented unless it is backed by the approved [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) (what and why) and [`docs/DESIGN.md`](docs/DESIGN.md) (how).
- Requirements have IDs (`FR-E14`, `NFR-4`, …). Issues, PRs and tests cite them.
- A change in scope updates the documents first, then the code.
- Drafts and the historical inputs in [`docs/origin/`](docs/origin/) are inputs, not approved documents.

## 2. Issues first (hard)
[`issue-first`](policies/issue-first.md)
- Every feature, fix, refactor or chore starts from a GitHub issue that states the problem, the scope, the acceptance criteria and the requirement IDs.
- **No issue means no branch.** Work found mid-task that falls outside the issue's scope becomes a new issue.
- Branch name: `<issue-number>-<short-slug>`, e.g. `14-png-export`.

## 3. Pull requests only (hard)
[`pr-only`](policies/pr-only.md)
- Nothing is pushed to `main` directly; the only exception was the initial bootstrap commit. A ruleset enforces this: PRs, passing checks and signed commits are required, and force-pushes and deletion are blocked.
- A PR description has:
  - a summary;
  - `Closes #n`;
  - the requirement IDs covered;
  - a **Verified** section (see §8).
- The maintainer reviews and merges with a **merge commit**; squash and rebase merges are disabled. The merge commit message is the PR title, so the PR title must itself be a conventional commit.

## 4. Commits (soft)
[`conventional-commits`](policies/conventional-commits.md)
- Format: `type(scope): summary`. Types are `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf` and `security`.
- The summary is imperative, ≤ 72 characters, with no trailing period. The body explains *why* when that isn't obvious.
- Footer: `Refs #n`.
- Breaking changes take `!` and a `BREAKING CHANGE:` footer.
- **Curate before review:** each commit is one logical change, and fixups are folded in with `git rebase --autosquash`. A branch may be force-pushed only before review starts; after that, changes go in as new commits.
- **Signed:** every commit is signed (SSH signing), so GitHub shows it as Verified.

## 5. Tests (hard)
[`tests-required`](policies/tests-required.md)
- Every functional requirement and every security control has automated tests that name their IDs, e.g. `test('FR-E14 exports a 1134×661 PNG at 300 dpi', …)`.
- Security controls get **negative** tests that prove the bad input is rejected.
- A bug fix starts with a failing test that reproduces it.
- CI runs typecheck, validation, unit tests, E2E on Chromium, Firefox and WebKit, export checks, `npm audit` and gitleaks on every PR. A PR is not done until CI is green.

## 6. Dependencies (hard)
[`dependency-hygiene`](policies/dependency-hygiene.md)
- Check whether the platform already covers the need before adding anything. A new dependency is justified in its PR.
- Exact versions only (`save-exact`), the lockfile is committed, and CI installs with `npm ci`.
- `npm audit` must be clean, or each exception is documented.
- Prefer well-maintained packages with few transitive dependencies. GitHub Actions are pinned to a commit SHA.

## 7. Decision records (soft)
[`decision-records`](policies/decision-records.md)
- Significant decisions get a one-screen record in [`docs/decisions/NNNN-slug.md`](docs/decisions/). Significant means architecture, security model, hosting or major dependencies, or anything that reverses an earlier decision.
- A record has Context, Options considered, Decision, Consequences, and the date and status (Accepted, or Superseded by NNNN).
- Write the record when the decision is made, and link it from the PR that implements it.

## 8. Done means verified (hard)
[`verified-done`](policies/verified-done.md)
- Work is done only when it has been run the way a user will use it: built, tested and exercised in the browser.
- The PR's **Verified** section lists the commands run and their results, what failed, and what couldn't be verified (and why).
- No hedging about things that were verified, and no confidence about things that weren't.

## 9. Private by default (hard)
[`private-by-default`](policies/private-by-default.md)
- New repositories, artifacts and shares start private. Making anything public takes the maintainer's explicit OK for that specific item. This repo and its site were approved as public in [decision 0003](docs/decisions/0003-public-repo-and-art.md).
- Never commit secrets, local paths, personal or household details, or internal-only notes. gitleaks runs in CI.
- Per-machine notes go in `CLAUDE.local.md`, which is ignored.

## 10. Authorship (hard)
[`no-attribution`](policies/no-attribution.md)
- The maintainer is the sole author of record. Commits use the maintainer's git identity.
- Commits, PRs, tags, release notes and file headers carry no AI or tool attribution: no `Co-Authored-By` trailers for tools and no "generated with" lines.
- AI assistance is part of this repo's workflow and is documented openly in [`CLAUDE.md`](CLAUDE.md) and `policies/`. It just isn't credited as an author.

---

## Releases
- Each milestone in [DESIGN §14](docs/DESIGN.md) is a GitHub milestone.
- Each milestone ends in a SemVer tag (`v0.1.0` = M1, …), a GitHub release, and a `CHANGELOG.md` entry grouped by commit type.

## Local setup
Requires the Node version in [`.nvmrc`](.nvmrc) (`nvm use`).

```sh
npm ci                       # install exactly what the lockfile pins
npx playwright install       # once: Chromium, Firefox and WebKit for E2E
npm run dev                  # dev server
npm run typecheck            # TypeScript, browser and Node configs
npm test                     # unit tests (vitest)
npm run test:e2e             # builds, serves and runs E2E in all three browsers
npm run build                # production build in dist/
```

Package install scripts are off unless approved in `allowScripts` (`npm install-scripts ls`).
