import { EvalCase, EvalResult, ModelAdapter, Scorer } from "../core/types";
import { Evaluator } from "../core/evaluator";
import { printSummary } from "../reporters/console";
import { saveReport } from "../reporters/json";

interface CompareOptions {
  modelA: { name: string; adapter: ModelAdapter };
  modelB: { name: string; adapter: ModelAdapter };
  dataset: EvalCase[];
  scorers: Scorer[];
  delayMs?: number;
  outputDir?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function headToHead(options: CompareOptions): Promise<void> {
  const { modelA, modelB, dataset, scorers, delayMs = 15000 } = options;
  const outDir = options.outputDir ?? "./results";

  console.log(`\n🥊 HEAD TO HEAD: ${modelA.name} vs ${modelB.name}`);
  console.log("━".repeat(50));

  // ── Run Model A ────────────────────────────────────────
  console.log(`\n🤖 Running ${modelA.name}...\n`);
  const evalA = new Evaluator(modelA.adapter, scorers);
  const resultsA: EvalResult[] = [];

  for (const c of dataset) {
    const result = await evalA.run(c);
    resultsA.push(result);
    console.log(
      `  Case ${result.caseId}: ${result.error ? "❌" : "✅"} ${
        result.scores.map((s) => `${s.name}=${s.score.toFixed(2)}`).join(" | ")
      }`
    );
    await sleep(delayMs);
  }

  // ── Run Model B ────────────────────────────────────────
  console.log(`\n🤖 Running ${modelB.name}...\n`);
  const evalB = new Evaluator(modelB.adapter, scorers);
  const resultsB: EvalResult[] = [];

  for (const c of dataset) {
    const result = await evalB.run(c);
    resultsB.push(result);
    console.log(
      `  Case ${result.caseId}: ${result.error ? "❌" : "✅"} ${
        result.scores.map((s) => `${s.name}=${s.score.toFixed(2)}`).join(" | ")
      }`
    );
    await sleep(delayMs);
  }

  // ── Print comparison ───────────────────────────────────
  printComparison(modelA.name, resultsA, modelB.name, resultsB);

  // ── Save reports ───────────────────────────────────────
  saveReport(resultsA, `${outDir}/${modelA.name}`);
  saveReport(resultsB, `${outDir}/${modelB.name}`);
}

function printComparison(
  nameA: string, resultsA: EvalResult[],
  nameB: string, resultsB: EvalResult[]
): void {
  console.log("\n" + "━".repeat(60));
  console.log("📊 COMPARISON RESULTS");
  console.log("━".repeat(60));

  // ── Per-case breakdown ─────────────────────────────────
  console.log("\nPer case breakdown:\n");
  console.log(
    `${"Case".padEnd(8)} ${"Scorer".padEnd(17)} ${nameA.padEnd(10)} ${nameB.padEnd(10)} Winner`
  );
  console.log("─".repeat(55));

  resultsA.forEach((rA, i) => {
    const rB = resultsB[i];
    if (!rB) return;

    rA.scores.forEach((sA) => {
      const sB = rB.scores.find((s) => s.name === sA.name);
      if (!sB) return;

      const winner =
        sA.score > sB.score ? `✅ ${nameA}`
        : sB.score > sA.score ? `✅ ${nameB}`
        : "🤝 Tie";

      console.log(
        `${rA.caseId.padEnd(8)} ${sA.name.padEnd(17)} ${sA.score
          .toFixed(2)
          .padEnd(10)} ${sB.score.toFixed(2).padEnd(10)} ${winner}`
      );
    });
  });

  // ── Overall averages ───────────────────────────────────
  console.log("\nOverall averages:\n");
  const scorerNames = resultsA[0]?.scores.map((s) => s.name) ?? [];

  scorerNames.forEach((scorerName) => {
    const avgA = avg(
      resultsA.flatMap((r) =>
        r.scores.filter((s) => s.name === scorerName).map((s) => s.score)
      )
    );
    const avgB = avg(
      resultsB.flatMap((r) =>
        r.scores.filter((s) => s.name === scorerName).map((s) => s.score)
      )
    );

    const winner =
      avgA > avgB ? `🏆 ${nameA}`
      : avgB > avgA ? `🏆 ${nameB}`
      : "🤝 Tie";

    console.log(
      `  ${scorerName.padEnd(17)} ${nameA}=${avgA.toFixed(2)}  ${nameB}=${avgB.toFixed(2)}  → ${winner}`
    );
  });

  console.log("\n" + "━".repeat(60));
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}