# I Made 5 Frontier Models Run 410 Coding Tasks. Coding Ability Is Not What Separates Them.

I decided to run a little experiment and gave five frontier models the same job: they got a small JavaScript project and a bug report, with four tools to go and fix it. The models I tested were Claude Opus 4.8, Claude Sonnet 5, Claude Fable 5, GPT-5.6 Sol, and GPT-5.6 Luna where each ran 82 times against 18 tasks, first with the test suite available and then without it, making 410 runs in total, every one traced into Latitude for observability of different metrics like cost and latency. Before carrying out the experiment I expected a ranking of who fixes bugs best. Instead, every model fixed the bugs without too much of a hassle, and the real differences showed up in performance: what a solved task costs, how fast it got there, and oddly enough whether the model agrees to do the work at all.

Two disclosures before I get to the numbers. The harness was built and operated by Claude Fable 5 running as a coding agent, and Fable 5 is also a contestant. The benchmark tasks themselves were authored by Claude-based agents as well, which is a bias that cannot be fully ruled out, so the harness, every task, and the raw per-run results ship in this repo for anyone who wants to check the work or point it at different models.

## Setup

Each coding task is a real, small library with one planted bug and a test suite that fails because of it. This was broken into two difficulty tiers. The easy tier is twelve single-file bugs, such as an LRU cache that forgets to refresh for recency on reads. The hard tier is six multi-file projects where the defect is a broken contract between modules, such as a pricing module that returns a discount fraction while the totals module subtracts it as cents. A run counts as solved only when the full suite passes against pristine test files, so a model that edits a test to force a pass gets caught and flagged.

The agent loop is pretty simple: Vercel AI SDK, four tools (list files, read file, write file, run tests), a 24-step budget, with default settings for every model. Every run streams into Latitude tagged with its model, task, and trial, the model id doubles as the user id (nicer visuals within Latitude for the experiment), and the run's outcome is pushed back onto its trace as a score, so as to make analysis queryable. Cost is Latitude's per-trace figure, priced from models.dev rates.

![Latitude sessions list of benchmark runs tagged coding-benchmark and mode:blind, with duration, cost, and model columns](screenshots/01-traces-list.png)

_Every benchmark run lands in Latitude as a tagged session. The rest of this post is queries over this list._

![A single benchmark run in Latitude showing its tags, seventeen spans, and token and cost totals](screenshots/02-single-run.png)

_One run up close: the tags that identify it, the spans of agent activity, and its token and cost totals._

## Tests Available to Agent

All five models solved 100 percent of the runs they attempted, on both difficulties. Multi-file bugs did not slow any model down. Out of 2,204 tool calls in the benchmark there was not a single malformed call, wrong tool, or bad path, and not one model ever touched a test file. Whether these models can use tools correctly isn't really interesting anymore.

However what did vary was the bill. Cost per solved task on the hard tier:

![Bar charts of cost per solved task and median time per task on the hard tier: GPT-5.6 Luna $0.010 and 9.7s, GPT-5.6 Sol $0.049 and 16.4s, Sonnet 5 $0.050 and 15.3s, Opus 4.8 $0.144 and 20.4s](charts/chart-cost-hard-tier.png)

Claude Fable 5 is missing from this table because it refused 16 of its 18 hard-tier runs, too few solves to price fairly, for a reason that gets its own section below. On the easy tier it solved all 23 runs it attempted, at $0.20 each with a 29-second median, still the slowest and priciest of the field.

**That is a 14x difference for identical outcomes.** Moving from single-file to multi-file bugs roughly doubled Opus's cost per solve while barely moving Luna's, which stayed around a penny on both tiers. When every model gets you the same green checkmark, paying flagship prices for routine fixes is wasteful to say the least.

![Latitude users view showing the five models as users, each with a session count and total cost](screenshots/03-models-as-users.png)

_Each run reports its model id as the user id, so Latitude's per-user view becomes a per-model scoreboard. The cost column carries the whole spread: $1.16 of Codex traffic against $10.68 of Fable for the same benchmark._

## Tests Hidden from Agent

The third tier reused the six hard tasks but removed the agent's ability to check its work: there were no test files in the workspace and no way to execute code. The model was restricted to the bug report and the source. A hidden suite scored the fix afterward to check how it did. The purpose of this was to isolate diagnosis, because the model has to commit to a root cause it cannot verify.

![The scores tab of a failed blind run, showing the harness's 0 percent custom score and a signal grouping hidden-suite failures](screenshots/04-custom-scores.png)

_The hidden suite's verdict lands back on the trace as a score, and a signal groups the failures, so "which model failed which task" stays queryable in Latitude._

Five of the six tasks still got solved by all of the models. In the end, there was only one bug that separated the models and I'll take a moment to explain why.

The task in question is an event bus, the little library pattern where parts of an app subscribe to named events and get called whenever one is emitted. This one ships a `once` helper with a simple task: run the handler for the first event, then never again. Here is the whole thing in code:

```js
export function once(bus, event, handler, options) {
  const unsubscribe = bus.subscribe(
    event,
    (payload) => {
      unsubscribe();
      handler(payload);
    },
    options,
  );
  return unsubscribe;
}
```

When the bus fires an event, it copies its listener list and calls each listener from that copy. The `once` wrapper unsubscribes itself and then runs your handler, which works until a handler emits the same event again while it is still running. The nested emit fires the wrapper and removes it, but the original emit is still walking the copy it took beforehand, so it runs the handler a second time and a listener meant to fire once fires twice.

The fix is a one-liner in the wrapper. Finding it is the hard part: you have to hold two files in your head and mentally run a function that calls itself, with no test in blind mode to tell you whether you got it right.

The first pass ran every blind task three times per model, and this bug was the only one where anyone failed, so I reran it at thirteen trials per model to make sure I was looking at a real difference:

![Bar chart of blind solves on the event-bus bug out of 13 trials: GPT-5.6 Sol 13, GPT-5.6 Luna 13, Sonnet 5 5, Fable 5 4, Opus 4.8 3](charts/chart-blind-solves.png)

Both GPT-5.6 models against the Claude field pooled come out at p = 0.000000003 on a Fisher exact test, so this is not sampling luck. It also breaks the pricing intuition completely: the cheapest model in the lineup ties the flagship with a perfect score, and the most expensive is the worst.

A lineup note: the benchmark first ran with GPT-5.5 and GPT-5.3 Codex. OpenAI shipped the GPT-5.6 family while I was writing this up and scheduled Codex's API shutdown for July 23, so I reran the full 82-run gauntlet on GPT-5.6 Sol and GPT-5.6 Luna, and the charts show the successors. The retired pair's full numbers are in this repo: GPT-5.5 matched Sol's solves at higher cost, and Codex solved this bug 7 times out of 13.

That is a bit of an interesting revelation, at least as it pertains to this experiment. The gap between these models is not whether they can fix bugs. It is whether they can reason through a genuinely tricky bug with nothing to check their answer against, and you only pay for that gap when no test can tell the model it is wrong. If your pipeline gives agents a failing test to iterate against, the $0.010 model and the $0.144 model produce the same outcome, and the discriminating case is rare enough that I had to engineer it on purpose.

## What happened with Claude Fable 5

On capability Claude Fable 5 matched the field: the only bugs it ever missed were blind attempts at the event-bus task, and it solved 44 of the 53 runs it attempted. It was also the slowest, around 30 seconds a task, and the most expensive. But 29 of its 82 runs never ran at all. The response came back with Anthropic's `stop_reason: "refusal"` (the AI SDK calls it `content-filter`), usually before a single tool call: nine output tokens, no message, no work.

This was not throttling; refused calls return HTTP 200 with the rate-limit headers nearly full. Fable 5 runs safety classifiers on every request, and a refusal carries a `stop_details.category` field. Every one I inspected read `"cyber"`, with the explanation that the request "triggered restrictions on violative cyber content" under Anthropic's Usage Policy. A bug report about a JSON-patch rollback, handed to an agent with read, write, and test tools, apparently reads as offensive cyber activity to the classifier guarding Anthropic's most safety-hardened model. On this workload Fable 5 declined 40 percent of ordinary bug-fix requests, so if it is in your stack your traces need to watch `stop_reason` and `stop_details`, because your users will hit this before you do.

## What this benchmark does not tell you

The scope here is narrow on purpose so the experiment was nicely isolated. Every task is a small library, 25 to 250 lines, with exactly one planted bug and a bug report that includes a reproduction, which is the friendliest possible framing of "coding agent." This experiment doesn't address repo-scale work, ambiguous requirements, or changes that need design judgment. The tasks were written by Claude-based agents, so a family-level bias in what counts as a natural bug is possible. Every model ran once at its default settings; I did not test whether different reasoning-effort or randomness settings would change the results. Everything ran across two days from a single region, four runs at a time, and the timing numbers include local test execution.

## What I'd do with these numbers

For this class of task, give your agent a test suite it can run against, wire everything into an observability platform, and buy the cheap model. Every task where the agent could run the tests was solved by the cheapest model in the lineup for about a penny per fix, and the expensive models added little but latency and cost. Quality differences only appeared where nothing could tell the agent it was wrong, and even there the newest cheap model matched the flagship, so test on your own workload before paying for size. Finally maybe consider refusal rate as a production metric along with signals like user frustration or escalation, measured on your own traffic.

The harness, the tasks, the per-run results, and the refusal probes are all in this repo, and the whole benchmark cost around $32 in API spend if you do the same setup.
