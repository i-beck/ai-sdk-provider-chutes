import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';

// Load .env file for testing
dotenvConfig();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Global setup runs once before all tests to discover and warm up chutes
    globalSetup: ['./tests/setup/global-warmup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.config.ts',
      ],
    },
  },
});

