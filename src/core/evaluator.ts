import { EvalCase, EvalResult, ModelAdapter, Scorer } from "./types";

// Extend Scorer interface to support per-case criteria
export interface ScorerWithCriteria extends Scorer {
  scoreWithCriteria?: (output: string, expected?: string, criteria?: string) => Promise<import("./types").ScoreResult>;
}

export class Evaluator {
  constructor(
    private adapter: ModelAdapter,
    private scorers: Scorer[]
  ) {}

  async run(evalCase: EvalCase): Promise<EvalResult> {
    const start = Date.now();

    try {
      const { text, tokensUsed } = await this.adapter.call(evalCase.input);
      const latencyMs = Date.now() - start;

      const scores = await Promise.all(
        this.scorers.map((s) => {
          // If scorer supports per-case criteria and case has judgeCriteria, use it
          const scorerWithCriteria = s as ScorerWithCriteria;
          if (scorerWithCriteria.scoreWithCriteria && evalCase.judgeCriteria) {
            return scorerWithCriteria.scoreWithCriteria(text, evalCase.expected, evalCase.judgeCriteria);
          }
          return s.score(text, evalCase.expected);
        })
      );

      return {
        caseId: evalCase.id,
        input: evalCase.input,
        output: text,
        expected: evalCase.expected,
        scores,
        latencyMs,
        tokensUsed,
      };
    } catch (err) {
      return {
        caseId: evalCase.id,
        input: evalCase.input,
        output: "",
        expected: evalCase.expected,
        scores: [],
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}