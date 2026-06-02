# ScorEngine: LLM Evaluation Framework

A modular, CLI-based framework for evaluating and benchmarking Large Language Model outputs — built in TypeScript.

Instead of manually checking if an LLM's response is correct, this framework automates scoring across entire datasets, tracks quality over time, and compares model runs side by side.

---

## Why this exists

When you build with LLMs, you need to answer: *"Is this model actually good at my task?"*

Manual checking doesn't scale. This framework lets you define test cases, run them against any LLM, score the outputs automatically, and detect if quality drops between runs — the same way software engineers run unit tests before shipping code.

---

## Features

- **3 pluggable scorer types** — exact match, contains match, and LLM-as-judge (uses an LLM to score another LLM's output)
- **Dataset pipeline** — load test cases from JSONL or CSV with schema validation
- **Batched execution** — rate-limit-aware with auto-retry on 503/429 errors
- **Per-case judge criteria** — each test case can define its own scoring criteria
- **Regression detection** — diff two eval runs and flag score drops above a threshold
- **Dual reporting** — structured JSON output + visual HTML report
- **4-command CLI** — `run`, `compare`, `diff`, and more

---

## Project Structure
src/
├── cli/
│   └── run.ts              # CLI entry point (commander)
├── compare/
│   ├── head-to-head.ts     # Run same dataset on 2 models, compare results
│   └── regression.ts       # Diff two JSON result files, flag regressions
├── core/
│   ├── evaluator.ts        # Wires adapter + scorers, runs a single eval case
│   ├── runner.ts           # Gemini model adapter with retry logic
│   └── types.ts            # Core interfaces: EvalCase, EvalResult, Scorer, ModelAdapter
├── datasets/
│   ├── loader.ts           # Load JSONL or CSV datasets from disk
│   └── schema.ts           # Validate and parse raw dataset rows
├── reporters/
│   ├── console.ts          # Pretty terminal output with score bars
│   ├── html.ts             # Visual HTML report with score cards
│   └── json.ts             # Save structured JSON results to disk
├── scorers/
│   ├── exact.ts            # Exact string match scorer
│   ├── contains.ts         # Substring match scorer
│   └── llm-judge.ts        # LLM-as-judge scorer (G-Eval style)
├── suite.ts                # EvalSuite: runs full dataset, aggregates results
└── index.ts                # Programmatic entry point

---

## Architecture

The entire framework is built around three swappable interfaces:
ModelAdapter  →  takes input, returns LLM output
Scorer        →  takes (output, expected), returns a 0–1 score
Reporter      →  takes EvalResult[], produces an artifact

Any model, any scoring logic, and any output format can be swapped in without touching core logic.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### Installation

```bash
git clone https://github.com/Prahana21/LLM-evaluation-framework.git
cd LLM-evaluation-framework
npm install
```

### Configuration

Create a `.env` file in the root:
GEMINI_API_KEY=your-api-key-here

---

## Usage

### Run evals on a dataset

```bash
# Using JSONL dataset
npm run eval -- run --dataset ./data/qa.jsonl --scorers "contains,llm-judge"

# Using CSV dataset
npm run eval -- run --dataset ./data/qa.csv --scorers "exact,contains"

# Save results to a custom folder
npm run eval -- run --dataset ./data/qa.jsonl --output ./results/experiment-1
```

### Compare two model runs

```bash
npm run eval -- compare --dataset ./data/qa.jsonl --scorers "contains"
```

### Detect regressions between two runs

```bash
npm run eval -- diff \
  --baseline ./results/run-001.json \
  --current ./results/run-002.json \
  --threshold 0.05
```

---

## Dataset Format

### JSONL (recommended)
Each line is one eval case. `judgeCriteria` is optional and overrides the default LLM judge prompt:

```jsonl
{"id": "001", "input": "What is the capital of France?", "expected": "Paris", "judgeCriteria": "Is the answer factually correct?"}
{"id": "002", "input": "Write a haiku about TypeScript.", "judgeCriteria": "Is this a valid haiku with 5-7-5 syllable structure?"}
```

### CSV
```csv
id,input,expected
001,What is the capital of France?,Paris
002,What is 2 + 2?,4
```

---

## Sample Output
Loaded 5 eval cases from qa.jsonl
✅ Case 001
Output  : The capital of France is Paris.
Latency : 610ms
[exact_match     ] ░░░░░░░░░░ 0.00 — Expected "Paris", got "The capital..."
[contains_match  ] ██████████ 1.00 — Found "Paris" in output
[llm_judge       ] █████████░ 0.90 — Answer is correct and complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total cases   : 5
Successful    : 5
Errors        : 0
Avg latency   : 540ms
Scores by scorer:
exact_match       ██░░░░░░░░ 0.20
contains_match    ████████░░ 0.80
llm_judge         █████████░ 0.88
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Report saved to results/run-1234567890.json
🌐 HTML report saved to results/run-1234567890.html

---

## Tech Stack

- **Runtime** — Node.js + TypeScript
- **LLM** — Google Gemini 2.5 Flash (via `@google/generative-ai`)
- **CLI** — Commander.js
- **Execution** — tsx (TypeScript runner)

---

