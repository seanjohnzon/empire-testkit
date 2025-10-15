import { promises as fs } from "fs";
import path from "path";
import { REQUIREMENTS } from "../requirements.js";
type Result = { id: string; passed: boolean; details?: string };
(async () => {
  const p = path.join(process.cwd(), "tests", ".results.json");
  const exists = await fs.stat(p).then(()=>true).catch(()=>false);
  const results: Result[] = exists ? JSON.parse(await fs.readFile(p,"utf8")) : [];
  const map = new Map(results.map(r=>[r.id, r]));
  const passed = REQUIREMENTS.filter(r => map.get(r.id)?.passed).length;
  const total = REQUIREMENTS.length;
  const percent = total ? Math.round((passed/total)*100) : 0;
  await fs.writeFile("report.json", JSON.stringify({ total, passed, percent, results }, null, 2));
  console.log(`Completed: ${passed}/${total} (${percent}%)`);
  for (const r of REQUIREMENTS) console.log(`${map.get(r.id)?.passed ? "✅" : "❌"} ${r.id} - ${r.title}`);
})();
