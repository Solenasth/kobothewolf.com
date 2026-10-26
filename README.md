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
*(Added by the first implementation issue.)*

## License
Code: MIT (see `LICENSE`). Fonts: OFL, each license next to its file. Meme-template art is credited on the cards and in `CREDITS.md`; rights stay with their holders.
