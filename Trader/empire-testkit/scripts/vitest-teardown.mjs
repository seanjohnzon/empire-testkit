import fs from 'node:fs';
import path from 'node:path';

export default async function teardown() {
  try {
    const REPORT_DIR = path.join(process.cwd(), 'reports');
    const SCENARIO_PATH = path.join(REPORT_DIR, 'scenarios.json');
    const LOG_LIMIT_JSON = 20_000;

    // Access global scenarios if available
    const scenarios = globalThis.__SCENARIOS__ || [];

    if (scenarios.length === 0) {
      console.log('⚠️  No scenarios captured (globalThis.__SCENARIOS__ is empty)');
      return;
    }

    fs.mkdirSync(REPORT_DIR, { recursive: true });

    // Truncate large blobs to keep report light
    const slim = scenarios.map(e => {
      const toSlim = (obj) => {
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
    
    console.log(`✅ Wrote ${scenarios.length} scenario(s) to ${SCENARIO_PATH}`);
  } catch (error) {
    console.error('❌ Failed to write scenarios.json:', error.message);
  }
}


