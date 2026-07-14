# Screenshot production notes

Capture list for the published version of ARTICLE.md. Each entry notes the section it belongs in, what to capture in the Latitude Model Benchmark project, and a suggested caption.

## Placed in: The setup

📸 **Screenshot 1, the raw material.** Traces list of the Model Benchmark project, filtered by tag `coding-benchmark`, sorted by most recent. Make sure the visible columns include the tag chips (`model:…`, `task:…`, `trial:…`, `mode:…`), token counts, and cost, with enough rows to convey the 360-run scale. Caption: "Every benchmark run is a tagged trace. The rest of this post is queries over this list."

📸 **Screenshot 2, one run up close.** Trace detail of any solved oracle run (a GPT-5.3 Codex run on `01-interval-merge` works well): the span tree showing the agent loop of LLM calls and tool calls, with the conversation panel open on the final summary message. Caption: "One run: read the files, patch the source, run the tests, summarize the fix. Fifteen spans, twelve seconds."

## Placed in: With a test suite in reach, everybody solves everything

📸 **Screenshot 3, one model = one user.** The project's Users view, showing the five models as end users (`claude-opus-4-8`, `claude-sonnet-5`, `claude-fable-5`, `gpt-5.5`, `gpt-5.3-codex`) with their trace counts, total cost, and activity. This is the trick that makes per-model analytics free: set the model id as the user id in telemetry. Caption: "The five models, tracked as five users. Each run reported its model id as the user id, so the per-user views group runs by model."

📸 **Screenshot 4, the money chart.** Analytics view charting total cost broken down by user (model), same time window as the benchmark. The bars should visibly step down from Opus and Fable to Codex. Caption: "Same solve rate, 8x the bill. Cost by model across all 360 runs."

## Placed in: Take the tests away and one bug sorts the field

📸 **Screenshot 5, right and wrong, side by side.** Two trace details on `14-event-bus` in blind mode: a GPT-5.5 run (solved) next to a failed run from any other model, each open on the final assistant message where the model commits to its diagnosis. The failed one names a plausible but wrong root cause; that contrast is the whole point. Filter the traces list by tags `task:14-event-bus` + `mode:blind` to find them. Caption: "Same bug report, no tests to check against. One model reasons its way to the re-entrancy bug; the other commits to a plausible wrong fix."

📸 **Screenshot 6, the scoreboard the harness pushed back.** Scores or annotations analytics for the project: pass rate broken down by model, showing GPT-5.5 at 100 percent with the rest of the field spread below it once blind runs land. Every run's verdict was pushed onto its trace as a custom score by the harness (`sourceId: benchmark-harness`), so this chart is Latitude recomputing our results table on its own. Caption: "Pass rate by model, computed from scores attached to each trace, not from the harness's private spreadsheet."

## Placed in: The observability layer caught our own cost bug

📸 **Screenshot 7, the discrepancy.** A GPT-5.3 Codex trace detail with the token and cost panel visible, showing the split between regular input tokens and cache-read tokens (for example 2,664 input against 2,048 cache reads on a single run). This is the panel that disagreed with our harness. Caption: "Latitude prices cache reads separately. Our harness didn't, and the difference was a third of Codex's bill."

## Placed in: The model that didn't show up

📸 **Screenshot 8, the empty reply.** Trace detail of a refused Fable 5 run (filter by tag `model:claude-fable-5`, look for traces with 4 spans and single-digit output tokens; `17-json-patch` trial 1 is a clean example). The conversation panel shows the ordinary bug report going in and an empty assistant turn coming back with nine output tokens and Anthropic's refusal stop reason (shown as content_filter in the trace). Caption: "A JSON Patch bug report goes in. Nine tokens and a content filter come back."

📸 **Screenshot 9, the volatility.** Traces list filtered by tag `model:claude-fable-5`, sorted by start time ascending, cropped to the 10:27 to 10:36 UTC stretch where refused runs (tiny token counts, 4 spans) sit interleaved with full runs and then abruptly stop. If the timeline chart on the project overview shows the same window, that works too. Caption: "Nine minutes of traffic: refusals in the first burst, eighteen clean runs in the second. Same prompts."

📸 **Screenshot 10, the detector that stays on.** The "Agent did not fix the bug" signal detail page (an LLM judge created over the project), showing its collected occurrences from the live runs. This closes the loop for readers of the self-healing post: the benchmark's failure modes are now tracked signals, not a one-off spreadsheet. Caption: "The benchmark ended; the detectors didn't. A judge signal keeps flagging runs where the agent never landed a fix."
