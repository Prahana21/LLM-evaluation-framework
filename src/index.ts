import "dotenv/config";
import { GeminiAdapter } from "./core/runner";
import { EvalSuite } from "./suite";
import { loadDataset } from "./datasets/loader";
import { exactMatch } from "./scorers/exact";
import { containsMatch } from "./scorers/contains";
import { createLLMJudge } from "./scorers/llm-judge";

async function main() {
  const dataset = loadDataset("./data/qa.jsonl");

  const suite = new EvalSuite({
    adapter: new GeminiAdapter(),
    scorers: [
      exactMatch,
      containsMatch,
      createLLMJudge("Is this a correct and helpful answer?"),
    ],
    dataset,
    saveResults: true,
    concurrency: 1,        // 1 at a time — safe for Gemini free tier
  });

  await suite.run();
}

main().catch(console.error);
