import { Scorer, ScoreResult } from "../core/types";

export const containsMatch: Scorer = {
  name: "contains_match",
  async score(output: string, expected?: string): Promise<ScoreResult> {
    if (!expected) {
      return { name: "contains_match", score: 0, reason: "No expected value provided" };
    }
    const found = output.toLowerCase().includes(expected.toLowerCase());
    return {
      name: "contains_match",
      score: found ? 1 : 0,
      reason: found ? `Found "${expected}" in output` : `"${expected}" not found in output`,
    };
  },
};