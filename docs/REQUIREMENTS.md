# Requirements: kobothewolf.com (profile + KOBO.EXE card editor)

**Status:** Approved 2026-10-26 (rev. 5: FR-P1 contact and profile copy, #4; rev. 4: FR-R6 preserve-history, #24)
**Companion:** [DESIGN.md](DESIGN.md) · decisions in [decisions/](decisions/)
**Inputs** (historical, superseded by this document; redacted copies go in `docs/origin/`, FR-R2):
- **GP:** "Port the variant editor to GitHub Pages", the minimal single-file port.
- **EV:** "KOBO.EXE variant editor app" v0.3, the full editor app spec.
- **P8:** the v8 prototype of the editor, a single 4 MB HTML file. Behavior described here was read from its source.

A requirement taken from an input names it in brackets, e.g. `[EV FR-3]`.

---

## 1. Purpose
A static, public, single-page site at `https://kobothewolf.com`. A short profile (contact and experience) sits on top, and a live rebuild of the KOBO.EXE card editor sits below it. Visitors create, edit and export print-ready business cards in the boykisser-uwu style, in Spanish or English.

The site is a freelance showcase on two levels:
- **The product:** the page and the editor.
- **The process:** the public repository shows spec-driven development, with requirements, design, decision records, issues, PRs, CI and clean git history.

## 2. Users
| User | Need |
|---|---|
| **Prospective client** | Judge Kobo's work quickly: the live page, the editor, and how the repo was built |
| **Card recipient** (scanned the QR) | Land on the page, see who Kobo is, and make their own card right there |
| **Kobo** (owner) | Design and export their own print-ready cards, and add variants without touching editor code |

## 3. Goals
- **G-1** A working demo plus a public repo that are both client-presentable, process included.
- **G-2** Feature parity with P8, then the improvements from EV.
- **G-3** The printed QR resolves to a page where the editor is reachable without leaving it. Kobo owns `kobothewolf.com` and `kobothewolf.dev`; v1 uses the `.com`, and the QR target can change later.
- **G-4** Static only: free hosting, no backend, no runtime third parties.
- **G-5** Fully usable in Spanish and English, and built so adding a language takes data only.

## 4. Decisions
| # | Decision | Record |
|---|---|---|
| D-1 | The v1 scope is the full rebuild (EV architecture) | [0001](decisions/0001-scope-full-rebuild.md) |
| D-2 | One repo on `kobothewolf.com` | [0002](decisions/0002-one-repo-on-kobothewolf-com.md) |
| D-3 | Public repo and site. Meme-template art stays (credited); unknown-author art is removed and "Cara feliz" replaces "Suéter rosa" | [0003](decisions/0003-public-repo-and-art.md) |
| D-4 | One page: profile above the editor, ES/EN with a language selector, in the editor's visual style | [0004](decisions/0004-single-page-bilingual.md) |
| D-5 | The repository and its history are part of the showcase; merge commits, signed | [0005](decisions/0005-repo-as-showcase.md) |

---

## 5. Functional requirements

### 5.1 Page and profile (FR-P)
| ID | Requirement |
|---|---|
| FR-P1 | `https://kobothewolf.com/` is a single page. The **profile** sits on top: name, a one-line pitch, a short and deliberately general experience summary (13+ years), and contact: Telegram `@KoboTheWolf` (`https://t.me/KoboTheWolf`) and `contact@kobothewolf.com`. No other email address is ever published. The **editor** sits below. Final copy will be polished later; v1 copy is provisional, and the pitch is a placeholder. |
| FR-P2 | The profile includes a "Make your card" link that jumps to the editor (`#editor`). |
| FR-P3 | A short "How this was built" line links to the public repo and its spec documents. |
| FR-P4 | A custom 404 page links back to the page. |
| FR-P5 | The page has a `<title>`, `<meta name="description">`, `<html lang>`, a favicon, and Open Graph tags (title, description, image). |
| FR-P6 | Contact details and the profile are readable even if the editor's JavaScript fails to load. |
| FR-P7 | The profile uses the editor's boykisser-uwu UI style (palette, fonts, buttons), not a separate neutral style. |

### 5.2 Languages (FR-I)
| ID | Requirement |
|---|---|
| FR-I1 | Spanish and English are fully supported: profile, editor UI, form labels, piece names, variant, background and color names, status and error messages, and export file names. |
| FR-I2 | A visible language selector (ES / EN) switches the language instantly, without reloading or losing editor state. |
| FR-I3 | First visit: `?lang=` if present, otherwise the browser language (`es*` → Spanish), otherwise English. The choice is remembered per browser. |
| FR-I4 | `<html lang>`, the title and the description follow the active language. |
| FR-I5 | Adding a language means adding catalog files only, with no code changes. The build fails if any catalog is missing a key that another one has. |
| FR-I6 | Card faces keep their authored default texts in both UI languages; a variant's card text is design content. Localized card defaults per variant are a v2 candidate. |

### 5.3 Editor (FR-E)
| ID | Requirement |
|---|---|
| FR-E1 | Choose the front and back **separately**, mixing faces from different variants of the same style. Variant tabs are shortcuts that set both. A style selector appears when more than one style exists. `[EV FR-1, P8]` |
| FR-E2 | Show both faces at scale side by side, stacked on narrow screens. Each face is drawn at 96 × 56 mm with bleed. `[EV FR-1, P8]` |
| FR-E3 | Generate a text form from the `data-ed` marks on both faces, in document order. Every field has a show/hide checkbox, changes apply live, and text is capped at 90 characters. `[EV FR-2, P8]` |
| FR-E4 | List each face's pieces (`data-parte` groups, the sticker, the bow, each washi tape) with a hide checkbox. `[EV FR-2b, P8]` |
| FR-E5 | Art choices: the style's stickers, the "[ your kitty here ]" placeholder (localized), or the user's own image. Backs also offer "none". `[EV FR-3]` |
| FR-E6 | Turn an uploaded PNG/JPEG/WebP into a sticker **in the browser** using the EV §6.3 algorithm, with a "cut off at the bottom" option. A non-image shows an error. The image never leaves the device. `[EV FR-4, P8]` |
| FR-E7 | Background per face, from the style's list. `[EV FR-5]` |
| FR-E8 | Accent and flat-shadow colors come **only** from the style's token lists. There is no free color picker. `[EV FR-6]` |
| FR-E9 | Anti-rule ranges come from `tokens.json`. Per face: sticker rotation −8…7° and sparkles from 5 to the face's maximum. Common: headline rotation −4…3°, sticker scale 85–115 %, washi angle 12–18° (the original sign is kept). `[EV FR-7]` |
| FR-E10 | Cut guide (pink, dashed) and safe-zone guide (blue, dotted) show on screen, can be toggled, and **never** appear in exports. `[EV FR-8]` |
| FR-E11 | Locked elements have no controls: QR contents, `@KoboTheWolf`, contact URLs and the code-cat program. The main QR and `@KoboTheWolf` cannot be hidden. `[EV FR-9]` |
| FR-E12 | Optional contact blocks (today, the site QR block) show or hide as a whole. Their invitation texts are editable; their QR follows the main QR rules. `[EV FR-9b]` |
| FR-E13 | "Restore" resets texts and pieces on the two faces shown. `[P8]` |
| FR-E14 | Export: a PNG per face at 300 dpi (1134 × 661 px with a `pHYs` chunk) and a 2-page print PDF (96 × 56 mm per page, 300 ppi image). File names are localized, e.g. `<file>-front-300dpi.png` / `<archivo>-frente-300dpi.png`. `[EV FR-10, §5.1]` |
| FR-E15 | Exports are ordinary browser downloads. If an export library fails to load, the buttons stay disabled and a message says so. `[GP §1–2]` |
| FR-E16 | The last document is remembered per browser, **including the user's own sticker** (P8 lost it on reload). `[EV §6.5]` |
| FR-E17 | Save and open documents as `.kobo.json`. Opening validates the file and rejects anything invalid with a clear message. `[EV FR-11, §3.5]` |
| FR-E18 | Adding a variant takes only its faces (HTML with marks), its CSS, its `variant.json` and its label catalogs. No editor code changes. `[EV FR-12]` |
| FR-E19 | Variants with their own logic declare a `montar()` script that resolves when ready. Export waits for it. `[EV FR-13]` |
| FR-E20 | The code-cat face lays out the Rust program inside the silhouette without splitting tokens, fills the rest with closed `/* … */` comments, and draws letter by letter (no ligatures). The extracted text compiles. `[EV §6.4, P8]` |
| FR-E21 | Status and progress messages are announced through a polite live region. `[P8]` |

### 5.4 Build and CLI (FR-B)
| ID | Requirement |
|---|---|
| FR-B1 | A CLI command produces a **vector PDF** (embedded subset fonts, selectable text) from a `.kobo.json`. It runs locally and in CI, not on the site. `[EV §5.2]` |
| FR-B2 | A CLI command checks exports: size, dpi, QR decode, nothing overlapping the QRs, fonts, glyph coverage, and at most 4 fonts per face. `[EV §5.3]` |
| FR-B3 | The build fails when any of these hold: a token, variant or document schema is invalid; a locked element carries `data-ed`; a face lacks the main QR or `@KoboTheWolf`; the main QR or `@KoboTheWolf` sits inside a `data-parte`; or a catalog is missing a key (FR-I5). `[EV FR-9, §3.3]` |

### 5.5 Deployment (FR-D)
| ID | Requirement |
|---|---|
| FR-D1 | A GitHub Actions workflow builds the site and deploys it to GitHub Pages on every merge to `main`. |
| FR-D2 | The site serves on `kobothewolf.com` over HTTPS with "Enforce HTTPS" on. `www.kobothewolf.com` and `solenasth.github.io/kobothewolf.com` redirect to the apex. |
| FR-D3 | The custom domain is verified at the GitHub account level (takeover protection). |

### 5.6 Repository as showcase (FR-R)
| ID | Requirement |
|---|---|
| FR-R1 | The `README.md` covers: what the site is, the live link, screenshots, the stack, how to run and test it locally, and an overview of the spec-driven process linking to requirements, design, decisions and origin specs. |
| FR-R2 | `docs/origin/` holds **external, redacted** versions of the input specs (GP and EV), marked as historical inputs superseded by REQUIREMENTS and DESIGN. Redaction removes private local paths, machine and network details, private prototype URLs, references to removed art and private source folders, and internal-only notes. It keeps the technical content and reasoning. The internal originals are never committed. |
| FR-R3 | All work after bootstrap flows issue → branch `<n>-<slug>` → PR → green CI → merge by Kobo. PRs link their issue, list the requirement IDs covered, and include a "Verified" section. |
| FR-R4 | Issue templates (feature, bug) and a PR template enforce FR-R3's fields. GitHub milestones mirror the delivery plan. |
| FR-R5 | `main` is protected by a ruleset: PR required, status checks required, signed commits required, no force-push, no deletion. Merged branches are deleted. |
| FR-R6 | Commits follow Conventional Commits, reference their issue, are signed (GitHub shows them as Verified), and carry no AI attribution. Commits are tidied **before their first push** (one logical change each, no "wip" or "fix typo" commits). Pushed commits are never rewritten: mistakes are undone with revert or fix commits, and nothing is force-pushed (`preserve-history` policy). PRs land with a **merge commit** whose message is the conventional PR title, so `main` keeps both the per-PR merge and the individual commits. |
| FR-R7 | Each delivery milestone ends in a SemVer tag and a GitHub release. `CHANGELOG.md` is updated from the conventional commits. |
| FR-R8 | Nothing private is committed: no secrets (gitleaks in CI), no local paths, no internal-only notes. A per-machine `CLAUDE.local.md` and the internal `.specs/` stay ignored. |
| FR-R9 | The AI-assisted, policy-driven workflow is public: `CLAUDE.md` and `policies/` are committed. `CONTRIBUTING.md` compiles the policies into human-readable contribution rules. |

---

## 6. Non-functional requirements
| ID | Requirement |
|---|---|
| NFR-1 **Fidelity** | For the same state, editor faces render pixel-identical to P8 outside antialiased regions. This excludes art removed under D-3. `[EV §7]` |
| NFR-2 **Performance** | The profile renders before the editor's code loads (LCP < 2.5 s on a mid-range phone over 4G). Exporting one face takes under 3 s on a mid-range laptop. Total initial transfer is under 3 MB (P8 was 4 MB). `[EV §7]` |
| NFR-3 **No third parties** | No runtime request leaves the origin: fonts, libraries and images are self-hosted, with no analytics or CDNs. Once loaded, the editor works offline. `[GP AC-3, EV §7]` |
| NFR-4 **Security** | User text is never parsed as HTML. Imported `.kobo.json` is untrusted: schema-validated, size-limited, and embedded images are restricted to re-encoded PNG. A Content Security Policy is set. Every control has a negative test. |
| NFR-5 **Privacy** | Uploaded images and documents stay in the browser. Nothing personal goes in the public repo beyond the public contact details already printed on the cards. |
| NFR-6 **Accessibility** | Profile and editor panel meet WCAG 2.2 AA in both languages: labelled controls, visible focus, keyboard operation, AA contrast, `prefers-reduced-motion`. Card faces are artwork; their editable texts are reachable through the form. |
| NFR-7 **Responsive** | Usable at 360 px wide with no horizontal scroll. |
| NFR-8 **Browsers** | The latest two versions of Chrome, Firefox and Safari on desktop, plus iOS Safari. On iOS a download may open as a preview; that's acceptable and documented. `[GP]` |
| NFR-9 **Licensing** | Code is under the MIT license. Fonts are OFL, with each license next to its file. Meme-template art is credited on the faces and listed in `CREDITS.md`, with all rights left to their holders. No unknown-author or AI-generated art. |
| NFR-10 **Dependencies** | Minimal and justified; exact versions with a committed lockfile; `npm audit` clean in CI, with each exception documented. |
| NFR-11 **Testability** | Every FR and every security control has an automated test that names its ID. CI runs on every PR. |
| NFR-12 **Identifiers** | Identifiers inherited from the design source (`data-ed`, `data-parte`, `montar`, …) stay in Spanish, and the marks contract stays compatible with it. Everything user-facing goes through catalogs. |

## 7. Constraints
- **GitHub Pages:** static files only and no custom response headers, so the CSP goes in a `<meta>` tag and `frame-ancestors` isn't available. Limits are 1 GB per site and 100 MB per file.
- **Public repo:** only processed, approved assets come from the private design source. No unknown-author art and no secrets.
- **Cross-engine tests** (Chromium, Firefox, WebKit) run in CI.
- **Asset pipeline:** the Python asset tooling stays in the private design source. This repo gets only its outputs and test fixtures.

## 8. Out of scope (v1)
- Backend, accounts, cloud storage, real-time collaboration.
- AI-generated images; Canva integration.
- Free canvas editing (drag to move).
- The edgy-2000s style. The architecture supports it, but its art is blocked until cleared.
- A polished profile or portfolio, and multi-page navigation (planned for later).
- Sharing via URL hash, crop-mark pages, color test page, PWA install, single-file build, localized card defaults.

## 9. Resolved questions (2026-10-25)
| # | Answer |
|---|---|
| Q1 | Kobo owns `.com` and `.dev`; v1 uses `.com`. The QR target can change later. |
| Q2 | "Cara feliz" replaces "Suéter rosa" as the Programming socks default. |
| Q3 | Spanish and English with a language selector; architected for translation (FR-I). |
| Q4 | One page: provisional profile (contact and general experience) above the editor. |
| Q5 | The editor's own style, not a neutral one. |
| Q6 | MIT for code. |
| Q7 | The repo is named `kobothewolf.com`. |
| Q8 | Follow `tokens.json` (sticker rotation −8…7°). |
| Q9 | The repo is part of the showcase. Internal specs stay private; redacted external versions are published (FR-R2). |
| Q10 | `CLAUDE.md` and `policies/` are published, plus a `CONTRIBUTING.md` compiling the policies (FR-R9). |
| Q11 | Signed commits (FR-R5, FR-R6). |
| Q12 | Merge commits, no squash (FR-R6). |

## 10. Open questions
None at approval. New questions get added here, and scope changes update this document before the code.
