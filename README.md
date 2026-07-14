# Coding-agent model benchmark

This repo benchmarks frontier LLMs as coding agents on the metrics that matter in production: cost per solved task, latency, tool-call reliability, and solve rate. Every run is traced into [Latitude](https://latitude.so), so the numbers in the writeup can be sliced and audited rather than taken on faith.

## How it works

Each task in `tasks/` is a tiny JavaScript project with one planted bug. The shipped test suite fails because of the bug and passes once it is fixed. The harness gives each model the same agent loop and four tools (`list_files`, `read_file`, `write_file`, `run_tests`), points it at a sandboxed copy of the task, and lets it work for up to 24 steps.

A run counts as solved only if the full test suite passes against pristine test files. If a model edits a test to make it pass, the original tests are restored before scoring and the run is flagged as tampered.

## Running it

```bash
pnpm install
cp .env.example .env   # fill in provider keys and a Latitude API key
node src/validate-tasks.ts          # every task must fail as shipped, pass with its reference fix
pnpm bench                          # full matrix: all models x all tasks x 3 trials
pnpm bench -- --models claude-sonnet-5 --tasks 01-interval-merge --trials 1
pnpm report                         # aggregate results/results.jsonl into a table
```

Node 24+ is required (the harness is TypeScript run directly via type stripping).

## What gets measured

- **Solved**: tests pass against pristine test files
- **Cost**: token usage priced from [models.dev](https://models.dev) data, cache reads included
- **Latency**: wall time per task and time to the first tool call
- **Tool-call reliability**: malformed calls, calls to missing tools, and execution errors (bad paths, invalid input)
- **Tamper rate**: runs where the model wrote to a test file

Each run is also a full trace in Latitude, tagged with `model:*`, `task:*`, and `trial:*`, with the model id doubling as the user id so per-model analytics come for free.
