import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { dir: "tests", globals: true, testTimeout: 120_000, sequence: { shuffle: false } }
});
