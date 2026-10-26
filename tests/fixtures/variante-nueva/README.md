# variante-nueva

A variant that exists only as data: its manifest, faces, CSS and labels
(`labels.json`, one object per language). `tests/variants.test.ts` copies the
real `boykisser-uwu` style, drops this folder in as `variantes/nueva` and its
labels into the catalogs, and checks that validate, the loader and the CSS
scoping all take it with no code change (FR-E18).
