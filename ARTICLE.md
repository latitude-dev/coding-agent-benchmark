# We benchmarked five frontier models as coding agents, and capability was the boring column

Last week we gave five frontier models the same job: here is a small JavaScript project, here is a bug report, there are four tools, go fix it. Claude Opus 4.8, Claude Sonnet 5, Claude Fable 5, GPT-5.5, and GPT-5.3 Codex each ran the same 18 tasks three times, 360 runs in total, every one traced into Latitude. We expected a capability ranking. What we got instead was a tie on capability and a wide spread on the metrics nobody puts on a leaderboard: what a solved task costs, how fast it lands, and whether the model shows up at all.

One disclosure belongs ahead of the numbers. The harness was built and operated by Claude Fable 5 running as a coding agent, and Fable 5 is also a contestant. Every result below is reproducible from the repo, and the raw traces carry the evidence.

## The setup

Each task is a real, small library with one planted bug and a test suite that fails because of it. The easy tier is twelve single-file bugs, such as an LRU cache that forgets to refresh recency on reads. The hard tier is six multi-file projects where the defect is a broken contract between modules, such as a pricing module that returns a discount fraction while the totals module subtracts it as cents. A run counts as solved only when the full suite passes against pristine test files, so a model that edits a test to force a pass gets caught and flagged.

The agent loop is deliberately plain: Vercel AI SDK, four tools (list files, read file, write file, run tests), a 24-step budget, default settings for every model. Pricing comes from models.dev. Each run streams into Latitude tagged with its model, task, and trial, the model id doubles as the user id, and the run's outcome is pushed back onto its trace as a score, so every claim in this post is a query, not a recollection.

## With a test suite in reach, everybody solves everything

All five models solved 100 percent of the runs they attempted, on both tiers. Multi-file bugs did not slow anyone down. Out of 1,933 tool calls in the benchmark there was not a single malformed call, wrong tool, or bad path, and not one model ever touched a test file. Tool discipline in these agents is simply no longer an interesting question.

What varied was the bill. Cost per solved task on the hard tier:

| Model | Cost per solved task | Median wall time |
| --- | --- | --- |
| GPT-5.3 Codex | $0.018 | 12.8s |
| Claude Sonnet 5 | $0.050 | 15.3s |
| GPT-5.5 | $0.070 | 19.2s |
| Claude Opus 4.8 | $0.144 | 20.4s |

That is an 8x spread for identical outcomes. The move from single-file to multi-file bugs doubled Opus's cost per solve and did not move Codex's at all, which stayed at $0.018 across both tiers. When every model gets you the same green checkmark, paying flagship prices for routine fixes is pure waste.

## Take the tests away and one bug sorts the field

The third tier reused the six hard tasks but removed the safety net: no test files in the workspace, no way to execute code, just the bug report and the source. A hidden suite scored the fix afterward. This isolates diagnosis, because the model has to commit to a root cause it cannot verify.

Five of the six tasks still got solved by everyone. The entire benchmark's capability signal collapsed into one bug: an event bus where a once-listener double-fires only when the same event is emitted again from inside a listener, because the wrapper assumes self-removal takes effect mid-dispatch while the bus iterates a snapshot. GPT-5.5 fixed it three times out of three. Opus 4.8, Sonnet 5, Fable 5, and Codex each got it once out of three.

That is the shape of the frontier right now. The gap between these models is not "can it fix bugs," it is "can it reason about re-entrant dispatch semantics without an oracle," and you only pay for that gap when no test can tell the model it is wrong. If your pipeline gives agents a failing test to iterate against, the $0.018 model and the $0.144 model produce the same outcome, and the discriminating case is rare enough that we had to engineer it on purpose.

## The observability layer caught our own cost bug

Midway through, we cross-checked the harness's cost accounting against Latitude's independent per-trace cost tracking. The Anthropic numbers matched to the cent. The OpenAI numbers did not: our harness said GPT-5.3 Codex had spent $0.65 when Latitude said $0.49.

The cause was prompt caching. OpenAI applies it transparently, and by the end of the benchmark 54 percent of Codex's input tokens and 38 percent of GPT-5.5's were cache reads billed at a tenth of the normal rate. The AI SDK reports those tokens in a field our cost function was not reading, so we were pricing them at full rate and overstating Codex's spend by a third. Claude models showed the mirror image: their cache requires explicit opt-in that our harness never configured, so they paid full price on every token. Two lessons came out of one discrepancy: provider cache defaults change agent economics materially, and a benchmark that computes its own metrics needs an independent source of truth watching it.

## The model that didn't show up

Claude Fable 5 has the same headline behavior as the rest: when it ran, it solved everything except two blind attempts at the event-bus bug, 41 of 43. It was also the slowest at roughly 30 seconds per task and by far the most expensive.

But 29 of its 72 runs never happened. The API returned `finish_reason: content_filter`, often on the very first step, before a single tool call, in response to prompts like a JSON Patch library whose rollback leaves the document half-modified. And the refusals were not stable: 54 percent of runs refused between 10:27 and 10:33 UTC, then zero refusals across 18 consecutive runs in the following three minutes, then 100 percent of our controlled probes refused half an hour later, including an exact replica of a configuration that had just gone 18 for 18. We ran six single-variable experiments to find the prompt-level trigger and there is not one. The behavior varies over time on identical requests.

We are not in a position to say what Anthropic's safety layer is doing internally, and Fable 5 is explicitly documented as carrying extra safety measures. What we can say is operational: a model that refuses 40 percent of legitimate work, at rates that swing between zero and one hundred percent within an hour, has a reliability ceiling no capability score captures. If it is in your stack, your traces need to be watching `finish_reason`, because your users will find this behavior before your eval suite does.

## What we'd actually do with these numbers

Wire your agents to a verification loop and buy the cheap model. Everything with a test oracle in this benchmark was solved by the cheapest model in the lineup at a flat $0.018 per fix, and the expensive models added nothing but latency and cost. Save the flagship spend for work where nothing can tell the agent it is wrong, because that is the only place we could measure a quality difference at all. And treat refusal rate as a first-class production metric alongside cost and latency, measured on your own traffic, because none of the three findings above appears on any public leaderboard.

The harness, tasks, and analysis are in the repo, and the whole run cost $23 in API spend. Point it at whatever models you are choosing between; the numbers that matter are the ones from your own workload.
