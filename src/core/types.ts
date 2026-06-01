export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface EvalCase {
  id: string;
  input: string | Message[];
  expected?: string;
  metadata?: Record<string, unknown>;
  judgeCriteria?: string;
}

export interface ScoreResult {
  name: string;
  score: number;        // always 0.0 – 1.0
  reason?: string;
}

export interface EvalResult {
  caseId: string;
  input: string | Message[];
  output: string;
  expected?: string;
  scores: ScoreResult[];
  latencyMs: number;
  tokensUsed?: number;
  error?: string;
}

// Every scorer must implement this shape
export interface Scorer {
  name: string;
  score(output: string, expected?: string): Promise<ScoreResult>;
}

// Every model adapter must implement this shape
export interface ModelAdapter {
  call(input: string | Message[]): Promise<{ text: string; tokensUsed?: number }>;
}