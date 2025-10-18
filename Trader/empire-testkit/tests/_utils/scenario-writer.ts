import { afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPORT_DIR = path.join(process.cwd(), 'reports');
const SCENARIO_PATH = path.join(REPORT_DIR, 'scenarios.json');
const LOG_LIMIT_JSON = 20_000;

// Use afterAll to write scenarios when test suite completes
afterAll(() => {
  try {
    const scenarios = globalThis.__SCENARIOS__ || [];
    
    if (scenarios.length === 0) {
      return; // silently skip if no scenarios
    }

    fs.mkdirSync(REPORT_DIR, { recursive: true });

    // Read existing scenarios from file (other test files may have written already)
    let existingScenarios: any[] = [];
    try {
      const existing = fs.readFileSync(SCENARIO_PATH, 'utf8');
      existingScenarios = JSON.parse(existing);
    } catch {
      // File doesn't exist yet or invalid JSON - that's ok
    }

    // Merge new scenarios with existing ones
    const allScenarios = [...existingScenarios, ...scenarios];

    // Truncate large blobs
    const slim = allScenarios.map(e => {
      const toSlim = (obj: any) => {
        if (obj == null) return obj;
        const s = JSON.stringify(obj);
        if (s.length <= LOG_LIMIT_JSON) return obj;
        return { _truncated: true, preview: s.slice(0, LOG_LIMIT_JSON) + '…' };
      };
      return {
        ...e,
        request: toSlim(e.request),
        response: toSlim(e.response),
      };
    });

    fs.writeFileSync(SCENARIO_PATH, JSON.stringify(slim, null, 2), 'utf8');
    fs.writeFileSync(path.join(REPORT_DIR, 'last-run.txt'), new Date().toISOString(), 'utf8');
    
    console.log(`✅ Wrote ${scenarios.length} scenario(s) (${allScenarios.length} total)`);
  } catch (error: any) {
    console.error('❌ Failed to write scenarios.json:', error.message);
  }
}, 10000); // 10 second timeout for cleanup
