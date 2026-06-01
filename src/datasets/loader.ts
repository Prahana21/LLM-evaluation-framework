import fs from "fs";
import path from "path";
import { EvalCase } from "../core/types";
import { validateEvalCase } from "./schema";

function loadJsonl(content: string): EvalCase[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line, i) => {
      try {
        return validateEvalCase(JSON.parse(line));
      } catch (err) {
        throw new Error(`Line ${i + 1}: ${err instanceof Error ? err.message : err}`);
      }
    });
}

function loadCsv(content: string): EvalCase[] {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idIdx = headers.indexOf("id");
  const inputIdx = headers.indexOf("input");
  const expectedIdx = headers.indexOf("expected");

  if (inputIdx === -1) throw new Error('CSV must have an "input" column');

  return lines.slice(1).map((line, i) => {
    // Handle commas inside quoted fields
    const cols = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((c) =>
      c.trim().replace(/^"|"$/g, "")
    ) ?? [];

    const raw = {
      id: idIdx !== -1 ? cols[idIdx] : String(i + 1),
      input: cols[inputIdx] ?? "",
      expected: expectedIdx !== -1 ? cols[expectedIdx] : undefined,
    };

    try {
      return validateEvalCase(raw);
    } catch (err) {
      throw new Error(`Row ${i + 2}: ${err instanceof Error ? err.message : err}`);
    }
  });
}

export function loadDataset(filePath: string): EvalCase[] {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Dataset file not found: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();

  let cases: EvalCase[];

  if (ext === ".csv") {
    cases = loadCsv(content);
  } else if (ext === ".jsonl" || ext === ".json") {
    cases = loadJsonl(content);
  } else {
    throw new Error(`Unsupported file format: ${ext}. Use .jsonl or .csv`);
  }

  console.log(`Loaded ${cases.length} eval cases from ${path.basename(filePath)}\n`);
  return cases;
}