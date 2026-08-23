## Report query profiling note

Date: 2026-08-23

Local validation for this change used the existing in-memory test workload and the new reports integration cases. That coverage did not surface a measured bottleneck large enough to justify adding indexes in this change.

No new indexes were added.

Query shapes to watch in production profiling:

- `Sale`: `saleDate`, `vehicleId`, `voidedAt`
- `Payment`: `paymentDate`, `providerId`, `voidedAt`
- `Expense`: `expenseDate`, `vehicleId`, `vendorId`, `voidedAt`
- `Purchase`: `purchaseDate`, `vehicleId`, `vendorId`, `voidedAt`
- `Repair`: `openedAt`, `vehicleId`, `vendorId`, `status`, `voidedAt`
- `Vehicle`: `statusId`, `dateReceived`, `voidedAt`

If production profiling shows latency on report reads or exports, start with compound indexes aligned to the concrete filter combinations above instead of adding broad speculative indexes now.
