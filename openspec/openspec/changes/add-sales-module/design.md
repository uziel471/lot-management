## Context

See `proposal.md` for motivation. The current application already has the ingredients SALES needs: vehicles as the unit of work, purchases as acquisition cost, repairs as reconditioning cost, expenses as vehicle-related operating cost, `lib/money.ts` for cent-based arithmetic, `counters` for readable codes, and the established `features/<domain>` shape with `actions.ts`, `queries.ts`, `domain.ts`, `schema.ts`, `types.ts`, and domain-specific components.

The key constraint is dependency direction. SALES can consume public read APIs from vehicles, purchases, repairs, and expenses, but those features must remain the source of truth for their own records. Vehicle pages may compose several features from `app/`, but `features/vehicles` must not import SALES internals.

## Goals / Non-Goals

**Goals:**

- Persist an immutable sale record with enough financial snapshot data to keep the sale result historically legible.
- Calculate cost, profit, and ROI with the same money rules used by the existing transaction modules.
- Keep the result explainable by showing acquisition, repair, and vehicle expense cost separately before combining them.
- Enforce one active sale per vehicle with database constraints and server-side validation.
- Fit the existing operational UI patterns and role model.

**Non-Goals:**

- Payment schedules, receivables, financing, post-sale commissions, tax accounting, or profit-and-loss reporting beyond the sale list summaries.
- Moving cost ownership into SALES. Purchases, repairs, and expenses continue owning their records and voiding behavior.
- A general reporting engine. SALES creates the data and operational summaries needed by this module.

## Decisions

### Sale price is USD only

Sale price is stored as USD cents. The cost modules already normalize their active totals to USD, vehicle list price is USD, and ROI only makes sense when numerator and denominator share a currency. Allowing MXN sale capture now would require exchange-rate locking, currency UI, and another set of financial edge cases without a stated operational need.

Alternative considered: mirror purchases with currency and exchange rate. That is consistent, but it expands scope into bimoneda sales. If the business starts selling in MXN, the correct follow-up is a focused change that adds sale currency and exchange-rate locking.

### The sale stores a financial snapshot

The sale document stores the sale price plus snapshot fields for acquisition cost, repair cost, vehicle expense cost, total cost, profit, and ROI numerator/denominator at creation time. It also stores enough lightweight source metadata to explain the snapshot: counts and active totals by source category, and links back to the vehicle and sale record.

The read model can recalculate a preview before saving from current active costs, but once saved the sale detail uses the stored snapshot. That preserves what the business knew when the sale happened. If a prior repair is voided after the sale, the repair module remains correct for current active cost, while the sale continues to show the historical result that was accepted at sale time.

Alternative considered: always derive sale profit live from current costs. That keeps one mathematical truth but rewrites history whenever someone corrects a cost after sale. For financial records, historical legibility is more valuable than live mutation.

### Cost aggregation is exposed through public queries

SALES should call public server-only queries such as `getVehicleAcquisitionCost`, `getVehicleRepairSummary`, and `getVehicleExpenseSummary`, or add equivalents where a module lacks one. Each source module owns its filtering rules for voided and active records. SALES composes their outputs into a `SaleCostSnapshot` in its own domain layer.

This keeps feature boundaries clear: purchases knows purchase rules, repairs knows repair lifecycle rules, expenses knows general-vs-vehicle expense rules, and SALES knows profit/ROI.

Alternative considered: query all underlying collections directly from SALES. That would be shorter initially but duplicates source-specific rules and makes future changes to voiding or lifecycle behavior easy to miss.

### One active sale per vehicle is an index, not just validation

The action validates that the vehicle exists, is not voided, and has no active sale so it can return useful errors. The database also enforces a unique partial index on `{ vehicleId: 1 }` where `voidedAt: null`. That protects against simultaneous submissions.

Voiding a sale releases the vehicle for a replacement sale, preserving the old sale as historical. The sale code is never reused.

Alternative considered: block all future sales for a vehicle once any sale exists. That is simpler, but it makes correction of a mistaken sale operationally impossible without editing or deleting history.

### Sale records are immutable except voiding

There is no sale edit operation. A wrong buyer, reference, price, or date is corrected by voiding the sale with a reason and creating a replacement sale. This matches purchases and keeps the financial result auditable.

Alternative considered: allow editing non-financial fields such as notes or buyer. That creates a mixed rule that users and tests must remember, and buyer/date/reference are part of the business record, not decoration.

### Submission tokens follow the transaction modules

The create form generates a submission token and the server stores it with a unique sparse index. A duplicate submission returns the original sale rather than creating another sale. If a race reaches the unique index first, the losing request rereads the winning sale by token and returns it.

This mirrors purchases, repairs, and expenses, and keeps the defense server-side instead of relying on disabled buttons.

### Vehicle detail composes sale UI from `app/`

`app/(app)/vehiculos/[code]/page.tsx` should fetch the vehicle, cost summaries, and sale summary, then render a SALES-owned vehicle summary component inside the vehicle detail. `features/vehicles` stays unaware of SALES.

Alternative considered: add sale query calls inside `features/vehicles/queries.ts`. That creates a feature cycle and makes vehicles responsible for a financial result it does not own.

### ROI is represented explicitly when unavailable

ROI is calculated as `profit / totalCost`. When total cost is zero, ROI is `null` or an explicit unavailable value in DTOs, not `0`, `Infinity`, or a formatted percentage. UI should render "N/A" or the shared equivalent for unavailable financial ratios.

Alternative considered: show 0% ROI for zero cost. That is mathematically false and hides the reason the ratio cannot be computed.

## Risks / Trade-offs

- Historical sale snapshot can differ from current cost after cost corrections -> Sale detail must label the values as sale snapshot values and link to current vehicle cost sections where useful.
- Aggregating costs through public queries may perform multiple database reads -> Use batched list queries for sale lists and keep per-sale source breakdown compact; optimize only if the sales list becomes slow under real data.
- Active-sale index depends on consistent voiding metadata -> Integration tests should cover create, duplicate create, void, replacement sale, and direct race behavior.
- USD-only sale capture may be too narrow later -> The data model should keep sale price fields named clearly enough that a future currency change can add `currency` and `exchangeRate` without overloading current USD values.
- ROI formatting can obscure negative or unavailable states -> Domain tests should cover positive profit, loss, zero cost, and rounding/formatting boundaries.

## Migration Plan

The `sales` collection starts empty. Add the `SAL` counter to `scripts/seed-counters.ts`, starting from existing `SAL-####` documents if any are later imported. Existing vehicles are not backfilled with sale data.

Create indexes for unique `code`, unique active sale per vehicle, optional unique `submissionToken`, sale date, buyer search fields, and active/voided filtering. Add sale permissions before exposing navigation so server actions and UI agree.

Rollback is removing the SALES routes, feature folder, model, counter seed entry, and vehicle detail composition. No existing purchase, repair, expense, or vehicle documents require mutation for this change.

## Open Questions

- Should buyer become a first-class customer catalog later? The first version captures buyer text/contact on the sale because customer lifecycle is not yet part of the system.
- Should sale snapshot source metadata include exact source record ids for every cost record? The first version can link through vehicle cost sections; exact ids are useful for audit exports but not required for the operational UI.
