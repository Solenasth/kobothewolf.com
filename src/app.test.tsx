import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('toolchain smoke', () => {
  it('compiles TSX against Preact and renders the placeholder heading', () => {
    const vnode = App();
    expect(vnode.type).toBe('h1');
    expect(vnode.props.children).toBe('Kobo The Wolf');
  });
});
