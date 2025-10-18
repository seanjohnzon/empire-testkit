import { defineConfig } from "vitest/config";
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: { 
    dir: "tests", 
    globals: true, 
    testTimeout: 120_000, 
    sequence: { shuffle: false },
    setupFiles: ['./tests/_utils/scenario-writer.ts'],
    env: loadEnv(mode, process.cwd(), ''),
  }
}));
