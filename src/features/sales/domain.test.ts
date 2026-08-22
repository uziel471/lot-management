import { describe, expect, it } from "vitest"
import { createSaleSnapshot, formatRoi, roiOf, saleResultOf } from "./domain"

describe("createSaleSnapshot", () => {
  it("calcula ganancia y roi positivo", () => {
    const snapshot = createSaleSnapshot(
      { amount: 1_250_000, currency: "USD" },
      {
        acquisitionCostUsd: { amount: 1_000_000, currency: "USD" },
        repairCostUsd: { amount: 200_000, currency: "USD" },
        vehicleExpenseCostUsd: { amount: 50_000, currency: "USD" },
        acquisitionCount: 1,
        repairCount: 1,
        vehicleExpenseCount: 1,
      },
    )

    expect(snapshot.totalCostUsd.amount).toBe(1_250_000)
    expect(snapshot.profitUsd.amount).toBe(0)
    expect(snapshot.roi).toBe(0)
    expect(saleResultOf(snapshot.profitUsd)).toBe("breakEven")
  })

  it("calcula pérdida y roi negativo", () => {
    const snapshot = createSaleSnapshot(
      { amount: 800_000, currency: "USD" },
      {
        acquisitionCostUsd: { amount: 1_000_000, currency: "USD" },
        repairCostUsd: { amount: 0, currency: "USD" },
        vehicleExpenseCostUsd: { amount: 0, currency: "USD" },
        acquisitionCount: 1,
        repairCount: 0,
        vehicleExpenseCount: 0,
      },
    )

    expect(snapshot.profitUsd.amount).toBe(-200_000)
    expect(snapshot.roi).toBe(-20)
    expect(snapshot.roiLabel).toBe("-20.00%")
    expect(saleResultOf(snapshot.profitUsd)).toBe("loss")
  })

  it("reporta roi no disponible con costo cero", () => {
    const snapshot = createSaleSnapshot(
      { amount: 500_000, currency: "USD" },
      {
        acquisitionCostUsd: { amount: 0, currency: "USD" },
        repairCostUsd: { amount: 0, currency: "USD" },
        vehicleExpenseCostUsd: { amount: 0, currency: "USD" },
        acquisitionCount: 0,
        repairCount: 0,
        vehicleExpenseCount: 0,
      },
    )

    expect(snapshot.profitUsd.amount).toBe(500_000)
    expect(snapshot.roi).toBeNull()
    expect(snapshot.roiLabel).toBe("N/A")
  })
})

describe("roiOf", () => {
  it("redondea a dos decimales", () => {
    expect(roiOf(100_000, 1_150_000)).toBe(8.7)
    expect(formatRoi(8.7)).toBe("8.70%")
  })
})
