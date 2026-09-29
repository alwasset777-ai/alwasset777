import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/tests/**/*.test.ts', 'desktop/tests/**/*.test.ts'],
    environment: 'node',
  },
});
