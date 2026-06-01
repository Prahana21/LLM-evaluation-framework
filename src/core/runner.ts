import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message, ModelAdapter } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Extract retry delay from Gemini error message
function getRetryDelay(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/retryDelay['":\s]+(\d+)s/);
  if (match) return parseInt(match[1]) * 1000;
  if (msg.includes("503")) return 5000;   // server overload, wait 5s
  return null;
}

export class GeminiAdapter implements ModelAdapter {
  private client: GoogleGenerativeAI;
  private maxRetries: number;

  constructor(maxRetries = 3) {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.maxRetries = maxRetries;
  }

  async call(input: string | Message[]): Promise<{ text: string }> {
    const model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = typeof input === "string"
      ? input
      : input.map((m) => `${m.role}: ${m.content}`).join("\n");

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return { text: result.response.text() };
      } catch (err) {
        lastError = err;
        const delay = getRetryDelay(err);

        if (delay === null) throw err;  // non-retryable error, fail immediately

        console.log(`  ⚠️  Attempt ${attempt}/${this.maxRetries} failed. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }

    throw lastError;
  }
}