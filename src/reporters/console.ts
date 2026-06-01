import { EvalResult } from "../core/types";

export function printResult(result: EvalResult): void {
  const status = result.error ? "❌ ERROR" : "✅";
  console.log(`${status} Case ${result.caseId}`);

  if (result.error) {
    console.log(`   Error: ${result.error}`);
    return;
  }

  const preview = result.output.length > 80
    ? result.output.slice(0, 80) + "..."
    : result.output;

  console.log(`   Output  : ${preview}`);
  console.log(`   Latency : ${result.latencyMs}ms`);

  result.scores.forEach((s) => {
    const bar = "█".repeat(Math.round(s.score * 10)).padEnd(10, "░");
    console.log(`   [${s.name.padEnd(15)}] ${bar} ${s.score.toFixed(2)} — ${s.reason}`);
  });

  console.log();
}

export function printSummary(results: EvalResult[]): void {
  const total = results.length;
  const errored = results.filter((r) => r.error).length;
  const successful = results.filter((r) => !r.error);

  const avgLatency = successful.length > 0
    ? Math.round(successful.reduce((sum, r) => sum + r.latencyMs, 0) / successful.length)
    : 0;

  // Average score per scorer
  const scorerTotals: Record<string, number[]> = {};
  successful.forEach((r) => {
    r.scores.forEach((s) => {
      if (!scorerTotals[s.name]) scorerTotals[s.name] = [];
      scorerTotals[s.name].push(s.score);
    });
  });

  console.log("━".repeat(50));
  console.log("📊 SUMMARY");
  console.log("━".repeat(50));
  console.log(`Total cases   : ${total}`);
  console.log(`Successful    : ${successful.length}`);
  console.log(`Errors        : ${errored}`);
  console.log(`Avg latency   : ${avgLatency}ms`);
  console.log();
  console.log("Scores by scorer:");
  Object.entries(scorerTotals).forEach(([name, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bar = "█".repeat(Math.round(avg * 10)).padEnd(10, "░");
    console.log(`  ${name.padEnd(17)} ${bar} ${avg.toFixed(2)}`);
  });
  console.log("━".repeat(50));
}