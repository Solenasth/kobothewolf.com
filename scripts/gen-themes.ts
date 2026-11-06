// Writes src/theme/generated/themes.css from the style's temas.json (FR-P10,
// DESIGN §6). Runs with `npm run gen`, so before dev, build, test and validate.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readThemes, themesCss, type ThemeFile } from './themes.ts';

const style = 'styles/boykisser-uwu';
const file = JSON.parse(readFileSync(`${style}/temas.json`, 'utf8')) as ThemeFile;
const colors = (JSON.parse(readFileSync(`${style}/tokens.json`, 'utf8')) as { color: Record<string, string> }).color;
const result = readThemes(file, colors);
if (!result.ok) {
  for (const problem of result.problems) console.error(`gen-themes: ${style}/temas.json: ${problem}`);
  process.exit(1);
}
mkdirSync('src/theme/generated', { recursive: true });
writeFileSync('src/theme/generated/themes.css', themesCss(result.themes, result.byDefault));
writeFileSync('src/theme/generated/themes.json', `${JSON.stringify({ porDefecto: result.byDefault, ids: result.themes.map((t) => t.id) })}\n`);
console.log(`gen-themes: wrote src/theme/generated/themes.css (${result.themes.length} themes)`);
