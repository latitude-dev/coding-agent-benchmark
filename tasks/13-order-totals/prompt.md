# Bug report: volume discounts produce fractional-cent totals

Our checkout keeps all money in integer cents. A customer cart with a 20000-cent
subtotal qualifies for the 10% volume discount, so with a 10% tax rate the totals
should be `{ subtotalCents: 20000, discountCents: 2000, taxCents: 1800, totalCents: 19800 }`.
Instead we get `{ subtotalCents: 20000, discountCents: 0.1, taxCents: 2000, totalCents: 21999.9 }`:
the discount shows up as a fraction of a cent and the grand total is not even an
integer. Carts that stay below the discount threshold come out exactly right.

The test suite in this workspace reproduces the problem. Find the bug in the source and
fix it so the whole suite passes.
