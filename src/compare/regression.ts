import fs from "fs";
import path from "path";
import { RunReport } from "../reporters/json";

interface RegressionResult {
  scorer: string;
  baseline: number;
  current: number;
  delta: number;
  status: "improved" | "regressed" | "stable";
}

interface CaseDiff {
  caseId: string;
  scorer: string;
  baseline: number;
  current: number;
  delta: number;
}

function loadReport(filePath: string): RunReport {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) throw new Error(`Report not found: ${fullPath}`);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as RunReport;
}

export function detectRegressions(
  baselinePath: string,
  currentPath: string,
  threshold = 0.05   // flag if score drops more than 5%
): void {
  const baseline = loadReport(baselinePath);
  const current = loadReport(currentPath);

  console.log("\n" + "━".repeat(60));
  console.log("🔍 REGRESSION REPORT");
  console.log("━".repeat(60));
  console.log(`Baseline : ${baseline.runId} (${baseline.timestamp})`);
  console.log(`Current  : ${current.runId} (${current.timestamp})`);
  console.log("━".repeat(60));

  // ── Overall score comparison ───────────────────────────
  console.log("\n📊 Overall Score Changes:\n");

  const allScorers = Object.keys(baseline.summary.avgScores);
  const regressions: RegressionResult[] = allScorers.map((scorer) => {
    const base = baseline.summary.avgScores[scorer] ?? 0;
    const curr = current.summary.avgScores[scorer] ?? 0;
    const delta = curr - base;
    const status =
      delta > threshold ? "improved"
      : delta < -threshold ? "regressed"
      : "stable";
    return { scorer, baseline: base, current: curr, delta, status };
  });

  regressions.forEach(({ scorer, baseline: b, current: c, delta, status }) => {
    const icon = status === "improved" ? "✅" : status === "regressed" ? "❌" : "➖";
    const deltaStr = (delta >= 0 ? "+" : "") + delta.toFixed(3);
    console.log(
      `  ${icon} ${scorer.padEnd(20)} ${b.toFixed(3)} → ${c.toFixed(3)}  (${deltaStr})`
    );
  });

  // ── Per-case diffs ─────────────────────────────────────
  console.log("\n📋 Per-Case Diffs (changed cases only):\n");

  const caseDiffs: CaseDiff[] = [];

  current.results.forEach((currResult) => {
    const baseResult = baseline.results.find((r) => r.caseId === currResult.caseId);
    if (!baseResult) return;

    currResult.scores.forEach((currScore) => {
      const baseScore = baseResult.scores.find((s) => s.name === currScore.name);
      if (!baseScore) return;

      const delta = currScore.score - baseScore.score;
      if (Math.abs(delta) > threshold) {
        caseDiffs.push({
          caseId: currResult.caseId,
          scorer: currScore.name,
          baseline: baseScore.score,
          current: currScore.score,
          delta,
        });
      }
    });
  });

  if (caseDiffs.length === 0) {
    console.log("  No significant per-case changes detected.\n");
  } else {
    console.log(
      `${"Case".padEnd(8)} ${"Scorer".padEnd(20)} ${"Baseline".padEnd(10)} ${"Current".padEnd(10)} Delta`
    );
    console.log("─".repeat(55));
    caseDiffs.forEach(({ caseId, scorer, baseline: b, current: c, delta }) => {
      const icon = delta > 0 ? "✅" : "❌";
      const deltaStr = (delta >= 0 ? "+" : "") + delta.toFixed(3);
      console.log(
        `${caseId.padEnd(8)} ${scorer.padEnd(20)} ${b.toFixed(3).padEnd(10)} ${c.toFixed(3).padEnd(10)} ${icon} ${deltaStr}`
      );
    });
  }

  // ── Final verdict ──────────────────────────────────────
  const hasRegressions = regressions.some((r) => r.status === "regressed");
  console.log("\n" + "━".repeat(60));
  if (hasRegressions) {
    console.log("❌ VERDICT: Regressions detected — review before deploying");
  } else {
    console.log("✅ VERDICT: No regressions detected");
  }
  console.log("━".repeat(60) + "\n");
}