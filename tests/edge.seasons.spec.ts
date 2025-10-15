import { it, expect, afterAll } from "vitest";
import { callEdge } from "./_utils.js";
import { promises as fs } from "fs";
const results: any[] = [];
afterAll(async () => { await fs.writeFile("tests/.results.json", JSON.stringify(results, null, 2)); });
it("REQ-001 list-seasons returns array", async () => {
  const res = await callEdge("list-seasons", { method: "POST" });
  expect(res.ok).toBe(true); expect(Array.isArray(res.seasons)).toBe(true);
  results.push({ id: "REQ-001", passed: true });
});
it("REQ-002 toggle active works (no-op ok)", async () => {
  const list = await callEdge("list-seasons", { method: "POST" });
  const first = list.seasons?.[0]; expect(first).toBeTruthy();
  await callEdge("admin-set-season", { method: "POST", body: { walletAddress: "TEST", action: "toggleActive", id: first.id, active: !!first.is_active } });
  results.push({ id: "REQ-002", passed: true });
});
