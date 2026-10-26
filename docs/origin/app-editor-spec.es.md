> **Documento histórico (versión externa, redactada).** Es el insumo original del proyecto, escrito antes de los requisitos y el diseño aprobados, que lo reemplazan: [REQUIREMENTS.md](../REQUIREMENTS.md) y [DESIGN.md](../DESIGN.md). Se quitaron rutas locales, URLs privadas del prototipo, detalles de máquina y red, y referencias a material sin publicar o retirado. El contenido técnico no cambió. [English translation](app-editor-spec.en.md).

# Spec · App "KOBO.EXE editor de variantes"

**Estado:** borrador v0.3 · 25 oct 2026 (v0.3: exportación segura en Safari/WebKit, QR del sitio kobothewolf.com, bloques de contacto opcionales · v0.2: controles granulares, mezcla de caras, relleno blanco de stickers, error de estado de la v5 y su prueba)
**Para:** proyecto aparte, en el repo de Kobo. Mientras tanto se trabaja con los artifacts actuales (ver §2).
**Fuente de verdad del diseño:** el repositorio privado de diseño KOBO.EXE (estilos, tokens, demos, kits, assets). Este documento describe la tecnología; las reglas visuales viven en `styles/<estilo>/STYLE.md` y `context/`.

---

## 1. Propósito y alcance

Una app web para **crear, editar y exportar tarjetas de presentación (y piezas afines) en los estilos de KOBO.EXE**, sin Canva, respetando al 100 % los tokens y efectos de cada estilo y bloqueando lo que no se debe tocar (contacto, QR).

**Dentro del alcance (v1)**
- Varios estilos (boykisser-uwu, edgy-2000s y los que vengan), cada uno con sus variantes.
- Edición por formulario: textos marcados, arte, fondo, color (solo tokens), antirreglas.
- Arte propio: subir un dibujo y convertirlo en sticker en el navegador.
- Exportación para imprenta: PNG 300 dpi por cara y PDF de 2 páginas con 3 mm de sangrado; opcional, PDF vectorial con fuentes incrustadas.
- Funciona sin servidor (estático) y sin conexión una vez cargada.

**Fuera del alcance (v1)**
- Edición libre tipo lienzo (mover cualquier pieza con el mouse). Para explorar composición se usa el Design canvas (§2.2) y la decisión se pasa al código.
- Cuentas, colaboración en tiempo real, nube.
- Generación de imágenes con IA (prohibido por el proyecto, decisión 2).
- Integración con Canva (decisión 6: rompe efectos y tokens).

---

## 2. Estado actual (lo que existe hoy)

### 2.1 Editor de variantes (artifact)
- **Nombre:** "Boykisser Variant Editor" (artifact privado de claude.ai).
- **Fuente:** `variants/boykisser-editor/` → `editor.template.html` + `build_editor.py` → `salida/editor.html` (≈4 MB, un solo archivo con todo incrustado).
- **Versión:** v8 del artifact (v7: sombras seguras al exportar en Safari · v8: QR del sitio en los 4 reversos).
- **Variantes:** Certificado, Licencia, Gatito de código, Programming socks (estilo boykisser-uwu). Frente y reverso se eligen por separado (mezcla entre variantes).
- **Controles por cara:** cada texto con mostrar/ocultar, piezas ocultables (`data-parte`, gatito, lazo, cada cinta), arte, fondo, rotación del gatito, brillitos. **Comunes:** acento, sombra, rotación de titulares, tamaño de gatitos, ángulo de cintas, guías.
- **Capacidad del runtime:** `downloads` (el visor de artifacts no deja descargar ni imprimir sin ella; cada archivo pide confirmación).
- **Librerías (CDN, versión fija):** html-to-image **1.11.11** (jsDelivr) y jsPDF **2.5.1** (cdnjs).
- **Probado:** PNG 1134 × 661 px con pHYs a 300 dpi; PDF 96 × 56 mm con PNG a 300 ppi; los dos QR decodifican (`https://t.me/KoboTheWolf` y `https://kobothewolf.com`); sin errores en consola; descargas reales en claude.ai.
- **Reversos:** bajo el contacto de Telegram, el bloque del sitio (QR a kobothewolf.com + "don't like my card? >w<" + invitación a ver la demo y hacer una mejor tarjeta). Es una pieza ocultable con dos textos editables; los QR y la URL quedan bloqueados.
- **Prueba de controles:** `variants/boykisser-editor/pruebas/test_controles.py` hace clic en las 125 casillas de las 8 caras y comprueba en el layout que cada elemento se oculta y vuelve; además selects, rangos y persistencia tras recargar (v5: 136 fallas · v6–v8: 0).

### 2.2 Design canvas (artifact, solo para explorar)
- Artifact privado de claude.ai; copia en el repositorio de diseño.
- Útil para mover piezas a mano. Limitaciones medidas: PNG máx. 726 × 424 px (~192 dpi), PDF como JPEG a 288 ppi, sin bloqueo de intocables. Comparación completa en `variants/boykisser-certificado/VARIANT.md`.

### 2.3 Pipeline local (Python, en `kobo-exe/`)
| Pieza | Qué hace |
|---|---|
| `lib/efectos.py` | Tratamiento de imágenes: crunch, mordisqueado, halo, flare, QR (edgy); `silueta()`, `sticker()` (boykisser) |
| `lib/fonts.json` + `lib/fonts/` | Registro de fuentes (alias, archivo `.woff2`, nombre en Canva, rol, peso) con licencias OFL |
| `styles/<estilo>/tokens.json` | Tokens del estilo (color, degradados, tipografía, antirreglas, efectos, intocables, contacto) |
| `variants/<estilo>-demo-web/` | Demo HTML (template + build): las caras de cada variante, fuente única |
| `variants/<estilo>-kit-canva/` | Guía de diseño en PDF (12 págs.) generada con Playwright |
| `tools/render.py` | HTML → PDF/PNG genérico |

**Dependencias:** Python 3.10+, pillow, numpy, scipy, qrcode, pdf2image (+ poppler), playwright + Chromium, fontTools + brotli (verificación de glifos), opencv (lectura del QR en pruebas), rustc (verificación del gatito de código).

---

## 3. Modelo de dominio

```
Estilo ──< Variante ──< Cara (frente, reverso)
  │            │            └── Marcas (campos editables, arte, rotaciones, adornos)
  │            └── Manifiesto (nombre, fondos por defecto, archivo de salida, controles)
  └── Tokens (color, tipografía, antirreglas, efectos, intocables, contacto)
Assets (fuentes, stickers, fondos, QR) ── compartidos por estilo
Documento (lo que guarda la persona) = estilo + variante + valores editados
```

### 3.1 Geometría de una cara
| Medida | Valor |
|---|---|
| Corte (tarjeta) | 90 × 50 mm = **900 × 500 px CSS** (1 px = 0.1 mm) |
| Sangrado | 3 mm por lado = **30 px** |
| Lienzo de la cara | 96 × 56 mm = **960 × 560 px CSS**; el corte empieza en (30, 30) |
| Zona segura | 3 mm adentro del corte: rectángulo (60, 60, 840 × 440) |
| Exportación 300 dpi | **1134 × 661 px** por cara |
| QR principal (Telegram) | ≥ 15 mm en impresión (hoy 18 mm con marco) |
| QR secundario (sitio) | ~10 mm con marco (código ~8.4 mm, versión 2, ECC M); decodifica a 300 dpi. Probar en papel; si falla, agrandar antes que acortar el margen blanco |

Las caras se diseñan en 900 × 500 (el corte) y lo que debe sangrar (fondos, franjas, cintas) se sale de esa caja; el lienzo de 960 × 560 lo recoge.

### 3.2 Tokens (`tokens.json`)
Forma actual (ver `styles/boykisser-uwu/tokens.json` y `styles/_plantilla/tokens.json`):
```jsonc
{
  "estilo": "boykisser-uwu", "nombre": "…", "version": "0.1",
  "formato": { "tarjeta_mm": [90, 50], "tarjeta_px_css": [900, 500], "impresion_dpi": 300, "sangrado_mm": 3 },
  "color": { "<nombre_de_uso>": "#RRGGBB", … },
  "degradados": { "<nombre>": ["#…", …] },
  "tipografia": { "max_fuentes_por_cara": 4, "roles": { "<rol>": ["<alias de fonts.json>"] } },
  "antirreglas": { … números por estilo … },
  "efectos_imagen": { "<efecto>": { "<param>": … } },
  "intocables": ["…"],
  "contacto": { "telegram": "@KoboTheWolf", "url": "https://t.me/KoboTheWolf", "sitio": "https://kobothewolf.com" }
}
```
**Para la app:** publicar un JSON Schema (`schemas/tokens.schema.json`) y generar de ahí las variables CSS (`--<nombre>`) y los tipos TS. Agregar una sección `editor` por estilo con las listas permitidas para los controles (acentos, sombras, fondos), hoy escritas a mano en el script.

### 3.3 Marcas en el HTML de una cara (contrato actual)
| Atributo | Significado |
|---|---|
| `data-ed="Etiqueta"` | Texto editable; el formulario muestra un campo con esa etiqueta, en orden de documento |
| `data-bote` (+ `data-cls`) | El texto se arma letra por letra con el efecto de rebote; `data-cls` = clase por letra |
| `data-arte="frente" \| "reverso"` | `<img>` intercambiable (stickers del estilo, hueco "[ tu gatito aquí ]", imagen propia, o ninguno en reverso) |
| `data-rot="st" \| "tit"` | Rotación controlada por la antirregla de stickers / titulares; el signo original se conserva (espejo) |
| `data-lazo` | Adorno (pieza "Lazo") que se muestra u oculta |
| `data-parte="Nombre"` | Pieza ocultable; los elementos con el mismo nombre se ocultan juntos |
| `.washi`, `.spark` | Cintas (on/off, ángulo con signo original) y brillitos (se muestran los primeros N) |
| *(sin marca)* | **No editable.** Aquí viven los QR, @usuario, URLs de contacto (t.me y kobothewolf.com), código del gatito, créditos |

Un bloque de contacto **opcional** puede llevar `data-parte` (se oculta entero) aunque su interior no se edite: así funciona `.sitio` (pieza "Sitio (QR + texto)"), cuyos textos de invitación sí llevan `data-ed` pero el QR y `kobothewolf.com` no. El QR principal y @usuario nunca van dentro de un `data-parte`.

**Para la app:** mantener este contrato (es lo que permite que demo, kit y editor compartan las mismas caras) y documentarlo como `docs/marcas.md`. Opcional: validar en build que cada cara tiene QR y contacto sin marca.

### 3.4 Manifiesto de variante (nuevo, hoy vive en el script)
```jsonc
// styles/boykisser-uwu/variantes/licencia/variant.json
{
  "id": "licencia", "nombre": "Licencia",
  "caras": { "frente": "lic-f", "reverso": "lic-r" },   // ids de las caras en el HTML
  "fondo": { "frente": "gingham", "reverso": "cuaderno" },
  "archivo": "boykisser-license",                        // prefijo de exportación
  "controles": ["textos", "arte", "fondo", "acento", "rotSt", "rotTit", "brillitos", "washi", "lazo"],
  "verificar": ["qr", "contacto", "max_fuentes"]         // chequeos de build
}
```

### 3.5 Documento guardado (lo que produce la persona)
```jsonc
{
  "app": "kobo-exe-editor", "version": 1,
  "estilo": "boykisser-uwu",
  "frente": "soc-f", "reverso": "cer-r",            // se pueden mezclar variantes
  "caras": {
    "soc-f": { "textos": { "0": "programming" }, "ocultosEd": [], "ocultasPiezas": ["Checklist"],
               "arte": "feliz" | "hueco" | "propio", "fondo": "algodon", "rotSt": 4, "brillitos": 5 },
    "cer-r": { … }
  },
  "artePropio": "data:image/png;base64,…",       // opcional, sticker ya procesado
  "acento": "#FF8FB8", "sombra": "#FF8FB8",
  "rotTit": -2, "escala": 100, "anguloWashi": 14
}
```
Hoy se guarda en `localStorage` (clave `bk-editor-v3`) por navegador. La app debe además **exportar/importar** este JSON (archivo `.kobo.json`) para que una tarjeta se pueda versionar en el repo.

---

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-1 | Elegir estilo y, por separado, el frente y el reverso (mezclar caras de variantes distintas del mismo estilo); las variantes son atajos. Ver ambas caras a escala, lado a lado (apiladas en celular). |
| FR-2 | Formulario generado de las marcas `data-ed` de ambas caras, cada campo con casilla mostrar/ocultar; cambios en vivo; botón "restaurar". |
| FR-2b | Lista de piezas por cara (`data-parte`, gatito, lazo, cada cinta) con casillas para ocultar cada una. |
| FR-3 | Arte: elegir entre los stickers del estilo, el hueco "[ tu gatito aquí ]" o una imagen propia; en reverso, también "ninguno". |
| FR-4 | Imagen propia → sticker en el navegador (algoritmo §6.3), con opción "cortado abajo". |
| FR-5 | Fondo por cara, de la lista del estilo. |
| FR-6 | Paleta: acento y sombra **solo** dentro de los tokens del estilo (sin selector libre). |
| FR-7 | Antirreglas con los rangos del `STYLE.md`: por cara (rotación del gatito −8…8°, brillitos 5–N) y comunes (titulares −4…3°, tamaño de gatitos 85–115 %, ángulo washi 12–18°). |
| FR-8 | Guías de corte (rosa, rayada) y zona segura (azul, punteada) visibles en pantalla y **nunca** en la exportación. |
| FR-9 | Intocables bloqueados: no hay control para el contenido de los QR, @usuario ni las URLs de contacto; el build falla si una variante los marca con `data-ed`. El QR principal y @usuario tampoco se pueden ocultar. |
| FR-9b | Bloques de contacto opcionales (hoy el del sitio): se muestran u ocultan completos; sus textos de invitación son editables; su QR sigue las mismas reglas que el principal (negro sobre blanco, marco recto, nada encima). |
| FR-10 | Exportar PNG 300 dpi por cara y PDF de imprenta de 2 páginas (§5). |
| FR-11 | Guardar/abrir documento `.kobo.json` (§3.5); recordar el último estado por navegador. |
| FR-12 | Agregar una variante = escribir sus caras con marcas + su `variant.json`; sin tocar el código del editor. |
| FR-13 | Variantes con lógica propia (p. ej. el gatito de código) declaran un script que corre al montar la cara y avisa cuando terminó (`ready`). |

---

## 5. Exportación

### 5.1 En el navegador (como hoy)
- **PNG por cara:** html-to-image `toPng(node, { width: 960, height: 560, canvasWidth: 1134, canvasHeight: 661, pixelRatio: 1, filter: sin .guide })`. Antes de dibujar, `sombrasADivs()` cambia cada `box-shadow` sólido por divs reales y lo deshace al terminar (ver §10: WebKit). Luego se inserta un chunk **pHYs** (11811 px/m = 300 dpi) después de IHDR, con su CRC32.
- **PDF de imprenta:** jsPDF `new jsPDF({ unit: 'mm', format: [96, 56], orientation: 'landscape', compress: true, putOnlyUsedFonts: true })`; una página por cara con la PNG a 96 × 56 mm (300 ppi). Sin fuentes en el PDF (el texto va dentro de la imagen).
- **Nombre de archivo:** `<archivo>-frente-300dpi.png`, `<archivo>-reverso-300dpi.png`, `<archivo>-imprenta-96x56mm.pdf`.

### 5.2 Vectorial (nuevo, recomendado en el repo)
Para imprentas que piden texto vectorial: un comando (Node + Playwright) que abre la cara con el documento `.kobo.json`, usa `@page { size: 96mm 56mm; margin: 0 }` y `page.pdf({ preferCSSPageSize: true, printBackground: true })`. Así el PDF lleva las **fuentes incrustadas** (subset) y el texto seleccionable. Verificado en el kit: solo aparecen las fuentes del estilo en `pdffonts`.
- Advertencia medida: Chrome redondea el alto (sale 50.1 mm en el kit); aceptable con sangrado, pero documentarlo.
- Opcional: marcas de corte (líneas de 3 mm fuera del sangrado) en una página aparte de 102 × 62 mm.

### 5.3 Chequeos automáticos de cada exportación
| Chequeo | Cómo | Criterio |
|---|---|---|
| Tamaño | leer PNG / `pdfinfo` | 1134 × 661 px; 272.13 × 158.74 pt (96 × 56 mm) |
| DPI | pHYs del PNG; `pdfimages -list` | 300 |
| QR | zxing (JS) u OpenCV | el principal decodifica exactamente `https://t.me/KoboTheWolf` a 300 y a 150 dpi; el del sitio, `https://kobothewolf.com` a 300 dpi (recortado) |
| Nada encima de los QR | cajas del layout | ningún brillito, cinta, sticker ni texto toca la caja de un `.qr` o del bloque `.sitio` |
| Motores | Playwright Chromium + WebKit | la exportación se compara con la captura en ambos (el error de sombras solo salía en WebKit) |
| Fuentes | `pdffonts` | PDF imagen: ninguna; PDF vectorial: solo las del estilo |
| Glifos | fontTools contra el texto de cada cara | ningún carácter fuera del `cmap` de su fuente (usar iconos SVG para ♡ ✔ ☑ ☐) |
| Fuentes por cara | contar `font-family` efectivas | ≤ 4 |

---

## 6. Arquitectura propuesta para el repo

### 6.1 Stack
- **TypeScript + Vite**, app estática. UI con **Preact** (o React; las caras siguen siendo HTML/CSS plano, el framework solo arma el panel).
- **Caras como HTML de verdad**, no reescritas en JSX: se cargan del HTML de la variante (mismo contrato de marcas) para que demo, kit y editor sigan compartiendo fuente.
- **Aislamiento de CSS por variante:** cada cara se monta en un **Shadow DOM** con su hoja de estilo (evita los choques que hoy se resuelven con prefijos `#cer-f`). html-to-image necesita que los estilos del shadow root estén accesibles: o se clona el nodo al DOM normal para exportar, o se usa el pipeline vectorial (§5.2) para la versión de imprenta.
- **Exportación en navegador:** html-to-image 1.11.11 y jsPDF 2.5.1 desde npm (sin CDN).
- **CLI de Node** (`kobo` o `npm run`) para: build de assets, PDF vectorial, kit en PDF, chequeos (§5.3).
- **Assets con Python (se queda):** `lib/efectos.py` sigue siendo la herramienta para procesar imágenes fuente. El sticker del navegador (§6.3) se mantiene en TS y se prueba contra la salida de Python.

### 6.2 Estructura sugerida
```
kobo-exe-editor/
├── apps/editor/                 Vite + TS (panel, preview, exportación en navegador)
├── packages/core/               tipos, schemas, parser de marcas, estado/documento, exportadores, sticker()
├── packages/cli/                Node + Playwright: pdf vectorial, kit, chequeos
├── styles/
│   ├── boykisser-uwu/
│   │   ├── tokens.json  STYLE.md
│   │   ├── caras.css            CSS compartido del estilo
│   │   ├── variantes/<id>/      variant.json + caras.html (+ script.js si tiene lógica)
│   │   └── assets/              stickers, fondos, máscaras (salidas de efectos.py / bgs.py)
│   └── edgy-2000s/ …
├── fonts/                       .woff2 + LICENSE-*.txt + fonts.json
├── schemas/                     tokens.schema.json, variant.schema.json, documento.schema.json
├── python/                      efectos.py, bgs.py, render.py (pipeline de assets)
├── tests/                       unit (vitest), e2e + visual (Playwright), chequeos de exportación
└── docs/                        marcas.md, agregar-variante.md, este spec
```
`kobo-exe/` puede convertirse en este repo o quedar como "fuente de diseño" de la que el repo importa `styles/`, `fonts/` y `assets/`.

### 6.3 Algoritmo del sticker (navegador, hoy en el editor)
1. Escalar la imagen a ≤ 700 px de lado sobre fondo blanco.
2. Tinta = luminancia < 225. Dilatar la tinta 5 px (cierre de huecos del trazo); si "cortado abajo", el último renglón cuenta como tinta.
3. Fondo = relleno por inundación desde los bordes abiertos sobre lo que no es tinta. Figura = lo demás; erosionar 5 px.
4. Borde blanco: dilatar la figura 16 px (vecindad 4/8 alternada ≈ disco). Sombra: misma forma, `#FF8FB8` al 60 %, desplazada (7, 9), sin desenfoque.
5. Componer sombra → borde blanco → imagen recortada por la figura.
6. **Relleno blanco** (`fondoBlanco`): forma = lo opaco del sticker, cerrado con un disco del 3 % del lado mayor y con huecos rellenos; dentro, todo pixel no opaco pasa a blanco. No cambia la silueta. Antes del paso 2 se pinta de blanco un margen del 1 % (capturas con marco). Salida PNG.
Equivalente en Python: `lib/efectos.py` (`silueta()` + `sticker()`).

### 6.4 Variantes con lógica: el gatito de código
- Script de la cara: lee una máscara (PNG), calcula tamaño de letra para que el programa ocupe ~1/3, acomoda el programa Rust **una vez sin partir tokens**, llena con comentarios `/* … */` (caritas OwO y frases), cierra el último comentario, dibuja letra por letra (sin ligaduras de JetBrains Mono) en un `<canvas>` a DPR 4 y deja el texto en `data-codigo`.
- Contrato propuesto: `export async function montar(cara: HTMLElement): Promise<void>`; el editor espera la promesa antes de exportar.
- **Chequeo en CI:** extraer `data-codigo` y compilar con `rustc --edition 2021` (debe compilar sin advertencias).

### 6.5 Estado y almacenamiento
- Estado en memoria (un store simple), serializado a `.kobo.json`.
- **Identidad estable:** cada cara tiene **un solo objeto** de estado durante toda la sesión; los controles y el render leen y escriben ese mismo objeto (o pasan por acciones del store). Nunca reconstruir el objeto de una cara al leerlo (`Object.assign(nuevo, viejo)`): los controles quedan atados a una copia vieja y sus cambios se pierden. Fue el error de la v5 (§10).
- Migración de estado guardado: completar solo las claves que falten con sus valores por defecto, sin reemplazar el objeto.
- `localStorage` solo como conveniencia (último documento abierto), con `try/catch`.
- Imágenes propias: guardar el sticker ya procesado (data URI) dentro del documento; límite sugerido 2 MB.

---

## 7. Requisitos no funcionales
- **Fidelidad:** el render del editor debe ser idéntico al de la demo (prueba visual con tolerancia 0 en zonas sin antialias).
- **Rendimiento:** exportar una cara < 3 s en una laptop media (hoy html-to-image tarda varios segundos con imágenes grandes; incrustar fuentes una vez y reutilizar).
- **Tamaño:** app inicial < 3 MB (hoy 4 MB por imágenes repetidas en data URI; en el repo, servir assets como archivos).
- **Accesibilidad:** controles con `label`, foco visible, contraste AA en el panel, `prefers-reduced-motion`.
- **Responsive:** usable a 400 px de ancho (panel apilado, preview escalada).
- **Sin conexión:** todo local (fuentes, librerías, assets); PWA opcional.
- **Licencias:** fuentes OFL con su licencia junto al archivo; arte de terceros solo con permiso o como plantilla de meme acreditada (ver el registro de créditos); nada generado por IA.

---

## 8. Pruebas y CI
| Nivel | Herramienta | Qué |
|---|---|---|
| Unit | vitest | parser de marcas, estado/documento, pHYs/CRC, sticker() contra fixtures |
| E2E | Playwright | cada variante: editar, cambiar fondo/arte/antirreglas, exportar; sin errores de consola; 400 px sin scroll horizontal |
| Controles | Playwright (clics reales) | **cada** casilla de texto y de pieza de cada cara: clic → el elemento queda `display: none` en el layout (revisando ancestros) → clic → vuelve; cada select y rango por la UI; persistencia tras recargar. Las pruebas deben pasar por la UI, no escribir el estado directo: así se escapó el error de la v5. Modelo: `pruebas/test_controles.py` |
| Visual | Playwright screenshots | caras por defecto de cada variante vs. snapshots aprobados |
| Exportación | script (§5.3) | tamaño, dpi, QR, fuentes, glifos, ≤ 4 fuentes por cara |
| Gatito | rustc | el texto del dibujo compila |
| CI | GitHub Actions | todo lo anterior en cada PR; artefactos: PNG/PDF de cada variante |

---

## 9. Plan de migración desde los artifacts
1. **Repo y base:** Vite + TS, mover `styles/`, `fonts/`, assets; schemas de tokens/variante/documento.
2. **Core:** parser de marcas, store, exportadores (PNG + pHYs, PDF jsPDF) portados del editor actual; pruebas unitarias.
3. **Boykisser:** las 4 variantes como `variant.json` + `caras.html`; el gatito como script con `montar()`. Paridad visual con el artifact.
4. **Export vectorial + chequeos** (CLI con Playwright).
5. **edgy-2000s:** marcar sus caras (demo `tarjeta-demo-web` y kit), sus controles propios (p. ej. intensidad del crunch, fuego/luna), y su variante Calaca (hoy solo en Canva: reconstruir en código).
6. **Publicación:** sitio estático (GitHub Pages u otro). Mantener el artifact como "vista rápida" si se quiere, generado desde el mismo build.

Mientras tanto: **el artifact es la herramienta oficial**; cualquier variante nueva se hace con las marcas del §3.3, así entra al repo sin rehacerse.

---

## 10. Trampas conocidas (lecciones de las pruebas)
| Problema | Causa | Solución |
|---|---|---|
| "Failed to fetch" al exportar PNG en el artifact | La CSP del visor bloquea `fetch()` de `data:` | Decodificar base64 con `atob` |
| Símbolos ♡ ✔ ☑ ☐ − en otra fuente | No existen en las fuentes del estilo; el navegador usa DejaVu/Liberation/Inter | Iconos SVG; verificar glifos con fontTools |
| `->` se dibuja como flecha | Ligaduras de JetBrains Mono | Dibujar letra por letra o `font-variant-ligatures: none` |
| PDF de 90.3 mm | `page.pdf(width='90mm')` redondea | `@page` + `preferCSSPageSize` |
| Canvas "tainted" en pruebas locales | Imagen de `file://` en `<canvas>` | Incrustar la máscara como data URI |
| Rebote de letras cambia al agrupar | `:nth-child` cuenta dentro del nuevo contenedor | Aceptado; si importa, asignar clases par/impar explícitas |
| Choques de CSS entre variantes | Clases globales iguales (`.qr`, `.cred`, `.marco`) | Shadow DOM o prefijos por cara |
| Canva cambia fuentes, sombras y patrones | Su importador de PDF | No se usa Canva (decisión 6) |
| Casillas y controles por cara no hacían nada (v5) | `ec()` creaba un objeto nuevo de la cara en cada llamada; los controles escribían en una copia vieja (los textos sí funcionaban porque compartían el sub-objeto) | Un solo objeto por cara; pruebas con clics reales (§8) |
| Stickers con cuerpo o pantalla transparentes | Bocetos con línea abierta: el relleno por inundación entra al cuerpo | `fondo_blanco()`: capa blanca con la forma del sticker, aberturas cerradas al 3 %, huecos rellenos (§6.3 paso 6) |
| Marcos (`box-shadow`) corridos y sin borde arriba/izquierda en el PNG/PDF, solo en Safari | WebKit pinta mal `box-shadow` dentro del `foreignObject` de html-to-image; Chromium no, así que las pruebas no lo vieron | Al exportar, convertir cada sombra sólida en divs reales (`sombrasADivs()`) y deshacerlo después; probar la exportación también en WebKit cuando el repo tenga CI con los 3 motores |
| Imagen propia sale como rectángulo | Capturas con marco oscuro: el fondo no se puede inundar | Pintar de blanco un margen del 1 % antes de procesar |
| Design canvas: PNG ~192 dpi, intocables editables | Límites del tipo Design | Solo para explorar |
| Stickers de bocetos con línea abierta salen con huecos | El relleno por inundación entra al cuerpo | Opción "cortado abajo", más cierre, o recorte manual |

---

## 11. Preguntas abiertas
- ¿Preact, React o sin framework para el panel? (El core no depende de esto.)
- ¿`kobo-exe/` se vuelve el repo, o el repo importa de él?
- ¿Se quiere edición libre de posición (arrastrar) en v2, guardada como desplazamientos por elemento con límites de zona segura?
- ¿Documentos compartibles por URL (estado en el hash) además de `.kobo.json`?
- ¿Marcas de corte y página de prueba de color para la imprenta?

---

## Apéndice A · Archivos actuales relevantes
*(Omitido en la versión externa: lista de archivos del repositorio privado de diseño.)*

## Apéndice B · Versiones fijadas hoy
| Pieza | Versión |
|---|---|
| html-to-image | 1.11.11 |
| jsPDF | 2.5.1 |
| Fuentes (fontsource) | 5.3.0 · Cherry Bomb One 400, Gochi Hand 400, Pacifico 400, JetBrains Mono 500, Silkscreen 400 |
| Playwright (Python) | 1.64.1 |
| rustc (verificación) | 1.97.0 |
| Runtime de artifacts | contrato 0.2.90, capacidad `downloads` |
