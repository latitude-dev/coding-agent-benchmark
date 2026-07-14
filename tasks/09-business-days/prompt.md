# Bug report: addBusinessDays is one day short when starting on a weekend

Our SLA calculator computes due dates with `addBusinessDays`. A ticket filed on Saturday
2026-07-11 with a 1-business-day SLA got a due date of Monday 2026-07-13, but the clock
should not start until the next business day: a weekend start date counts from the
following Monday, so one business day after Saturday 2026-07-11 is Tuesday 2026-07-14.
Tickets filed on Sunday show the same one-day-short result. Weekday start dates are
computed correctly.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
