# 0008: Release with release-please and a GitHub App

**Date:** 2026-10-27 · **Status:** Accepted. Supersedes the manually signed release tags (DESIGN §12, v0.1.0–v0.6.0).

## Context
Every milestone release was done by hand: a release issue, a version bump, a hand-written `CHANGELOG.md` entry, a PR, a signed tag, a GitHub release and a deploy check (#48). The conventional commits already hold what the changelog needs, and the hand steps have gone wrong before: git's default cleanup dropped the `###` headings from the v0.4.0 tag message.

## Options considered
1. **Keep releasing by hand:** signed tags, but every step is manual.
2. **Tag-only automation:** a person still writes the release PR, and a workflow tags and publishes it on merge. Fewer steps, but the version bump and changelog stay manual.
3. **release-please** with a GitHub App token: it keeps one release PR open with the version bump and changelog, and creates the tag and the GitHub release when that PR merges.

## Decision
Option 3. `googleapis/release-please-action` runs on every push to `main`, pinned by commit. Its token comes from a GitHub App installed only on this repository, with contents, pull requests and issues write access (`actions/create-github-app-token`, pinned by commit). A `GITHUB_TOKEN` would not do: PRs it opens don't trigger workflows, so the required checks would never run on the release PR.

Two trade-offs are accepted:
- **Tags aren't signed by Kobo's key.** The app creates them through the API. The release commit is created by the app with no custom author, so GitHub signs it and it shows as Verified, which the "signed commits" rule requires.
- **The release branch is force-updated.** release-please rebuilds `release-please--branches--main` from `main` and force-updates it each time it refreshes the release PR, which `preserve-history` forbids on every branch. This is a narrow exception for that bot branch only: no person commits there, its earlier states were never merged, and only its final state reaches `main`, through a reviewed merge commit. Every other branch keeps the rule.

## Consequences
- **Release cadence:** one release per milestone stays the rule (FR-R7). The release PR collects changes as PRs merge, and Kobo merges it at the milestone's end.
- **No more manual steps** for the version bump, changelog entry, tag and GitHub release. The deploy check after a release stays manual.
- **Changelog style:** entries are one line per conventional commit on `main`, so a PR shows as its merge commit (the PR title) and as its own commits. Entries v0.1.0–v0.6.0 stay as written.
- **The app's private key** lives only in the `RELEASE_APP_PRIVATE_KEY` secret. If it's exposed, Kobo generates a new key on the app's page and deletes the old one.
