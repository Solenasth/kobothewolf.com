---
id: release-automation
title: Releases by release-kisser
version: 2
scope: opt-in
enforcement: hard
---

## Rule
Every release comes from release-please, run with the `release-kisser` GitHub App's token. The bot keeps one release PR open with the version bump and changelog. The user merges it; the bot then tags and publishes the release. Nobody bumps versions, writes changelog entries or makes release tags by hand.

## Why
The conventional commits already hold the changelog, and hand-made releases go wrong (dropped tag headings, forgotten steps). One bot for every repository means one setup, one key and one set of accepted trade-offs.

## How to apply
- **Needs:** `conventional-commits` and `pr-only`. With `preserve-history`, its bot-branch exception applies.
- **The app:** `release-kisser` is the only release bot. It has no webhook and is installed only on the user's account, on selected repositories. Its permissions are contents, pull requests and issues read and write, plus metadata read. Adding a permission affects every repository it's installed on, so it needs the user's OK and a version bump of this policy.
- **Token:** `actions/create-github-app-token` with `client-id: ${{ vars.RELEASE_APP_CLIENT_ID }}` and `private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}`. Leave `owner` and `repositories` empty so the token covers only the current repository, and request only the three write permissions. Never use `GITHUB_TOKEN`: PRs it opens don't trigger workflows, so the required checks never run.
- **Key:** one private key, shared by every repository. It lives only in the user's password manager and in each repository's `RELEASE_APP_PRIVATE_KEY` secret. It is never committed, pasted into chat or put in a file inside a repository.
  - **Public repositories:** the secret sits in a `release` environment that only `main` can deploy to, and only the release job uses it, with `environment: { name: release, deployment: false }`. That keeps the secret and the branch rule but creates no deployment record on each push to `main`. It fails if the environment has a custom deployment protection rule (a GitHub App), so the `release` environment has none.
  - **Private repositories** (environments need GitHub Pro or Team): a repository secret. A CI check fails if any workflow except the release workflow names `RELEASE_APP_PRIVATE_KEY` or `RELEASE_APP_CLIENT_ID`.
- **Workflow:** `googleapis/release-please-action` on push to `main`, with `permissions: {}`, a `release` concurrency group without cancelling, and every action pinned by commit SHA.
- **Config:** `release-please-config.json` and `.release-please-manifest.json`, with the manifest starting at the latest existing version. The release type matches the ecosystem. The PR title is `chore(release): v${version}`. Changelog sections follow the commit types.
- **Voice:** every release PR speaks in the boykisser voice and credits Release Please with a link. The defaults:
  - `pull-request-header`: `:3 rawr! a new release is ready~ *notices your commits*`
  - `pull-request-footer`: `made with [Release Please](https://github.com/googleapis/release-please) uwu · merge me when it's time to release~`

  That credit, in the bot's own PRs and their merge commits, is the only tool credit allowed. Release Please is a tool, not AI, so `no-attribution` is unaffected. In a public repository, the footer never links to a private one.
- **Cadence:** the project names it (for example one release per milestone), and the user merges the release PR on that cadence.
- **Accepted trade-offs:** adopting this policy accepts them; no decision record is needed. The project's CONTRIBUTING lists them.
  - Tags are lightweight and unsigned, because the app creates them through the API. The release commit is signed by GitHub and shows as Verified.
  - release-please force-updates its own branch (see `preserve-history`).
- **Setup for a new repository (done by the user):**
  1. Add the repository to the app's installation.
  2. Add the `RELEASE_APP_CLIENT_ID` variable and the `RELEASE_APP_PRIVATE_KEY` secret (in the `release` environment for a public repository).
  3. Make sure the ruleset on `main` requires PRs, checks and signed commits, with no bypass for the app.
- **After each release:** check the deploy (or the published package) by hand, and say so in the report (`verified-done`).
- **A leaked key:** generate a new key on the app's page, then set it in every repository and delete the old key. The key can mint tokens for every repository the app is installed on, so check their recent release activity too. To set it in every repository that holds it, from the folder with the new `.pem`:
  ```sh
  for r in $(gh repo list --limit 200 --no-archived --json nameWithOwner --jq '.[].nameWithOwner'); do
    if gh secret list --repo "$r" --json name --jq '.[].name' 2>/dev/null | grep -qx RELEASE_APP_PRIVATE_KEY; then
      gh secret set RELEASE_APP_PRIVATE_KEY --repo "$r" < release-kisser.pem && echo "repo: $r"
    elif gh secret list --repo "$r" --env release --json name --jq '.[].name' 2>/dev/null | grep -qx RELEASE_APP_PRIVATE_KEY; then
      gh secret set RELEASE_APP_PRIVATE_KEY --repo "$r" --env release < release-kisser.pem && echo "env:  $r"
    fi
  done
  ```
  Compare the list it prints with the app's installed repositories, then delete the old key and the `.pem` file.

## Verification
The release PR's checks run and pass. The release workflow uses the app token with pinned actions, and only it names the release key's secret and the Client ID variable. The tag and GitHub release exist after the merge, and the deploy check is reported.
