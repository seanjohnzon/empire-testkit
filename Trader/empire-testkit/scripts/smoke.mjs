const need = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
let ok = true;
for (const k of need) {
  if (!process.env[k]) { console.error(`ENV MISSING: ${k}`); ok = false; }
}
if (!ok) process.exit(2);

const base = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const fnName = process.env.SMOKE_FN || "claim-rewards";
const url = `${base}/functions/v1/${fnName}`;

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type":"application/json", "Authorization": `Bearer ${anon}` },
  body: JSON.stringify({ walletAddress: process.env.TEST_WALLET || "27iC4pJHhc4ZnAsbmAPFHV6deWz3BWWqD9QFEJxoCun9" })
}).catch(e => ({ error: e?.message || String(e) }));

if (res.error) { console.error("SMOKE network error:", res.error); process.exit(3); }
if ([200,201,409,400].includes(res.status)) { console.log("SMOKE PASS", res.status); process.exit(0); }
console.error("SMOKE FAIL status", res.status);
process.exit(4);


