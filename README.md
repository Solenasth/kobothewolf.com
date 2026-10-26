# kobothewolf.com

My site and a live demo of my freelance work: a short profile and the **KOBO.EXE card editor**. You can design and export print-ready business cards (90 × 50 mm, 300 dpi PNG and a print PDF) in the boykisser-uwu style, in Spanish or English.

**Live:** https://kobothewolf.com *(coming with milestone M1)*

> Work in progress. The project is in bootstrap (milestone M0).

## How this is built
This repo is a showcase of the process as much as the product.
- **Spec first:** the approved [requirements](docs/REQUIREMENTS.md) and [design](docs/DESIGN.md) come before any code. The [original inputs](docs/origin/) are kept for history.
- **Decisions on record:** [docs/decisions/](docs/decisions/).
- **Issue → PR → release:** every change is traceable to an issue and its requirement IDs. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **AI-assisted, policy-driven:** the engineering rules live in [policies/](policies/) and [CLAUDE.md](CLAUDE.md).

## Stack
TypeScript · Vite · Preact · html-to-image · jsPDF · Playwright (Chromium, Firefox, WebKit) · vitest · GitHub Actions → GitHub Pages.

## Run locally
See [Local setup](CONTRIBUTING.md#local-setup) in CONTRIBUTING.

## Hosting and DNS
GitHub Pages, deployed by [`deploy.yml`](.github/workflows/deploy.yml) after CI passes on `main`. The custom domain is set in **Settings → Pages** (Actions deploys ignore a `CNAME` file) and verified at the account level against takeovers.

| Host | Type | Value |
|---|---|---|
| `kobothewolf.com` | `A` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| `kobothewolf.com` | `AAAA` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| `www.kobothewolf.com` | `CNAME` | `solenasth.github.io` |
| `_github-pages-challenge-solenasth.kobothewolf.com` | `TXT` | account-level domain verification code |

No other `A`, `AAAA`, `ALIAS` or `CNAME` records exist on these hosts. HTTPS is enforced, and `www` redirects to the apex.

## License
Code: MIT (see `LICENSE`). Fonts: OFL, each license next to its file. Meme-template art is credited on the cards and in `CREDITS.md`; rights stay with their holders.
