import { describe, expect, it } from 'vitest';
import { generate } from './standalone.ts';

describe('NFR-10 standalone validators need no runtime dependency', () => {
  it('generates code with no import or require', () => {
    const code = generate();
    expect(code).toContain('export const validateDocument');
    expect(code).not.toMatch(/\brequire\(|^\s*import\s/m);
  });
});
