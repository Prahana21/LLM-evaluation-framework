#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { GeminiAdapter } from "../core/runner";
import { EvalSuite } from "../suite";
import { headToHead } from "../compare/head-to-head";
import { loadDataset } from "../datasets/loader";
import { exactMatch } from "../scorers/exact";
import { containsMatch } from "../scorers/contains";
import { createLLMJudge } from "../scorers/llm-judge";
import { Scorer } from "../core/types";
import { detectRegressions } from "../compare/regression";
const program = new Command();

program
  .name("llm-eval")
  .description("LLM Evaluation Framework")
  .version("1.0.0");

// ── RUN command ──────────────────────────────────────────
program
  .command("run")
  .description("Run evals on a dataset")
  .requiredOption("-d, --dataset <path>", "Path to .jsonl or .csv dataset file")
  .option("-s, --scorers <list>", "Comma-separated scorers: exact,contains,llm-judge", "contains,llm-judge")
  .option("-c, --concurrency <n>", "Cases to run in parallel", "1")
  .option("-o, --output <dir>", "Directory to save results", "./results")
  .option("--no-save", "Skip saving results to file")
  .action(async (opts) => {
    const dataset = loadDataset(opts.dataset);
    const scorers = buildScorers(opts.scorers);
    const suite = new EvalSuite({
      adapter: new GeminiAdapter(),
      scorers,
      dataset,
      saveResults: opts.save,
      concurrency: parseInt(opts.concurrency),
      outputDir: opts.output,
    });
    await suite.run();
  });


// ── COMPARE command ───────────────────────────────────────
program
  .command("compare")
  .description("Compare two models head to head")
  .requiredOption("-d, --dataset <path>", "Path to dataset file")
  .option("-s, --scorers <list>", "Comma-separated scorers", "contains,llm-judge")
  .option("-o, --output <dir>", "Directory to save results", "./results")
  .action(async (opts) => {
    const dataset = loadDataset(opts.dataset);
    const scorers = buildScorers(opts.scorers);
    await headToHead({
      modelA: { name: "gemini-2.5-flash-run1", adapter: new GeminiAdapter() },
      modelB: { name: "gemini-2.5-flash-run2", adapter: new GeminiAdapter() },
      dataset,
      scorers,
      delayMs: 15000,
      outputDir: opts.output,
    });
  });

// ── HELPER ────────────────────────────────────────────────
function buildScorers(scorerList: string): Scorer[] {
  return scorerList.split(",").map((s) => {
    switch (s.trim()) {
      case "exact":     return exactMatch;
      case "contains":  return containsMatch;
      case "llm-judge": return createLLMJudge("Is this a correct and helpful answer?");
      default:
        console.warn(`Unknown scorer "${s}", skipping`);
        return containsMatch;
    }
  });
}

// ── DIFF command ──────────────────────────────────────────
program
  .command("diff")
  .description("Detect regressions between two result files")
  .requiredOption("-b, --baseline <path>", "Path to baseline JSON result file")
  .requiredOption("-c, --current <path>", "Path to current JSON result file")
  .option("-t, --threshold <n>", "Minimum score delta to flag (default 0.05)", "0.05")
  .action((opts) => {
    
    detectRegressions(opts.baseline, opts.current, parseFloat(opts.threshold));
  });
program.parse();