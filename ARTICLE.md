# We benchmarked five frontier models as coding agents. All of them can code. That is not what separates them.

Last week we gave five frontier models the same job: here is a small JavaScript project, here is a bug report, there are four tools, go fix it. Claude Opus 4.8, Claude Sonnet 5, Claude Fable 5, GPT-5.5, and GPT-5.3 Codex each ran 82 times against 18 tasks, first with the test suite available and then without it, 410 runs in total, every one traced into Latitude. We expected a ranking of who fixes bugs best. Instead, everyone fixed the bugs, and the real differences showed up in things no leaderboard measures: what a solved task costs, how fast it lands, and whether the model agrees to do the work at all.

Two disclosures belong ahead of the numbers. The harness was built and operated by Claude Fable 5 running as a coding agent, and Fable 5 is also a contestant. The benchmark tasks themselves were authored by Claude-based agents as well, which is a bias we cannot fully rule out, so the harness, every task, and the raw per-run results ship in the repo for anyone who wants to check the work or point it at different models.

## The setup

Each task is a real, small library with one planted bug and a test suite that fails because of it. The easy tier is twelve single-file bugs, such as an LRU cache that forgets to refresh recency on reads. The hard tier is six multi-file projects where the defect is a broken contract between modules, such as a pricing module that returns a discount fraction while the totals module subtracts it as cents. A run counts as solved only when the full suite passes against pristine test files, so a model that edits a test to force a pass gets caught and flagged.

The agent loop is deliberately plain: Vercel AI SDK, four tools (list files, read file, write file, run tests), a 24-step budget, default settings for every model. Pricing comes from models.dev. Each run streams into Latitude tagged with its model, task, and trial, the model id doubles as the user id, and the run's outcome is pushed back onto its trace as a score, so every claim in this post is a query, not a recollection.

## With a test suite in reach, everybody solves everything

All five models solved 100 percent of the runs they attempted, on both tiers. Multi-file bugs did not slow anyone down. Out of 2,204 tool calls in the benchmark there was not a single malformed call, wrong tool, or bad path, and not one model ever touched a test file. Whether these models can use tools correctly is simply no longer an interesting question.

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

Five of the six tasks still got solved by everyone. In the end, one single bug was all that separated the models. The project is a small event bus, and its once-wrapper looks like this:

```js
export function once(bus, event, handler, options) {
  const unsubscribe = bus.subscribe(
    event,
    (payload) => {
      unsubscribe()
      handler(payload)
    },
    options,
  )
  return unsubscribe
}
```

The bus takes a snapshot of the listener list at the start of every emit, so unsubscribing during dispatch does not remove you from an emit that is already in flight. For ordinary sequential emits that never matters. But when a listener emits the same event again from inside its own handler, the wrapper runs in the inner dispatch, unsubscribes, and then runs a second time anyway, because the outer dispatch is still walking a snapshot taken before the unsubscribe. The fix has to go in the wrapper, with a fired guard, and the test suite pins the bus's snapshot semantics with its own tests, so patching the bus instead breaks other behavior. Diagnosing this requires holding both files' semantics in your head at once and simulating a re-entrant call, with no test to confirm the theory.

The first pass ran every blind task three times per model, and this bug was the only one where anyone failed, so we reran it at thirteen trials per model to make sure we were looking at a real difference and not a coin flip:

| Model | Blind solves on the event-bus bug |
| --- | --- |
| GPT-5.5 | 13/13 |
| GPT-5.3 Codex | 7/13 |
| Claude Sonnet 5 | 5/13 |
| Claude Fable 5 | 4/13 |
| Claude Opus 4.8 | 3/13 |

GPT-5.5 against the rest of the field pooled comes out at p = 0.00002 on a Fisher exact test, so this is not sampling luck. It also scrambles the pricing intuition: the cheapest model in the lineup is the second-best blind diagnostician, and the most expensive is the worst.

That is the shape of the frontier right now. The gap between these models is not whether they can fix bugs. It is whether they can reason through a genuinely tricky bug with nothing to check their answer against, and you only pay for that gap when no test can tell the model it is wrong. If your pipeline gives agents a failing test to iterate against, the $0.018 model and the $0.144 model produce the same outcome, and the discriminating case is rare enough that we had to engineer it on purpose.

## The observability layer caught our own cost bug

Midway through, we cross-checked the harness's cost accounting against Latitude's independent per-trace cost tracking. The Anthropic numbers matched to the cent. The OpenAI numbers did not: our harness said GPT-5.3 Codex had spent $0.65 when Latitude said $0.49.

The cause was prompt caching. OpenAI applies it transparently, and by the end of the benchmark 54 percent of Codex's input tokens and 38 percent of GPT-5.5's were cache reads billed at a tenth of the normal rate. The AI SDK reports those tokens in a field our cost function was not reading, so we were pricing them at full rate and overstating Codex's spend by a third. Claude models showed the mirror image: their cache requires explicit opt-in that our harness never configured, so they paid full price on every token. Two lessons came out of one discrepancy: provider cache defaults change agent economics materially, and a benchmark that computes its own metrics needs an independent source of truth watching it.

## The model that didn't show up

Claude Fable 5 has the same headline behavior as the rest: when it ran, the only bugs it ever missed were blind attempts at the event-bus task, and it solved 44 of the 53 runs it attempted. It was also the slowest at roughly 30 seconds per task and by far the most expensive.

But 29 of its 82 runs never happened. The response came back with a content-filter finish reason (as surfaced by the AI SDK), usually on the very first step, before a single tool call, in response to prompts like a JSON Patch library whose rollback leaves the document half-modified. Nine output tokens, no message, no work.

We spent the afternoon trying to pin down the trigger, and the honest answer is that we could not. The refusals are not random noise per request: within one six-minute window, 54 percent of runs refused, and specific tasks refused three out of three. They are not stable over time either: the same account then ran 18 consecutive runs with zero refusals in the following three minutes, and an exact replica of one of those successful configurations refused three out of three when we retried it ninety minutes later. They are not explained by any single variable we tested: we swapped the instruction wording, removed the test files, removed the test-running tool, and combined those, and every variant refused in some windows and worked in others. Strangest of all, while an exact SDK replica was refusing, a near-identical request sent straight to the Anthropic HTTP API, same bug report, slightly different system text and tool list, worked normally in the same minute. The full probe matrix is a script in the repo, and we would genuinely welcome an explanation, because we cannot rule out account-level state, fleet-side changes, or something about the request shape we did not think to vary.

We are not in a position to say what Anthropic's safety layer is doing internally, and Fable 5 is explicitly documented as carrying extra safety measures, so some refusal surface is expected behavior for this model. What we can say is operational: on this workload, on this day, on this account, it declined 40 percent of ordinary bug-fix requests, at rates that swung between zero and one hundred percent within the hour, and nothing in the prompts predicts which. A model like that has a reliability ceiling no capability score captures. If it is in your stack, your traces need to be watching finish reasons, because your users will find this behavior before your eval suite does.

## What this benchmark does not tell you

The scope here is narrow on purpose, and the conclusions should not travel beyond it. Every task is a small library, 25 to 250 lines, with exactly one planted bug and a bug report that includes a reproduction, which is the friendliest possible framing of "coding agent." Nothing here says anything about repo-scale work, ambiguous requirements, or changes that need design judgment. The tasks were written by Claude-based agents, so a family-level bias in what counts as a natural bug is possible. Every model ran with default settings, no reasoning-effort or temperature sweeps, on a single day from a single region at concurrency four, and the wall-time numbers include local test execution. Gemini 3.1 Pro was in the original lineup and is absent only because our Google API key had no billing attached; we will add it when that is fixed. And with three trials per model per task on most cells, small differences are noise, which is exactly why we reran the one discriminating task at a larger trial count before writing about it.

## What we'd actually do with these numbers

For this class of task, wire your agents to a verification loop and buy the cheap model. Every task where the agent could run the tests was solved by the cheapest model in the lineup at a flat $0.018 per fix, and the expensive models added nothing but latency and cost. Save the flagship spend for work where nothing can tell the agent it is wrong, because that is the only place we could measure a quality difference at all. And treat refusal rate as a first-class production metric alongside cost and latency, measured on your own traffic, because none of the three findings above appears on any public leaderboard.

The harness, the tasks, the per-run results, and the refusal probes are all in [the repo](https://github.com/latitude-dev/coding-agent-benchmark), and the whole benchmark cost $27 in API spend. Point it at whatever models you are choosing between; the numbers that matter are the ones from your own workload.
