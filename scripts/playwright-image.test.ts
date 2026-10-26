import { describe, expect, it } from 'vitest';
import { checkPlaywrightImage } from './playwright-image.ts';

const digest = '@sha256:' + 'a'.repeat(64);
const image = (tag: string, pin = digest) => `image: mcr.microsoft.com/playwright:v${tag}-resolute${pin}\n`;

describe('NFR-10 Playwright image matches @playwright/test', () => {
  it('accepts a digest-pinned image whose tag matches the package', () => {
    expect(checkPlaywrightImage(image('1.64.1'), '1.64.1')).toEqual([]);
  });

  it('rejects a tag that differs from the package version', () => {
    expect(checkPlaywrightImage(image('1.64.0'), '1.64.1')).toEqual([
      expect.stringContaining('does not match @playwright/test 1.64.1'),
    ]);
  });

  it('rejects an image that is not pinned by digest', () => {
    expect(checkPlaywrightImage(image('1.64.1', ''), '1.64.1')).toEqual([
      expect.stringContaining('not pinned by digest'),
    ]);
  });

  it('rejects a workflow with no Playwright image', () => {
    expect(checkPlaywrightImage('runs-on: ubuntu-latest\n', '1.64.1')).toHaveLength(1);
  });

  it('checks every image reference, not only the first', () => {
    expect(checkPlaywrightImage(image('1.64.1') + image('1.63.0'), '1.64.1')).toHaveLength(1);
  });
});
