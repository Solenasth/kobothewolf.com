import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('toolchain smoke', () => {
  it('compiles TSX against Preact', () => {
    expect(typeof App).toBe('function');
  });
});
