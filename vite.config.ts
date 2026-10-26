import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
