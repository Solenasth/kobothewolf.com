import { readFileSync } from 'node:fs';
import { checkPlaywrightImage } from './playwright-image.ts';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string }>;
};
const version = lock.packages['node_modules/@playwright/test']?.version;
if (!version) {
  console.error('@playwright/test is not in package-lock.json');
  process.exit(1);
}

const errors = checkPlaywrightImage(readFileSync('.github/workflows/ci.yml', 'utf8'), version);
for (const error of errors) console.error(error);
if (errors.length > 0) process.exit(1);
console.log(`Playwright image matches @playwright/test ${version}`);
