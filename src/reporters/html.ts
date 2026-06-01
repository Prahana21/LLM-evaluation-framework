import fs from "fs";
import path from "path";
import { EvalResult } from "../core/types";

export function saveHtmlReport(results: EvalResult[], outputDir = "./results"): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const runId = `run-${Date.now()}`;
  const successful = results.filter((r) => !r.error);
  const errored = results.filter((r) => r.error);

  // Collect all scorer names
  const scorerNames = [...new Set(results.flatMap((r) => r.scores.map((s) => s.name)))];

  // Compute averages
  const avgScores: Record<string, number> = {};
  scorerNames.forEach((name) => {
    const vals = successful.flatMap((r) => r.scores.filter((s) => s.name === name).map((s) => s.score));
    avgScores[name] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  const avgLatency = successful.length
    ? Math.round(successful.reduce((s, r) => s + r.latencyMs, 0) / successful.length)
    : 0;

  const scoreColor = (score: number) => {
    if (score >= 0.8) return "#22c55e";
    if (score >= 0.5) return "#f59e0b";
    return "#ef4444";
  };

  const scoreBar = (score: number) => `
    <div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;background:#e5e7eb;border-radius:4px;height:8px">
        <div style="width:${score * 100}%;background:${scoreColor(score)};height:8px;border-radius:4px"></div>
      </div>
      <span style="font-size:12px;font-weight:600;color:${scoreColor(score)};width:32px">${score.toFixed(2)}</span>
    </div>`;

  const rows = results.map((r) => {
    const input = typeof r.input === "string" ? r.input : JSON.stringify(r.input);
    const outputPreview = r.error
      ? `<span style="color:#ef4444">ERROR: ${r.error.slice(0, 120)}</span>`
      : r.output.slice(0, 150) + (r.output.length > 150 ? "..." : "");

    const scoreCells = scorerNames.map((name) => {
      const s = r.scores.find((sc) => sc.name === name);
      if (!s) return `<td style="padding:12px 16px">—</td>`;
      return `
        <td style="padding:12px 16px">
          ${scoreBar(s.score)}
          <div style="font-size:11px;color:#6b7280;margin-top:4px">${s.reason ?? ""}</div>
        </td>`;
    }).join("");

    return `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:12px 16px;font-weight:600;color:#374151">${r.caseId}</td>
        <td style="padding:12px 16px;color:#374151;max-width:200px">${input}</td>
        <td style="padding:12px 16px;color:#374151;max-width:250px;font-size:13px">${outputPreview}</td>
        <td style="padding:12px 16px;color:#6b7280;font-size:13px">${r.latencyMs}ms</td>
        ${scoreCells}
      </tr>`;
  }).join("");

  const summaryCards = [
    { label: "Total Cases", value: results.length, color: "#6366f1" },
    { label: "Successful", value: successful.length, color: "#22c55e" },
    { label: "Errors", value: errored.length, color: "#ef4444" },
    { label: "Avg Latency", value: `${avgLatency}ms`, color: "#f59e0b" },
  ].map(({ label, value, color }) => `
    <div style="background:white;border-radius:12px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid ${color}">
      <div style="font-size:13px;color:#6b7280;margin-bottom:4px">${label}</div>
      <div style="font-size:28px;font-weight:700;color:#111827">${value}</div>
    </div>`).join("");

  const avgScoreCards = scorerNames.map((name) => {
    const score = avgScores[name];
    return `
      <div style="background:white;border-radius:12px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <div style="font-size:13px;color:#6b7280;margin-bottom:8px">${name}</div>
        ${scoreBar(score)}
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LLM Eval Report — ${runId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:hover { background: #f9fafb; }
  </style>
</head>
<body>
  <div style="max-width:1200px;margin:0 auto;padding:32px 24px">

    <!-- Header -->
    <div style="margin-bottom:32px">
      <h1 style="font-size:24px;font-weight:700;color:#111827">LLM Eval Report</h1>
      <p style="color:#6b7280;margin-top:4px">Run ID: ${runId} · ${new Date().toLocaleString()}</p>
    </div>

    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px">
      ${summaryCards}
    </div>

    <!-- Score averages -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:32px">
      ${avgScoreCards}
    </div>

    <!-- Results table -->
    <div style="background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #f3f4f6">
        <h2 style="font-size:16px;font-weight:600">Case Results</h2>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Input</th>
              <th>Output</th>
              <th>Latency</th>
              ${scorerNames.map((n) => `<th>${n}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

  </div>
</body>
</html>`;

  const outPath = path.join(outputDir, `${runId}.html`);
  fs.writeFileSync(outPath, html);
  console.log(`🌐 HTML report saved to ${outPath}`);
  return outPath;
}