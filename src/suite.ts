import { Evaluator } from "./core/evaluator";
import { EvalCase, EvalResult, ModelAdapter, Scorer } from "./core/types";
import { printResult, printSummary } from "./reporters/console";
import { saveReport } from "./reporters/json";
import { saveHtmlReport } from "./reporters/html";
interface SuiteOptions {
  adapter: ModelAdapter;
  scorers: Scorer[];
  dataset: EvalCase[];
  saveResults?: boolean;
  concurrency?: number;
  outputDir?: string;         // ← new
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EvalSuite {
  private evaluator: Evaluator;
  private dataset: EvalCase[];
  private saveResults: boolean;
  private concurrency: number;
  private outputDir: string;  // ← new

  constructor(options: SuiteOptions) {
    this.evaluator = new Evaluator(options.adapter, options.scorers);
    this.dataset = options.dataset;
    this.saveResults = options.saveResults ?? true;
    this.concurrency = options.concurrency ?? 1;
    this.outputDir = options.outputDir ?? "./results";  // ← new
  }

  async run(): Promise<EvalResult[]> {
    const results: EvalResult[] = [];

    for (let i = 0; i < this.dataset.length; i += this.concurrency) {
      const batch = this.dataset.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map((c) => this.evaluator.run(c))
      );

      batchResults.forEach((r) => {
        printResult(r);
        results.push(r);
      });

      if (i + this.concurrency < this.dataset.length) {
        console.log("⏳ Waiting 15s for rate limit...\n");
        await sleep(15000);
      }
    }

    printSummary(results);

    if (this.saveResults) {
      saveReport(results, this.outputDir);  // ← pass outputDir
      saveHtmlReport(results, this.outputDir);
    }

    return results;
  }
}