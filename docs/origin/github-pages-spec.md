> **Historical document (external, redacted version).** This is one of the project's original inputs, written before the approved requirements and design that supersede it: [REQUIREMENTS.md](../REQUIREMENTS.md) and [DESIGN.md](../DESIGN.md). The technical content is unchanged. Later decisions changed its scope (full rebuild, [0001](../decisions/0001-scope-full-rebuild.md)), domain (`.com`, [0002](../decisions/0002-one-repo-on-kobothewolf-com.md)) and library versions (DESIGN §5.5).

# Spec: Port the Boykisser Variant Editor to GitHub Pages

## Goal
Publish the Boykisser Variant Editor as a static site on GitHub Pages, served from a custom domain under HTTPS. All existing features must work outside claude.ai, including the exports.

## Source
- One self-contained file, `index.html` (~4 MB), exported from a claude.ai artifact. The user will provide it.
- Fonts and artwork are embedded as `data:` URIs. There are no other local assets.
- External dependencies are two `<script>` tags loaded from CDNs:
  - `https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js`
  - `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- State is stored in `localStorage` (wrapped in try/catch). It works as-is.
- UI strings and code comments are in Spanish. Keep them in Spanish.

## The one blocker: exports
Exporting depends on the claude.ai runtime:

```js
try { descargas = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { descargas = null; }
const ok = !!(descargas && window.htmlToImage && window.jspdf);
```

Off claude.ai, `descargas` is `null`, so every export button stays disabled.

Here is how the export path works:
- `guardarArchivo(nombre, crear)` calls `await descargas.save({ filename, data })`.
- `data` is a `Blob`: `pngDpi()` returns an `image/png` Blob, and `pdfDoble()` returns `doc.output('blob')`.
- After saving, the code reads `res.status`: `'saved'` shows "Guardado: …" and anything else shows "Enviado: …".
- Error handling reads `e.code`, which can be `'declined'` or `'rate_limited'`.

## Required changes

### 1. Download fallback
Immediately after the `window.claude.use('downloads')` line, add a shim with the same interface that triggers a normal browser download:

```js
// Fuera de claude.ai: descarga normal del navegador
if (!descargas) descargas = { save: async ({ filename, data }) => {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { status: 'saved' };
} };
```

Leave the claude.ai path intact, so the same file keeps working if it's republished as an artifact.

### 2. Status message
The message `'La exportación no está disponible en esta vista (ábrela en claude.ai para descargar).'` no longer makes sense. Replace it with a message about the export libraries failing to load, for example: `'La exportación no está disponible (no cargaron las librerías de exportación).'`

### 3. Document head
The artifact export puts `<title>` and some `<meta>` tags inside `<body>`. Move them into `<head>`, and add:
- `<meta name="description">`
- `lang="es"` on `<html>`
- A favicon (an inline SVG data URI is fine)

Remove `<meta name="claude:viewport-fit-sides">`, since it only means something on claude.ai.

### 4. Vendor the CDN libraries (recommended)
Download both libraries into `vendor/` and point the `<script>` tags at local paths. Keep the same versions.
- This removes the third-party runtime dependency and keeps the site working if it later moves to self-hosting.
- Record each library's version and license in `vendor/README.md`. Both are MIT.

## Repository layout
```
/
├── index.html
├── vendor/
│   ├── html-to-image.js
│   ├── jspdf.umd.min.js
│   └── README.md
├── CNAME          # one line: the custom domain
├── .nojekyll      # empty; skip Jekyll processing
└── README.md      # what it is, how to run locally, how to deploy
```

## GitHub Pages configuration
- Settings → Pages → Source: "Deploy from a branch", `main`, root folder. A GitHub Actions workflow isn't needed because there's no build step.
- Custom domain: the domain lives in the `CNAME` file. The user will choose one of:
  - **Subdomain** (e.g. `cards.kobothewolf.dev`): one `CNAME` record pointing at `<username>.github.io`.
  - **Apex** (`kobothewolf.dev`): `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, plus `AAAA` records to `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
- Verify the domain at the GitHub account level (Settings → Pages → Add a domain) to prevent takeover.
- Turn on "Enforce HTTPS" once the certificate is issued.
  - **.dev requires HTTPS**: the whole TLD is on the browser HSTS preload list, so the site won't load at all until the certificate exists. Expect a short wait after the DNS change.
  - Don't leave extra `A`/`AAAA`/`CNAME` records on the same host. They can block certificate issuance.
- DNS changes happen at the registrar. They are listed here for the user to apply; don't automate them.

## Size limits
GitHub Pages allows 100 MB per file and about 1 GB per site, so the ~4 MB `index.html` is well within limits. Don't split or minify it unless there's another reason to.

## Testing
Serve the repo locally with `python3 -m http.server` and test over `http://localhost`. Opening the file via `file://` can behave differently.

Check each of these in Chrome, Firefox, and Safari (desktop), plus iOS Safari:
- [ ] The page loads with no console errors.
- [ ] Every front/back variant renders, and the editable fields, rotations, and accent color work.
- [ ] Edits survive a reload (localStorage).
- [ ] Uploading a PNG/JPG/WebP produces the sticker; a non-image shows the error message.
- [ ] Front PNG export downloads a 300 dpi PNG (confirm the pHYs metadata).
- [ ] Back PNG export downloads.
- [ ] PDF export downloads a two-page 96×56 mm PDF.
- [ ] Export buttons enable after load. With `vendor/` scripts blocked, they stay disabled and the new message appears.
- [ ] Phone-width layout stacks correctly with no horizontal scroll.
- [ ] Known risk: iOS Safari has historically handled `a.download` on Blob URLs inconsistently. If it opens a preview instead of saving, that's acceptable, but note it in the README.

After deploying, also check:
- [ ] The custom domain loads over HTTPS with a valid certificate.
- [ ] `http://` redirects to `https://`.
- [ ] `<username>.github.io/<repo>` redirects to the custom domain.

## Acceptance criteria
1. The site is live on the chosen custom domain over HTTPS.
2. All three exports work outside claude.ai on desktop Chrome, Firefox and Safari.
3. No requests go to third-party hosts at runtime (if step 4 is done).
4. The same `index.html` still works when republished as a claude.ai artifact.

## Out of scope
- Backend, accounts, or server-side storage.
- Redesign or new card variants.
- Self-hosting outside GitHub, and the email/DNS setup for other domains.
