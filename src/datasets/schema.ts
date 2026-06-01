import { EvalCase } from "../core/types";

export function validateEvalCase(raw: unknown): EvalCase {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Each line must be a JSON object");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string") throw new Error(`Missing or invalid "id" in: ${JSON.stringify(obj)}`);
  if (typeof obj.input !== "string") throw new Error(`Missing or invalid "input" in: ${JSON.stringify(obj)}`);

  return {
    id: obj.id,
    input: obj.input,
    expected: typeof obj.expected === "string" ? obj.expected : undefined,
    metadata: typeof obj.metadata === "object" && obj.metadata !== null
      ? (obj.metadata as Record<string, unknown>)
      : undefined,
    judgeCriteria: typeof obj.judgeCriteria === "string" ? obj.judgeCriteria : undefined,  // ← new
  };
}