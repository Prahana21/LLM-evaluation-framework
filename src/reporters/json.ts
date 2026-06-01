import fs from "fs";
import path from "path";
import { EvalResult } from "../core/types";

export interface RunReport {
  runId: string;
  timestamp: string;
  totalCases: number;
  results: EvalResult[];
  summary: {
    avgLatencyMs: number;
    errorCount: number;
    avgScores: Record<string, number>;
  };
}

export function saveReport(results: EvalResult[], outputDir = "./results"): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const runId = `run-${Date.now()}`;
  const successful = results.filter((r) => !r.error);

  const avgScores: Record<string, number> = {};
  const scorerTotals: Record<string, number[]> = {};

  successful.forEach((r) => {
    r.scores.forEach((s) => {
      if (!scorerTotals[s.name]) scorerTotals[s.name] = [];
      scorerTotals[s.name].push(s.score);
    });
  });

  Object.entries(scorerTotals).forEach(([name, scores]) => {
    avgScores[name] = scores.reduce((a, b) => a + b, 0) / scores.length;
  });

  const report: RunReport = {
    runId,
    timestamp: new Date().toISOString(),
    totalCases: results.length,
    results,
    summary: {
      avgLatencyMs: successful.length > 0
        ? Math.round(successful.reduce((sum, r) => sum + r.latencyMs, 0) / successful.length)
        : 0,
      errorCount: results.filter((r) => r.error).length,
      avgScores,
    },
  };

  const outPath = path.join(outputDir, `${runId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to ${outPath}`);

  return outPath;
}