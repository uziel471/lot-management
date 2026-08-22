# Diseño tecnico - Pagos

## Context

See `proposal.md` for motivation. The current system already has the primitives this module needs: atomic human-readable counters, role-gated `actions.ts` and `queries.ts`, immutable financial records, cent-based money arithmetic in `src/lib/money.ts`, and source modules for purchases, expenses, and repairs.

The architectural constraint is dependency direction. `features/payments` can consume public read helpers from purchases, expenses, repairs, vehicles, and catalogs, but those features should not import payment internals directly. Cross-feature composition belongs in `app/` pages or in dependency-injected callbacks passed into existing actions.

## Goals / Non-Goals

**Goals:**

- Record outbound payments without mutating purchase, expense, or repair financial values.
- Derive paid totals and pending balances consistently from active payment applications.
- Prevent overpayment and prevent voiding source records that still have active payments.
- Keep money rules identical to the rest of the system: cent integers, locked exchange rate, conversion through `convertToUsd`.
- Establish a reusable application/allocation pattern for later sales payments or refunds.

**Non-Goals:**

- A general ledger, double-entry accounting, bank reconciliation, or statement import.
- File storage for evidence binaries. This phase stores consultable evidence metadata only, consistent with expenses.
- Accounts payable aging reports beyond the filters and balances needed for operation.
- Receipts from vehicle sales or customer payments.

## Decisions

### Payments own applications; source documents stay immutable

A payment document stores its own applications as an array. Each application contains `sourceType`, `sourceId`, `sourceCode`, `appliedOriginal`, `appliedUsd`, and a snapshot of the source document total/pending balance at the time of save when useful for display. The source purchase, expense, or repair document is not updated with `paidTotal` or `status`.

This keeps the existing financial records immutable and avoids retrofitting every source collection with derived fields that can drift. The cost is that list/detail queries need to aggregate payment applications by source id before projecting DTOs. That is acceptable because source records are operational volume, not accounting-scale ledger rows.

Alternative considered: write `paidUsd` and `paymentStatus` onto each source document. That makes list queries simpler, but it creates a second truth that must be repaired when a payment is voided or a future reassignment exists.

### Balances are derived in a shared payment domain module

`features/payments/domain.ts` should expose pure functions for:

- `paymentTotalUsd(amount, currency, exchangeRate)`
- `sumApplications(applications)`
- `assertApplicationsMatchPaymentAmount(payment, applications)`
- `calculatePaidAndPending(sourceTotalUsd, activeApplications)`
- `paymentStatus(sourceTotalUsd, activeApplications)`

The source modules use their existing total functions. Payments only needs normalized source DTOs shaped as `{ type, id, code, providerId, totalUsd, isPayable }`. That keeps payment math testable without Mongoose and keeps source-specific cost calculations inside their existing domains.

Alternative considered: put balance helpers in `lib/financial`. That is premature. The concept is payment-specific today; it can move to `lib/` only when another domain reuses it.

### All applications in one payment are saved atomically

`createPayment` validates the payload, loads all targeted source documents, computes their current active paid totals, rejects non-payable targets and overpayments, emits the next `PAY` code, then writes the payment in one database transaction.

The transaction must read existing active payment applications for the same source ids before writing. If two users pay the same pending balance concurrently, an application-level check is still racy, so the action also handles duplicate/overpayment races by re-reading active applications after any write conflict and returning a user-facing overpayment error.

MongoDB cannot express "sum of embedded applications across documents must not exceed source total" as a simple unique index. The practical guard is transactional validation plus integration tests for concurrent payments.

### Payment amount and application amounts use payment currency plus locked USD

The payment is monomoneda. The user enters one payment amount in the payment currency and one exchange rate. Every application amount is entered in the same payment currency, and each application stores its own locked USD equivalent using that payment exchange rate.

This avoids mixing application currencies inside one payment and makes `sum(applications) === payment.amount` exact in minor units. It also matches the way an actual outgoing payment is made: one check, transfer, or cash movement has one currency.

Alternative considered: let each application be captured in the source document currency. That makes source comparison feel natural, but a single payment could then contain mixed currencies and require residual rounding rules that are hard to explain at capture time.

### Overpayment checks compare in USD cents

Source totals are already exposed as locked USD totals. Payment applications also store locked USD equivalents. Pending balance is therefore computed as `sourceTotalUsd - activeAppliedUsd`.

For MXN payments against USD source records, the exchange rate chosen at payment time determines how much USD value the payment covers. The system does not try to preserve a second "original currency balance" on the source document, because purchases, repairs, and expenses may each have different original currencies and exchange rates.

The trade-off is visible rounding at the last cent. The UI should show the computed USD application before save and allow the user to adjust the payment amount so a final payment exactly clears the pending USD balance.

### Payability is source-specific

Payments asks each source adapter whether a record is payable:

- Purchase: active, not voided.
- Expense: active, not voided.
- Repair: active payable lifecycle, not cancelled, not voided.

The payment feature must not duplicate every source lifecycle rule internally. It should use small adapter functions in `features/payments/source-documents.ts` that call source queries and normalize results. Tests should cover each source type and the rejected states.

### Voiding source documents checks payments through injected dependencies

Purchases, expenses, repairs, and vehicles need to block void/cancel when active payments exist. To preserve dependency direction, their actions should not import `features/payments` directly. They should accept an optional dependency object for tests and production composition, following the existing purchase-to-vehicle voiding pattern.

The app or default action factory wires the payment blocking query. This keeps source modules independently testable and prevents a feature cycle where payments imports sources and sources import payments.

### Payment references are not globally unique in v1

Payment reference numbers are searchable and shown in detail, but the first version does not enforce global uniqueness. Transfers, checks, cash receipts, and provider portals do not share one reliable numbering scheme, and forcing uniqueness too early will create false rejections.

The `submissionToken` remains unique and sparse to protect against double submit. If operation later needs duplicate detection for a specific method, add method-scoped warnings rather than a hard global index.

### Evidence mirrors expenses

Payment evidence is metadata, not file upload infrastructure. The data model should support a small array of evidence entries with type, label, external reference or URL when available, and notes. Voiding a payment preserves evidence exactly as captured.

If a future storage decision adds binary attachments, it should extend the evidence shape without changing payment financial behavior.

### UI follows the existing financial record rhythm

The payment form uses the same full-page sectioned form pattern as purchases, expenses, and repairs. The application picker is the only new interaction: it filters payable source documents, lets the user add multiple rows, shows source total/paid/pending in USD, and keeps a stable total reconciliation panel.

The list and detail should stay operational, not dashboard-like. Paid and pending values belong near source application rows and financial summaries; the module should not introduce a separate visual language for accounting.

## Risks / Trade-offs

- **Concurrent overpayment is not enforceable by a simple index** -> Use transaction-level validation, re-read active applications on write conflict, and add integration tests with simultaneous payments against one source.
- **Derived balances make list queries heavier** -> Batch active payment applications by source ids and compute balances in memory with pure functions; introduce denormalized fields only if measured list latency requires it.
- **Final payment rounding can leave a one-cent balance** -> Show USD equivalent live for each application and provide a "clear pending balance" affordance that calculates the exact payment amount for the captured exchange rate.
- **Payment feature can become a dependency hub** -> Keep source adapters narrow and keep page-level composition in `app/`; do not let source domains import payment internals directly.
- **Provider consistency across multi-document payments can be ambiguous** -> Default to requiring all applications in one payment to share the same provider when the source has a provider; allow providerless/internal records only when their source module already permits them.

## Migration Plan

The `payments` collection starts empty and the `PAY` counter starts at zero. `scripts/seed-counters.ts` should learn the `PAY` prefix so environments can be realigned from existing payment codes if historical payments are ever loaded directly.

Rollout order:

1. Add payment permissions, counter prefix, domain functions, model, schema, and source adapters.
2. Implement read queries and balance projections without UI changes.
3. Add create/void actions with integration coverage for partial, full, overpayment, void, and concurrency cases.
4. Surface payment balances in purchases, expenses, repairs, and vehicle detail.
5. Add payment routes, navigation, form, list, and detail.

Rollback is straightforward while the collection is empty: remove the routes/menu, model, feature folder, permission entries, and `PAY` counter support. After real payments exist, rollback must preserve the collection or export it before removing UI access.

## Open Questions

- Should cash payments require an explicit cash account label before the business starts tracking multiple tills?
- Should providerless expenses and internal repairs be payable in the same payment as provider-bound obligations, or should the UI force separate payments for operational clarity?
