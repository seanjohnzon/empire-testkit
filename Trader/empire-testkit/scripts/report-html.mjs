import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const jsonPath = path.join(ROOT, '.vitest-reports', 'json.json');
const reqMdPath = path.join(ROOT, 'reports', 'requirements.md');
const scenPath = path.join(ROOT, 'reports', 'scenarios.json');
const outDir = path.join(ROOT, 'reports');
const outHtml = path.join(outDir, 'index.html');
const outTxt = path.join(outDir, 'full-report.txt');

fs.mkdirSync(outDir, { recursive: true });

function readJSON(p, def={}) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return def; } }
function readText(p, def='') { try { return fs.readFileSync(p,'utf8'); } catch { return def; } }

const rep = readJSON(jsonPath, {});
const scenarios = readJSON(scenPath, []);
const reqMd = readText(reqMdPath, '');

const tests = [];
(rep?.testResults || rep?.tests || []).forEach((suite) => {
  const suiteName = suite?.name || suite?.file || 'suite';
  const arr = suite?.assertionResults || suite?.tests || [];
  arr.forEach(t => {
    const full = t?.fullName || `${suiteName} :: ${t?.title || ''}`;
    const m = full.match(/REQ-\d{3,4}/g) || [];
    
    tests.push({
      suite: suiteName,
      title: t?.title || full,
      fullName: full,
      reqs: m,
      status: t?.status || (t?.error ? 'failed' : 'passed'),
      duration: t?.duration || 0,
      error: t?.error?.message || null,
    });
  });
});

const total = tests.length;
const passed = tests.filter(t => t.status === 'passed').length;
const failed = total - passed;

// REQ matrix with test mapping
const reqStatus = new Map();
const reqTests = new Map();
tests.forEach(t => {
  t.reqs.forEach(r => {
    const obj = reqStatus.get(r) || { passed:0, failed:0 };
    obj[t.status === 'passed' ? 'passed' : 'failed']++;
    reqStatus.set(r, obj);
    
    if (!reqTests.has(r)) reqTests.set(r, []);
    reqTests.get(r).push(t);
  });
});
const reqKeys = Array.from(reqStatus.keys());
const completion = reqKeys.length
  ? Math.round((reqKeys.filter(k => {
      const s = reqStatus.get(k);
      return s.passed > 0 && s.failed === 0;
    }).length / reqKeys.length) * 100)
  : (passed && !failed ? 100 : 0);

// Group scenarios by function name
const scenariosByFunction = {};
scenarios.forEach(s => {
  if (!scenariosByFunction[s.name]) scenariosByFunction[s.name] = [];
  scenariosByFunction[s.name].push(s);
});

// CSS
const css = `
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial; margin: 24px; color: #0b0b0b; background: #f8fafc; }
  h1 { margin-bottom: 4px; font-size: 28px; }
  .sub { color: #64748b; margin: 0 0 20px; font-size: 14px; }
  .header { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
  .card { background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  thead { background: #f8fafc; }
  th { text-align: left; padding: 10px 14px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .pill { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; display: inline-block; }
  .ok { background: #dcfce7; color: #15803d; }
  .fail { background: #fee2e2; color: #dc2626; }
  .muted { color: #94a3b8; font-size: 13px; }
  pre { white-space: pre-wrap; background: #fafafa; padding: 12px; border-radius: 8px; border: 1px solid #eee; margin: 8px 0; font-size: 12px; max-height: 400px; overflow: auto; font-family: 'Monaco', 'Courier New', monospace; }
  .footer { margin-top: 28px; text-align: center; color: #94a3b8; font-size: 12px; }
  .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .stat-row:last-child { border-bottom: none; }
  .stat-label { color: #64748b; font-size: 13px; }
  .stat-value { font-weight: 600; font-size: 15px; }
  .completion { color: #3b82f6; font-weight: 700; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: 'Monaco', monospace; color: #475569; }
  
  /* Expandable row styles */
  .expandable-row { display: none; border-bottom: 2px solid #e2e8f0; }
  .expandable-row.expanded { display: table-row; }
  .expandable-content { padding: 20px; background: #f8fafc; }
  .expand-btn { 
    cursor: pointer; 
    padding: 4px 8px; 
    background: #eff6ff; 
    border: 1px solid #bfdbfe; 
    border-radius: 6px; 
    font-size: 11px;
    font-weight: 500;
    color: #3b82f6;
    display: inline-block;
    user-select: none;
  }
  .expand-btn:hover { 
    background: #dbeafe; 
    border-color: #93c5fd;
  }
  
  /* Nested test item */
  .test-item {
    background: white;
    border-left: 3px solid #3b82f6;
    border-radius: 6px;
    margin: 8px 0;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .test-item.failed {
    border-left-color: #dc2626;
  }
  .test-item.passed {
    border-left-color: #15803d;
  }
  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .scenario-detail { 
    background: #fafbfc; 
    padding: 12px; 
    border-radius: 6px; 
    margin: 8px 0; 
    border: 1px solid #e2e8f0;
  }
  .scenario-detail h4 {
    margin: 0 0 10px 0;
    font-size: 13px;
    color: #475569;
  }
  .detail-row {
    margin: 6px 0;
    font-size: 13px;
  }
  .detail-label {
    font-weight: 600;
    color: #64748b;
    display: inline-block;
    min-width: 90px;
  }
  .download-btn { 
    display: inline-block; 
    padding: 8px 16px; 
    background: #3b82f6; 
    color: white; 
    text-decoration: none; 
    border-radius: 8px; 
    font-size: 14px; 
    font-weight: 500; 
    margin: 16px 0; 
  }
  .download-btn:hover { 
    background: #2563eb; 
  }
  .error-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 3px solid #dc2626;
    padding: 12px;
    border-radius: 6px;
    margin: 8px 0;
  }
  .error-box h4 {
    margin: 0 0 8px 0;
    color: #dc2626;
    font-size: 13px;
  }
  .test-details {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: none;
  }
  .test-details.expanded {
    display: block;
  }
`;

function donutSVG(passed, total) {
  const r = 60, c = 2*Math.PI*r;
  const passOffset = c * (1 - (passed/total || 0));
  return `
  <svg width="180" height="180" viewBox="0 0 160 160">
    <circle cx="80" cy="80" r="${r}" stroke="#e2e8f0" stroke-width="18" fill="none"/>
    <circle cx="80" cy="80" r="${r}" stroke="#10b981" stroke-width="18" fill="none"
            stroke-dasharray="${c}" stroke-dashoffset="${passOffset}" transform="rotate(-90 80 80)"
            style="transition: stroke-dashoffset 0.5s ease;"/>
    <text x="80" y="75" text-anchor="middle" font-size="24" font-weight="700" fill="#0f172a">${passed}/${total}</text>
    <text x="80" y="98" text-anchor="middle" font-size="13" fill="#64748b">passed</text>
  </svg>`;
}

function escapeHTML(s='') { return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

// Generate requirement rows with nested tests and scenarios
const reqRows = (reqKeys.length ? reqKeys : ['(no REQ tags found)']).map((r, idx) => {
  if (r === '(no REQ tags found)') return `<tr><td colspan="4" class="muted">${r}</td></tr>`;
  
  const s = reqStatus.get(r) || {passed:0, failed:0};
  const pill = s.failed ? `<span class="pill fail">failing</span>` : (s.passed ? `<span class="pill ok">passing</span>` : `<span class="pill">untested</span>`);
  const relatedTests = reqTests.get(r) || [];
  const expandRowId = `req-expand-${idx}`;
  
  // Build nested test items with scenarios
  const testItems = relatedTests.map((t, tIdx) => {
    const statusClass = t.status === 'passed' ? 'passed' : 'failed';
    const statusIcon = t.status === 'passed' ? '✓' : '✗';
    const statusPill = t.status === 'passed' ? `<span class="pill ok">passed</span>` : `<span class="pill fail">failed</span>`;
    const suite = t.suite.split('/').pop().replace('.spec.ts', '');
    const detailsId = `test-details-${idx}-${tIdx}`;
    
    // Find relevant scenarios for this test
    const relevantScenarios = [];
    Object.keys(scenariosByFunction).forEach(fnName => {
      const testText = `${t.fullName} ${t.suite}`.toLowerCase();
      const fnNameNormalized = fnName.replace(/-/g, ' ');
      if (testText.includes(fnName.toLowerCase()) || testText.includes(fnNameNormalized)) {
        relevantScenarios.push(...scenariosByFunction[fnName]);
      }
    });
    
    // Build scenario details
    let scenarioContent = '';
    if (t.error) {
      scenarioContent += `
        <div class="error-box">
          <h4>❌ Test Error</h4>
          <pre>${escapeHTML(t.error)}</pre>
        </div>
      `;
    }
    
    if (relevantScenarios.length > 0) {
      const uniqueScenarios = Array.from(new Set(relevantScenarios.map(s => JSON.stringify(s)))).map(s => JSON.parse(s));
      scenarioContent += `<h4 style="margin: 12px 0 8px 0; color: #475569; font-size: 13px;">📡 API Calls (${uniqueScenarios.length})</h4>`;
      
      uniqueScenarios.forEach((sc, i) => {
        const scStatusPill = sc.status >= 200 && sc.status < 300 
          ? `<span class="pill ok">${sc.status}</span>` 
          : `<span class="pill fail">${sc.status}</span>`;
        
        scenarioContent += `
          <div class="scenario-detail">
            <h4>${escapeHTML(sc.name)} ${scStatusPill} <span class="muted">${sc.durationMs}ms</span></h4>
            
            <div class="detail-row">
              <span class="detail-label">Method:</span>
              <code>${escapeHTML(sc.method)}</code>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">URL:</span>
              <code style="word-break: break-all; font-size: 11px;">${escapeHTML(sc.url)}</code>
            </div>
            
            ${sc.request && Object.keys(sc.request).length > 0 ? `
              <div class="detail-row">
                <span class="detail-label">Request:</span>
                <pre>${escapeHTML(JSON.stringify(sc.request, null, 2))}</pre>
              </div>
            ` : '<div class="detail-row"><span class="detail-label">Request:</span> <span class="muted">(empty)</span></div>'}
            
            ${sc.response ? `
              <div class="detail-row">
                <span class="detail-label">Response:</span>
                <pre>${escapeHTML(JSON.stringify(sc.response, null, 2))}</pre>
              </div>
            ` : '<div class="detail-row"><span class="detail-label">Response:</span> <span class="muted">(no response)</span></div>'}
            
            <div class="detail-row">
              <span class="detail-label">Timestamp:</span>
              <span class="muted" style="font-size: 11px;">${new Date(sc.ts).toLocaleString()}</span>
            </div>
          </div>
        `;
      });
    } else if (!t.error) {
      scenarioContent += `<div class="muted" style="padding: 8px; text-align: center; font-size: 12px;">ℹ️ No API calls captured</div>`;
    }
    
    return `
      <div class="test-item ${statusClass}">
        <div class="test-header">
          <div>
            <strong>${statusIcon} ${escapeHTML(t.title)}</strong>
            <div class="muted" style="font-size: 12px; margin-top: 2px;">${suite} • ${t.duration}ms</div>
          </div>
          <div>
            ${statusPill}
            ${scenarioContent ? `<span class="expand-btn" onclick="toggleTestDetails('${detailsId}', this)" style="margin-left: 8px;">▼ Details</span>` : ''}
          </div>
        </div>
        ${scenarioContent ? `
        <div class="test-details" id="${detailsId}">
          ${scenarioContent}
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  return `
    <tr>
      <td><strong>${r}</strong></td>
      <td>${pill}</td>
      <td class="muted">✓ ${s.passed} • ✗ ${s.failed}</td>
      <td>
        <span class="expand-btn" onclick="toggleRow('${expandRowId}', this)">▼ Tests</span>
      </td>
    </tr>
    <tr class="expandable-row" id="${expandRowId}">
      <td colspan="4">
        <div class="expandable-content">
          <h4 style="margin-top:0; color: #475569;">Tests for ${r} (${relatedTests.length})</h4>
          ${testItems}
        </div>
      </td>
    </tr>
  `;
}).join('');

// Generate full text report
const txtReport = `EMPIRE TEST REPORT
Generated: ${new Date().toLocaleString()}
${'='.repeat(80)}

SUMMARY
-------
Total Tests:  ${total}
Passed:       ${passed}
Failed:       ${failed}
REQ Complete: ${completion}%
Scenarios:    ${scenarios.length}

REQUIREMENTS STATUS
-------------------
${reqKeys.map(r => {
  const s = reqStatus.get(r) || {passed:0, failed:0};
  const status = s.failed ? 'FAILING' : (s.passed ? 'PASSING' : 'UNTESTED');
  const relatedTests = reqTests.get(r) || [];
  return `${r}: ${status} (✓${s.passed} ✗${s.failed})\n  Tests: ${relatedTests.map(t => t.title).join(', ')}`;
}).join('\n\n')}

TEST DETAILS
------------
${tests.map((t, i) => {
  const status = t.status === 'passed' ? '✓ PASSED' : '✗ FAILED';
  let details = `\n[${i+1}] ${t.title}\n    Status: ${status}\n    Duration: ${t.duration}ms\n    REQs: ${t.reqs.join(', ') || 'none'}\n    Suite: ${t.suite}`;
  
  if (t.error) {
    details += `\n    Error: ${t.error}`;
  }
  
  return details;
}).join('\n')}

ALL API CALLS
-------------
${scenarios.map((s, i) => `
[${i+1}] ${s.method} ${s.name} → ${s.status} (${s.durationMs}ms)
    URL: ${s.url}
    Time: ${new Date(s.ts).toLocaleString()}
    Request: ${JSON.stringify(s.request)}
    Response: ${JSON.stringify(s.response)}
`).join('\n')}

${'='.repeat(80)}
End of Report
`;

fs.writeFileSync(outTxt, txtReport, 'utf8');

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Empire Test Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>${css}</style>
  <script>
    function toggleRow(rowId, btn) {
      const row = document.getElementById(rowId);
      if (row.classList.contains('expanded')) {
        row.classList.remove('expanded');
        btn.textContent = '▼ Tests';
      } else {
        row.classList.add('expanded');
        btn.textContent = '▲ Hide';
      }
    }
    
    function toggleTestDetails(detailsId, btn) {
      const details = document.getElementById(detailsId);
      if (details.classList.contains('expanded')) {
        details.classList.remove('expanded');
        btn.textContent = '▼ Details';
      } else {
        details.classList.add('expanded');
        btn.textContent = '▲ Hide';
      }
    }
  </script>
</head>
<body>
  <div class="header">
    <h1>🎯 Empire Test Report</h1>
    <div class="sub">Generated: ${new Date().toLocaleString()} • ${total} tests • ${scenarios.length} API calls • ${completion}% REQ complete</div>
    <a href="full-report.txt" download class="download-btn">📥 Download Full Text Report for AI</a>
  </div>

  <div class="grid">
    <div class="card" style="text-align:center;">
      ${donutSVG(passed, total)}
      <div style="margin-top:14px; text-align:left;">
        <div class="stat-row">
          <span class="stat-label">Total Tests</span>
          <span class="stat-value">${total}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">✓ Passed</span>
          <span class="stat-value" style="color:#10b981">${passed}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">✗ Failed</span>
          <span class="stat-value" style="color:#dc2626">${failed}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">REQ Completion</span>
          <span class="stat-value completion">${completion}%</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">API Calls</span>
          <span class="stat-value">${scenarios.length}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0; font-size:16px;">📋 Requirements Status</h3>
      <p class="muted" style="margin-bottom:16px;">
        Everything in one place: Click "▼ Tests" → See all tests → Click "▼ Details" → See API logs
      </p>
      <table>
        <thead>
          <tr>
            <th>Requirement</th>
            <th>Status</th>
            <th>Counts</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${reqRows}</tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0; font-size:16px;">📄 Requirements Coverage</h3>
    <pre>${escapeHTML(reqMd)}</pre>
  </div>

  <div class="footer">
    © Empire Testkit • Vitest + Node.js • Nested REQ → Test → API reporting
  </div>
</body>
</html>`;

fs.writeFileSync(outHtml, html, 'utf8');
console.log('✨ HTML report written to', outHtml);
console.log('📄 Full text report written to', outTxt);
console.log(`📊 Report includes ${tests.length} tests and ${scenarios.length} API call scenarios - all nested!`);

// Auto-open the HTML report in default browser
import { exec } from 'node:child_process';
const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
exec(`${openCmd} "${outHtml}"`, (err) => {
  if (err) {
    console.log('💡 Open manually:', outHtml);
  } else {
    console.log('🌐 Opening report in browser...');
  }
});
