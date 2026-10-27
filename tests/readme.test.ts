import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// FR-R1: the README covers what the site is, the live link, screenshots, the
// stack, how to run and test it locally, and the spec-driven process with links
// to the requirements, design, decisions and origin specs.

const readme = readFileSync('README.md', 'utf8');
const headings = [...readme.matchAll(/^#{1,3} (.+)$/gm)].map((m) => m[1]!);
/** Relative link and image targets, without anchors. */
const targets = [...readme.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]!).filter((t) => !/^[a-z]+:/.test(t));

describe('FR-R1 README', () => {
  it('says what the site is and links the live site', () => {
    expect(readme).toMatch(/KOBO\.EXE card editor/);
    expect(readme).toContain('**Live:** https://kobothewolf.com');
  });

  it('has screenshots that exist, with alt text', () => {
    expect(headings).toContain('Screenshots');
    const images = [...readme.matchAll(/!\[([^\]]*)\]\((docs\/images\/[^)]+\.png)\)/g)];
    expect(images.map((m) => m[2])).toEqual(['docs/images/profile.png', 'docs/images/editor.png']);
    for (const [, alt, path] of images) {
      expect(alt!.length, path).toBeGreaterThan(20);
      expect(existsSync(path!), path).toBe(true);
    }
  });

  it('names the stack and how to run and test locally', () => {
    expect(headings).toEqual(expect.arrayContaining(['Stack', 'Run and test locally']));
    for (const command of ['npm ci', 'npm run dev', 'npm test', 'npm run test:e2e', 'npm run build']) expect(readme).toContain(command);
  });

  it('explains the process with links to the requirements, design, decisions and origin specs', () => {
    expect(headings).toContain('How this is built');
    for (const target of ['docs/REQUIREMENTS.md', 'docs/DESIGN.md', 'docs/decisions/', 'docs/origin/', 'CONTRIBUTING.md']) expect(targets).toContain(target);
  });

  it('every relative link and image points at something in the repo', () => {
    expect(targets.length).toBeGreaterThan(10);
    for (const target of targets) expect(existsSync(target.split('#')[0]!), target).toBe(true);
  });
});
