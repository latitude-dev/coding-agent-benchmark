# Bug report: formatCents drops the minus sign on refunds under a dollar

Our billing UI formats integer cents with `formatCents`. A user reported that a 50-cent
refund shows up as a charge: `formatCents(-50, '$')` returns `$0.50` when it should
return `-$0.50`. Larger refunds like `formatCents(-123456, '$')` correctly render
`-$1,234.56`, so only negative amounts smaller than one dollar lose their sign.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
