import { Scorer, ScoreResult } from "../core/types";

export const exactMatch: Scorer = {
  name: "exact_match",
  async score(output: string, expected?: string): Promise<ScoreResult> {
    if (!expected) {
      return { name: "exact_match", score: 0, reason: "No expected value provided" };
    }
    const match = output.trim() === expected.trim();
    return {
      name: "exact_match",
      score: match ? 1 : 0,
      reason: match ? "Output matches exactly" : `Expected "${expected}", got "${output}"`,
    };
  },
};