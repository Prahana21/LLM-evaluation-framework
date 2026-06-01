/// <reference types="node" />
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Scorer, ScoreResult } from "../core/types";
import { ScorerWithCriteria } from "../core/evaluator";

export function createLLMJudge(defaultCriteria?: string): Scorer & ScorerWithCriteria {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  async function runJudge(output: string, expected?: string, criteria?: string): Promise<ScoreResult> {
    const activeCriteria = criteria ?? defaultCriteria ?? "accuracy, relevance, and completeness";

    const prompt = `
You are an evaluator. Score the following model output on a scale from 0.0 to 1.0.

Criteria: ${activeCriteria}
${expected ? `Expected answer: ${expected}` : ""}

Model output:
${output}

Respond ONLY with a JSON object in this exact format:
{"score": <number between 0 and 1>, "reason": "<one sentence explanation>"}
`.trim();

    try {
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();

      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { name: "llm_judge", score: 0, reason: "No JSON found in response" };

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        name: "llm_judge",
        score: Math.min(1, Math.max(0, parsed.score)),
        reason: parsed.reason,
      };
    } catch {
      return { name: "llm_judge", score: 0, reason: "Failed to parse judge response" };
    }
  }

  return {
    name: "llm_judge",
    score: (output, expected) => runJudge(output, expected),
    scoreWithCriteria: (output, expected, criteria) => runJudge(output, expected, criteria),
  };
}