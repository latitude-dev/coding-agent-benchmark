# Screenshot production notes

Capture list for the published version of ARTICLE.md. Each entry notes the section it belongs in, what to capture in the Latitude Model Benchmark project, and a suggested caption.

## Captured and embedded

📸 **Screenshot 1, the raw material** (`screenshots/01-traces-list.png`, in "Setup"). Sessions list filtered by tag `coding-benchmark`, with tag chips, duration, cost, and model columns.

📸 **Screenshot 2, one run up close** (`screenshots/02-single-run.png`, in "Setup"). Session overview of a single run: tags, span count, token and cost totals.

📸 **Screenshot 3, one model = one user** (`screenshots/03-models-as-users.png`, in "Tests Available to Agent"). Users view with the five models as users, session counts and total cost per model.

📸 **Screenshot 4, the score on the trace** (`screenshots/04-custom-scores.png`, in "Tests Hidden from Agent"). Scores tab of a failed blind run: the harness's 0 percent custom score with its "hidden suite failed" feedback, and the signal chip grouping these failures.

## Still to capture

📸 **Screenshot 4, the money chart.** Analytics view charting total cost broken down by user (model), same time window as the benchmark. The bars should visibly step down from Opus and Fable to Codex. Placed in "Tests Available to Agent". Caption: "Same solve rate, 8x the bill. Cost by model across all 410 runs."

📸 **Screenshot 6, the scoreboard the harness pushed back.** Scores analytics: pass rate broken down by model (filter Score source = custom to isolate the harness scores). Placed in "Tests Hidden from Agent". Caveat before using: the dashboard pools all tiers and counts Fable's refusals as failures, so its percentages will not match the per-tier tables in the article; if used, the caption must say what is being counted. Caption: "Pass rate by model over every scored run, refusals counted as failures."

📸 **Screenshot 8, the empty reply.** Trace detail of a refused Fable 5 run (filter by tag `model:claude-fable-5`, look for traces with 4 spans and single-digit output tokens; `17-json-patch` trial 1 is a clean example). The conversation panel shows the ordinary bug report going in and an empty assistant turn coming back with nine output tokens and Anthropic's refusal stop reason (shown as content_filter in the trace). Placed in "What happened with Claude Fable 5". Caption: "A JSON Patch bug report goes in. Nine tokens and a content filter come back."

📸 **Screenshot 10, the detector that stays on.** The "Agent did not fix the bug" signal detail page (an LLM judge created over the project), showing its collected occurrences from the live runs. Placed near the end. Caption: "The benchmark ended; the detectors didn't. A judge signal keeps flagging runs where the agent never landed a fix."

## Dropped

- Screenshot 5 (blind right-and-wrong side by side): cut by editorial decision.
- Screenshot 7 (cache-read cost panel): its section, "What prompt caching does to the bill", was cut from the article.
- Screenshot 9 (refusal volatility timeline): the volatility paragraph was cut from the article.
