import { describe, expect, it } from "vitest"
import {
  accumulateActiveExpenseTotal,
  expenseTotalOriginal,
  expenseTotalUsd,
  hasInvalidNegativeExpenseComponent,
  hasPositiveExpenseTotal,
  summarizeVehicleExpenses,
} from "./domain"
import { EXPENSE_COMPONENT_KEYS, type ExpenseComponents } from "./enums"

function components(overrides: Partial<ExpenseComponents> = {}): ExpenseComponents {
  const base = Object.fromEntries(EXPENSE_COMPONENT_KEYS.map((key) => [key, 0])) as ExpenseComponents
  return { ...base, ...overrides }
}

describe("expenseTotalOriginal", () => {
  it("suma cargos y resta descuento y ajuste", () => {
    const total = expenseTotalOriginal(
      components({ amount: 100_00, tax: 16_00, fees: 5_00, discount: 10_00, adjustment: 1_00 }),
      "USD",
    )
    expect(total).toEqual({ amount: 110_00, currency: "USD" })
  })
})

describe("expenseTotalUsd", () => {
  it("convierte MXN a USD con el tipo de cambio congelado", () => {
    const total = expenseTotalUsd(components({ amount: 37_000_000 }), "MXN", "18.50")
    expect(total).toEqual({ amount: 2_000_000, currency: "USD" })
  })

  it("preserva el importe en USD con tipo de cambio 1", () => {
    const total = expenseTotalUsd(components({ amount: 123_45 }), "USD", "1")
    expect(total).toEqual({ amount: 123_45, currency: "USD" })
  })
})

describe("validación de componentes", () => {
  it("rechaza componentes negativos", () => {
    expect(hasInvalidNegativeExpenseComponent(components({ tax: -1 }))).toBe(true)
  })

  it("exige total positivo", () => {
    expect(hasPositiveExpenseTotal(components())).toBe(false)
    expect(hasPositiveExpenseTotal(components({ amount: 100_00, discount: 100_00 }))).toBe(false)
    expect(hasPositiveExpenseTotal(components({ amount: 100_00, discount: 10_00 }))).toBe(true)
  })
})

describe("accumulateActiveExpenseTotal", () => {
  it("suma solo gastos vigentes", () => {
    const total = accumulateActiveExpenseTotal([
      {
        category: "fuel",
        currency: "USD",
        exchangeRate: "1",
        components: components({ amount: 100_00 }),
        voidedAt: null,
      },
      {
        category: "transport",
        currency: "USD",
        exchangeRate: "1",
        components: components({ amount: 50_00 }),
        voidedAt: new Date("2026-08-21T00:00:00Z"),
      },
      {
        category: "cleaning",
        currency: "MXN",
        exchangeRate: "20",
        components: components({ amount: 200_00 }),
        voidedAt: null,
      },
    ])

    expect(total).toEqual({ amount: 110_00, currency: "USD" })
  })
})

describe("summarizeVehicleExpenses", () => {
  it("resume por categoría y excluye anulados", () => {
    const summary = summarizeVehicleExpenses([
      {
        category: "fuel",
        currency: "USD",
        exchangeRate: "1",
        components: components({ amount: 50_00 }),
        voidedAt: null,
      },
      {
        category: "fuel",
        currency: "USD",
        exchangeRate: "1",
        components: components({ amount: 25_00 }),
        voidedAt: null,
      },
      {
        category: "cleaning",
        currency: "USD",
        exchangeRate: "1",
        components: components({ amount: 10_00 }),
        voidedAt: new Date("2026-08-21T00:00:00Z"),
      },
    ])

    expect(summary.totalUsd).toEqual({ amount: 75_00, currency: "USD" })
    expect(summary.categories).toEqual([
      {
        category: "fuel",
        totalUsd: { amount: 75_00, currency: "USD" },
        count: 2,
      },
    ])
  })
})
