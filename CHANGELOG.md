# Changelog

All notable changes, grouped by conventional-commit type, one section per release. From v0.7.0, release-please writes the entries, one line per conventional commit ([decision 0008](docs/decisions/0008-release-please.md)). Up to v0.6.0 they were written by hand, one line per merged PR.

## [0.8.0](https://github.com/Solenasth/kobothewolf.com/compare/v0.7.0...v0.8.0) (2026-10-29)


### Features

* **cli:** fail exports whose QRs print below their minimum size ([be3df3a](https://github.com/Solenasth/kobothewolf.com/commit/be3df3aafaa87a13364b0086bf4dc6784a3ee3ef)), closes [#74](https://github.com/Solenasth/kobothewolf.com/issues/74)
* **editor:** choose a back's QR layout ([c9c30d2](https://github.com/Solenasth/kobothewolf.com/commit/c9c30d2e6aba5dc6defaa500b41865e3dea5cd97)), closes [#74](https://github.com/Solenasth/kobothewolf.com/issues/74)
* **editor:** QR layouts on the backs ([#82](https://github.com/Solenasth/kobothewolf.com/issues/82)) ([a31aa73](https://github.com/Solenasth/kobothewolf.com/commit/a31aa73c864685c10e8c65a71fa1fed99420abcf))
* **styles:** add the same-size QR layout to every back ([c3e10f7](https://github.com/Solenasth/kobothewolf.com/commit/c3e10f7fc04aa200aa83f692af7d0f97c1fc42e2)), closes [#74](https://github.com/Solenasth/kobothewolf.com/issues/74)


### Fixes

* **page:** keep the language when moving between the site's pages ([fdf67ea](https://github.com/Solenasth/kobothewolf.com/commit/fdf67eae0253bd04df21b3d1c97920f3ea38997a)), closes [#79](https://github.com/Solenasth/kobothewolf.com/issues/79)
* **page:** keep the language when moving between the site's pages ([#80](https://github.com/Solenasth/kobothewolf.com/issues/80)) ([0007061](https://github.com/Solenasth/kobothewolf.com/commit/0007061c8ef31c5a854583f920199bb5864ec7ba))


### Refactors

* **styles:** move the backs' contact column positions into CSS ([0ab13be](https://github.com/Solenasth/kobothewolf.com/commit/0ab13bee912baecbfa47eb6418ff89c62eeddf9d)), closes [#74](https://github.com/Solenasth/kobothewolf.com/issues/74)


### Docs

* carry the language on links between pages (DESIGN rev. 31) ([a8b1476](https://github.com/Solenasth/kobothewolf.com/commit/a8b1476533d492a5a10ca0df56bed80ef090c906)), closes [#79](https://github.com/Solenasth/kobothewolf.com/issues/79)
* specify QR layouts on the backs (FR-E23, DESIGN rev. 32) ([ab7eb32](https://github.com/Solenasth/kobothewolf.com/commit/ab7eb32a0bedbc1d4a8777a41baa97b41b655744)), closes [#74](https://github.com/Solenasth/kobothewolf.com/issues/74)


### CI and tests

* drive the QR layouts and render every back in each one ([e560fbd](https://github.com/Solenasth/kobothewolf.com/commit/e560fbd883c21affa0f712523925e9c31cb33d71)), closes [#74](https://github.com/Solenasth/kobothewolf.com/issues/74)

## [0.7.0](https://github.com/Solenasth/kobothewolf.com/compare/v0.6.1...v0.7.0) (2026-10-27)


### Features

* **core:** read text-size sections from the faces ([0d48c61](https://github.com/Solenasth/kobothewolf.com/commit/0d48c614a1d6a593293045413276a37d58344608)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)
* **editor:** resize text per section on each face ([c8846e5](https://github.com/Solenasth/kobothewolf.com/commit/c8846e5bee0d43c6cc3c611dfc4f40888bda69e1)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)
* **editor:** text size per card section ([#78](https://github.com/Solenasth/kobothewolf.com/issues/78)) ([171889e](https://github.com/Solenasth/kobothewolf.com/commit/171889e3ba476593d835300d300046be17e884dc))
* **page:** "How it works" documentation page ([#77](https://github.com/Solenasth/kobothewolf.com/issues/77)) ([ca686ac](https://github.com/Solenasth/kobothewolf.com/commit/ca686acc493e5bda3ca8d132ff36e81546d69921))
* **page:** "OwO wats dis?!" button with a cute short explainer ([#72](https://github.com/Solenasth/kobothewolf.com/issues/72)) ([63744fb](https://github.com/Solenasth/kobothewolf.com/commit/63744fb2e26230028864fe51ae3a22b7b9cb3f13))
* **page:** add Open Graph image and build notes ([#70](https://github.com/Solenasth/kobothewolf.com/issues/70)) ([30732dd](https://github.com/Solenasth/kobothewolf.com/commit/30732dd5b17863b5dedb1b31a7b15ed5f4dbd8aa))
* **page:** add the "How it works" page ([3356b0f](https://github.com/Solenasth/kobothewolf.com/commit/3356b0f0fb7b11132f00ea74fc8ef5c870652896)), closes [#66](https://github.com/Solenasth/kobothewolf.com/issues/66)
* **page:** add the "OwO wats dis?!" explainer ([05b5125](https://github.com/Solenasth/kobothewolf.com/commit/05b51250ec426a5669608359f18fa053ca6eaf5e)), closes [#65](https://github.com/Solenasth/kobothewolf.com/issues/65)
* **page:** add the Open Graph image and a "How this was built" line ([505f277](https://github.com/Solenasth/kobothewolf.com/commit/505f27731514f9c56e4acf6b049762401ba4e90e)), closes [#22](https://github.com/Solenasth/kobothewolf.com/issues/22)
* **page:** point the OwO details link at the "How it works" page ([10aba79](https://github.com/Solenasth/kobothewolf.com/commit/10aba7982911c04dea393e646c7f1fe5e39e9484)), closes [#66](https://github.com/Solenasth/kobothewolf.com/issues/66)
* **styles:** mark boykisser-uwu's text sections and their range ([5e0b66e](https://github.com/Solenasth/kobothewolf.com/commit/5e0b66e0ce343005d09f1a61a862df8acf78cb02)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)
* **validate:** check text-size sections and require their labels ([ec8964c](https://github.com/Solenasth/kobothewolf.com/commit/ec8964c8eaec9ef4627d1a1bd5c01a3ffa63a4a2)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)


### Fixes

* **export:** undo only what the shadow fix changed ([6c1f449](https://github.com/Solenasth/kobothewolf.com/commit/6c1f44960839470aa23c19d341147fc84d26f133)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)
* **styles:** draw the code-cat program at the largest size that fits ([17ed75d](https://github.com/Solenasth/kobothewolf.com/commit/17ed75d0f17c331a0fe82102cdf53ab4b0d326b8)), closes [#75](https://github.com/Solenasth/kobothewolf.com/issues/75)
* **styles:** larger code text in the code cat for print legibility ([#76](https://github.com/Solenasth/kobothewolf.com/issues/76)) ([df21bf7](https://github.com/Solenasth/kobothewolf.com/commit/df21bf7673393999804fc8efbd588827b814bc64))


### Docs

* rewrite the README with screenshots, setup and the process ([b0e5f23](https://github.com/Solenasth/kobothewolf.com/commit/b0e5f235b9a1926514270b8130d8f521287dd06f)), closes [#22](https://github.com/Solenasth/kobothewolf.com/issues/22)
* specify text size per section (FR-E22, DESIGN rev. 30) ([dbbbcb0](https://github.com/Solenasth/kobothewolf.com/commit/dbbbcb0aa7ddafed98f6ebb0739b969388070513)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)
* specify the "How it works" page (FR-P12, DESIGN rev. 29) ([4003a97](https://github.com/Solenasth/kobothewolf.com/commit/4003a97d4f7cb4868d0ff01bd6727db3409d4f0d)), closes [#66](https://github.com/Solenasth/kobothewolf.com/issues/66)
* specify the larger code-cat text (DESIGN rev. 28) ([ace4327](https://github.com/Solenasth/kobothewolf.com/commit/ace432718b4a21a36d21dd81ebbe9fd0154346d7)), closes [#75](https://github.com/Solenasth/kobothewolf.com/issues/75)
* specify the OG image, build line and README images (rev. 26) ([51a50e2](https://github.com/Solenasth/kobothewolf.com/commit/51a50e2d4bb534f4412ad557ef3ce93e48cdea13)), closes [#22](https://github.com/Solenasth/kobothewolf.com/issues/22)
* specify the OwO explainer (FR-P11, DESIGN rev. 27) ([8e0bd1c](https://github.com/Solenasth/kobothewolf.com/commit/8e0bd1ca87233baa1aead4bf1f57ad104469088b)), closes [#65](https://github.com/Solenasth/kobothewolf.com/issues/65)


### CI and tests

* check the "How it works" page in both languages and without JS ([3fbc0d4](https://github.com/Solenasth/kobothewolf.com/commit/3fbc0d4815877a3f8bb99727aa5e43ee5fd2e468)), closes [#66](https://github.com/Solenasth/kobothewolf.com/issues/66)
* check the Open Graph image and the build line in both languages ([e71137a](https://github.com/Solenasth/kobothewolf.com/commit/e71137a57ceb4e29630db204c77313994e81558a)), closes [#22](https://github.com/Solenasth/kobothewolf.com/issues/22)
* drive every section's text size through the UI in both languages ([fcd19e3](https://github.com/Solenasth/kobothewolf.com/commit/fcd19e3e9878fcaa5a1bd90aae2d98342e708bac)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)
* drive the OwO explainer by mouse, keyboard, touch and without JS ([dab5dfe](https://github.com/Solenasth/kobothewolf.com/commit/dab5dfe7a0ba483c6969bdc010b64f55d8728a6f)), closes [#65](https://github.com/Solenasth/kobothewolf.com/issues/65)
* render exports at the smallest and largest text sizes too ([78fa1b5](https://github.com/Solenasth/kobothewolf.com/commit/78fa1b53bf0969061042d7ce414b652508766c0d)), closes [#73](https://github.com/Solenasth/kobothewolf.com/issues/73)
* take the code-cat front's visual baselines from the editor ([d60a9fb](https://github.com/Solenasth/kobothewolf.com/commit/d60a9fb470f3f369deb1e3429875d5fb27130b24)), closes [#75](https://github.com/Solenasth/kobothewolf.com/issues/75)


### Chores

* add a script that makes the site's images ([507f26e](https://github.com/Solenasth/kobothewolf.com/commit/507f26e300c4d6cfa6689c37047a3bd3d634d5a8)), closes [#22](https://github.com/Solenasth/kobothewolf.com/issues/22)

## [0.6.1](https://github.com/Solenasth/kobothewolf.com/compare/v0.6.0...v0.6.1) (2026-10-27)


### Fixes

* **ci:** give release PRs a header and footer in the card style's voice ([5635df1](https://github.com/Solenasth/kobothewolf.com/commit/5635df102d101a40e78bc8cc6d4fc7ac1d6e5003)), closes [#68](https://github.com/Solenasth/kobothewolf.com/issues/68)
* **ci:** thematic release PR text and the real release branch name ([#69](https://github.com/Solenasth/kobothewolf.com/issues/69)) ([2d0541f](https://github.com/Solenasth/kobothewolf.com/commit/2d0541fd1b21aa343075ff5a98697a7bc930d997))


### Docs

* let release-please write new changelog entries ([8e587cd](https://github.com/Solenasth/kobothewolf.com/commit/8e587cde36b8f4e34c38171830047754fc155909)), closes [#48](https://github.com/Solenasth/kobothewolf.com/issues/48)
* name the real release branch and allow crediting Release Please (DESIGN rev. 25) ([32edbbd](https://github.com/Solenasth/kobothewolf.com/commit/32edbbd1ed359691a1c39cdbaf86212587e92339)), closes [#68](https://github.com/Solenasth/kobothewolf.com/issues/68)
* specify releases with release-please (DESIGN rev. 24, decision 0008) ([88badc1](https://github.com/Solenasth/kobothewolf.com/commit/88badc17955bf25e60988b1fc5c46734a8034e93)), closes [#48](https://github.com/Solenasth/kobothewolf.com/issues/48)


### CI and tests

* automate releases with release-please ([#64](https://github.com/Solenasth/kobothewolf.com/issues/64)) ([7e62f15](https://github.com/Solenasth/kobothewolf.com/commit/7e62f1593b8ef9b30ff7fbd4ac1f7321e31be854))
* release with release-please and the release app's token ([affec0f](https://github.com/Solenasth/kobothewolf.com/commit/affec0f59ca0c257ac79df72fd2b3c550a1c5f13)), closes [#48](https://github.com/Solenasth/kobothewolf.com/issues/48)

## v0.6.0 (2026-10-27): vector PDF

Milestone M6 (CLI): `npm run kobo -- pdf-vector card.kobo.json` makes a print PDF with real, selectable text and the site's fonts embedded as subsets, for print shops that ask for vector output. It runs locally and in CI, never on the site, and checks the document with the editor's own rules first. `kobo check-exports` now checks vector PDFs too. Chromium sets PDF page sizes in 1.2 pt steps, so pages come out 95.93 × 56.13 mm, inside the 3 mm bleed. The live site is unchanged.

### Features
- **cli:** `pdf-vector` prints a `.kobo.json` on two 96 × 56 mm pages with Chromium, through the editor's validated import; an invalid document is rejected with its validation messages before any browser starts ([#59](https://github.com/Solenasth/kobothewolf.com/pull/59), closes [#20](https://github.com/Solenasth/kobothewolf.com/issues/20))
- **cli:** `check-exports` checks vector PDFs: page size within Chromium's step, embedded subsets of the site's fonts only, at most 4 fonts per page, and the document's texts present as real text ([#59](https://github.com/Solenasth/kobothewolf.com/pull/59))

### Fixes
- **cli:** generate the document validators before `kobo` runs, so it works on a fresh checkout ([#59](https://github.com/Solenasth/kobothewolf.com/pull/59))

### Refactors
- **core:** the document parser runs in Node as well as the browser ([#59](https://github.com/Solenasth/kobothewolf.com/pull/59))

### Docs
- design revision 23: the vector PDF command and Chromium's page-size step ([#59](https://github.com/Solenasth/kobothewolf.com/pull/59))

### CI and tests
- **ci:** the Chromium export job makes a vector PDF of a mixed card, and `check-exports` checks it with the other exports ([#59](https://github.com/Solenasth/kobothewolf.com/pull/59))

## v0.5.0 (2026-10-27): export

Milestone M5 (export): the editor on the live site now saves your card for printing. Each face downloads as a 300 dpi PNG (1134 × 661 px, 96 × 56 mm with bleed), and both faces as a 2-page print PDF. Everything is made in your browser. CI renders every variant's exports in Chromium and WebKit and checks their size, dpi, QR codes, fonts and glyphs. The vector PDF arrives in M6.

### Features
- **export:** a 300 dpi PNG per face, with fixes for WebKit (missing images, square corners, a lost background layer) and a warm-up so the first export is fast ([#54](https://github.com/Solenasth/kobothewolf.com/pull/54), closes [#17](https://github.com/Solenasth/kobothewolf.com/issues/17))
- **export:** the 2-page print PDF, 96 × 56 mm per page with each face at 300 ppi; jsPDF's unused optional modules stay out of the site ([#55](https://github.com/Solenasth/kobothewolf.com/pull/55), closes [#18](https://github.com/Solenasth/kobothewolf.com/issues/18))
- **cli:** `kobo check-exports` checks exports' size, dpi, QR codes (main at 300 and 150 dpi), nothing over the QRs, fonts per face, glyph coverage, and the PDF's pages, images and fonts ([#56](https://github.com/Solenasth/kobothewolf.com/pull/56), closes [#19](https://github.com/Solenasth/kobothewolf.com/issues/19))

### Chores
- **deps:** html-to-image 1.11.13 and jsPDF 4.2.1, bundled from npm instead of P8's CDN versions; jsqr 1.4.0 for the QR checks ([#54](https://github.com/Solenasth/kobothewolf.com/pull/54)–[#56](https://github.com/Solenasth/kobothewolf.com/pull/56))

### Docs
- design revisions 20–22: PNG export, print PDF, check-exports and the export CI jobs ([#54](https://github.com/Solenasth/kobothewolf.com/pull/54)–[#56](https://github.com/Solenasth/kobothewolf.com/pull/56))
- decision [0007](docs/decisions/0007-export-library-versions.md): bundle current export libraries instead of P8's CDN versions ([#54](https://github.com/Solenasth/kobothewolf.com/pull/54))

### CI and tests
- **test:** exported pixels checked in Chromium, Firefox and WebKit: hidden pieces, the drawn code cat, round corners, the gingham, and each PDF page against its PNG ([#54](https://github.com/Solenasth/kobothewolf.com/pull/54), [#55](https://github.com/Solenasth/kobothewolf.com/pull/55))
- **test:** the page, editor and export code transfer under 3 MB (NFR-2) ([#55](https://github.com/Solenasth/kobothewolf.com/pull/55))
- **ci:** each browser's export times in the job summary; every variant's exports rendered in Chromium and WebKit, checked, and kept as artifacts; `export` and `check-exports` are required checks ([#54](https://github.com/Solenasth/kobothewolf.com/pull/54), [#56](https://github.com/Solenasth/kobothewolf.com/pull/56))

## v0.4.0 (2026-10-26): editor UI

Milestone M4 (editor UI): the card editor is live under the profile. Choose and mix the four boykisser-uwu variants, edit texts, hide pieces, pick art, backgrounds, colors and anti-rule angles, and turn your own drawing into a sticker, in English or Spanish. Your card is remembered in the browser. PNG and PDF export arrive in M5.

### Features
- **editor:** art, background, accent, shadow and range controls, and your own drawing turned into a sticker in a Worker, kept after a reload ([#51](https://github.com/Solenasth/kobothewolf.com/pull/51), closes [#16](https://github.com/Solenasth/kobothewolf.com/issues/16))
- **editor:** text form, piece checkboxes and restore for both faces ([#50](https://github.com/Solenasth/kobothewolf.com/pull/50), closes [#15](https://github.com/Solenasth/kobothewolf.com/issues/15))
- **editor:** editor shell loaded after the page: variant tabs, mixing fronts and backs, the scaled two-face preview, cut guides and a status line ([#49](https://github.com/Solenasth/kobothewolf.com/pull/49), closes [#14](https://github.com/Solenasth/kobothewolf.com/issues/14))
- **styles:** default faces start at P8's values (titles −2°, washi 14°, 7 sparkles) ([#49](https://github.com/Solenasth/kobothewolf.com/pull/49))

### Fixes
- **styles:** faces no longer inherit the page's font or section styles, so they look the same anywhere ([#49](https://github.com/Solenasth/kobothewolf.com/pull/49))
- **editor:** load after the first painted frame, and save pending edits when the page is hidden ([#51](https://github.com/Solenasth/kobothewolf.com/pull/51))

### Docs
- design revisions 17–19: editor shell and preview, text and piece controls, art, color and range controls ([#49](https://github.com/Solenasth/kobothewolf.com/pull/49)–[#51](https://github.com/Solenasth/kobothewolf.com/pull/51))

### CI and tests
- **test:** default faces compared with baselines made from P8 in Chromium, Firefox and WebKit ([#49](https://github.com/Solenasth/kobothewolf.com/pull/49))
- **test:** every text, piece, art, color and range control driven through the UI in both languages ([#50](https://github.com/Solenasth/kobothewolf.com/pull/50), [#51](https://github.com/Solenasth/kobothewolf.com/pull/51))
- **ci:** the deploy build is checked for the E2E test hook ([#49](https://github.com/Solenasth/kobothewolf.com/pull/49))

## v0.3.0 (2026-10-26): boykisser-uwu

Milestone M3 (boykisser-uwu): the style's cards as data, ready for the editor. The live site looks the same as v0.2.0; the editor UI that shows the cards arrives in M4 ([#14](https://github.com/Solenasth/kobothewolf.com/issues/14)).

### Features
- **styles:** port the code-cat `montar()`: the Rust program laid out inside the cat without splitting a token, closed OwO filler comments, drawn one letter at a time ([#45](https://github.com/Solenasth/kobothewolf.com/pull/45), closes [#13](https://github.com/Solenasth/kobothewolf.com/issues/13))
- **styles:** add the four boykisser-uwu variants (Certificado, Licencia, Gatito de código, Programming socks) as data, with English and Spanish labels; adding a variant needs no code change ([#44](https://github.com/Solenasth/kobothewolf.com/pull/44), closes [#12](https://github.com/Solenasth/kobothewolf.com/issues/12))
- **validate:** check style labels in every language, default backgrounds, face asset paths and mount scripts ([#44](https://github.com/Solenasth/kobothewolf.com/pull/44), [#45](https://github.com/Solenasth/kobothewolf.com/pull/45))
- **styles:** scope each variant's CSS to its own faces at build time ([#43](https://github.com/Solenasth/kobothewolf.com/pull/43), closes [#11](https://github.com/Solenasth/kobothewolf.com/issues/11))

### Chores
- **assets:** add the fonts, meme art, QR codes and `CREDITS.md`; published images keep only pixel data ([#42](https://github.com/Solenasth/kobothewolf.com/pull/42), closes [#10](https://github.com/Solenasth/kobothewolf.com/issues/10))

### Docs
- design revisions 13–16: asset and credits rules, CSS scoping, variants as data, the code-cat mount step ([#42](https://github.com/Solenasth/kobothewolf.com/pull/42)–[#45](https://github.com/Solenasth/kobothewolf.com/pull/45))
- decision [0006](docs/decisions/0006-css-scoping-not-shadow-dom.md): CSS scoping at build time instead of Shadow DOM ([#43](https://github.com/Solenasth/kobothewolf.com/pull/43))
- how to add a variant: [`docs/agregar-variante.md`](docs/agregar-variante.md) ([#44](https://github.com/Solenasth/kobothewolf.com/pull/44))

### CI and tests
- **ci:** compile and run the code-cat text from every browser with pinned Rust 1.99.1 and `-D warnings`; now a required check on `main` ([#45](https://github.com/Solenasth/kobothewolf.com/pull/45))
- **test:** fixture pages that check CSS isolation and every real face in Chromium, Firefox and WebKit ([#43](https://github.com/Solenasth/kobothewolf.com/pull/43), [#44](https://github.com/Solenasth/kobothewolf.com/pull/44))

## v0.2.0 (2026-10-26): core

Milestone M2 (core): the editor's engine, with no UI yet. The live site looks the same as v0.1.0; the editor UI arrives in M3.

### Features
- **core:** write a `pHYs` chunk so exported PNGs declare 300 dpi; malformed PNG bytes are rejected ([#39](https://github.com/Solenasth/kobothewolf.com/pull/39), closes [#9](https://github.com/Solenasth/kobothewolf.com/issues/9))
- **core:** port the die-cut sticker algorithm as pure functions, checked against the Python reference fixtures ([#38](https://github.com/Solenasth/kobothewolf.com/pull/38), closes [#8](https://github.com/Solenasth/kobothewolf.com/issues/8))
- **core:** document store with per-face state, validated values, local persistence, import/export and painting without parsing HTML ([#37](https://github.com/Solenasth/kobothewolf.com/pull/37), closes [#7](https://github.com/Solenasth/kobothewolf.com/issues/7))
- **core:** marks contract parser that reads a face's editable texts and pieces ([#36](https://github.com/Solenasth/kobothewolf.com/pull/36), closes [#6](https://github.com/Solenasth/kobothewolf.com/issues/6))
- **core:** JSON schemas, the boykisser-uwu style data, untrusted-document parsing with size, key and schema checks, and the build-time `validate` command ([#35](https://github.com/Solenasth/kobothewolf.com/pull/35), closes [#5](https://github.com/Solenasth/kobothewolf.com/issues/5))

### Docs
- design revisions 8–12: validation rules, marks contract ([`docs/marcas.md`](docs/marcas.md)), document store, sticker tolerance and Worker plan, `pHYs` writer ([#35](https://github.com/Solenasth/kobothewolf.com/pull/35)–[#39](https://github.com/Solenasth/kobothewolf.com/pull/39))
- correct FR-B3: the main QR and `@KoboTheWolf` rule applies to back faces ([#35](https://github.com/Solenasth/kobothewolf.com/pull/35))

## v0.1.0 (2026-10-26): placeholder live

Milestones M0 (bootstrap) and M1 (placeholder live): https://kobothewolf.com serves a bilingual profile with an inquiry form.

### Features
- **page:** inquiry and quote form that opens the visitor's email app; no backend, nothing stored ([#32](https://github.com/Solenasth/kobothewolf.com/pull/32), closes [#30](https://github.com/Solenasth/kobothewolf.com/issues/30))
- **page:** static bilingual profile in the boykisser-uwu style, language switch, CSP, metadata and 404 page ([#31](https://github.com/Solenasth/kobothewolf.com/pull/31), closes [#4](https://github.com/Solenasth/kobothewolf.com/issues/4))
- **i18n:** catalogs, `t()`, allow-listed language resolution and the `validate` catalog check ([#29](https://github.com/Solenasth/kobothewolf.com/pull/29), closes [#3](https://github.com/Solenasth/kobothewolf.com/issues/3))

### CI and build
- deploy to GitHub Pages on kobothewolf.com after CI passes on `main` ([#28](https://github.com/Solenasth/kobothewolf.com/pull/28), closes [#2](https://github.com/Solenasth/kobothewolf.com/issues/2))
- run E2E in the pinned Playwright container; E2E setup from up to 12 min down to under 40 s ([#27](https://github.com/Solenasth/kobothewolf.com/pull/27), closes [#26](https://github.com/Solenasth/kobothewolf.com/issues/26))
- toolchain (Vite, TypeScript, Preact), unit and three-engine E2E tests, CI with audit and gitleaks, required checks on `main` ([#23](https://github.com/Solenasth/kobothewolf.com/pull/23), closes [#1](https://github.com/Solenasth/kobothewolf.com/issues/1))

### Docs
- adopt the preserve-history policy: pushed commits are never rewritten ([#25](https://github.com/Solenasth/kobothewolf.com/pull/25), closes [#24](https://github.com/Solenasth/kobothewolf.com/issues/24))
- bootstrap: approved requirements and design, decision records 0001–0005, redacted origin specs, contribution rules, policies, issue and PR templates (`831be8f`)
