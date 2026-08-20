import { describe, expect, it } from "vitest"
import {
  accumulateAcquisitionCost,
  allowsNegativeAmounts,
  hasAnyAmount,
  requiresCorrectionTarget,
  requiresExistingPurchase,
  toReferenceKey,
  totalOriginal,
  totalUsd,
} from "./domain"
import { COST_COMPONENT_KEYS, type CostComponents } from "./enums"

function components(overrides: Partial<CostComponents> = {}): CostComponents {
  const base = Object.fromEntries(COST_COMPONENT_KEYS.map((key) => [key, 0])) as CostComponents
  return { ...base, ...overrides }
}

describe("totalOriginal", () => {
  it("con componentes vacíos, el total es cero", () => {
    expect(totalOriginal(components(), "USD")).toEqual({ amount: 0, currency: "USD" })
  })

  it("solo el precio del vehículo: el total equivale a ese componente", () => {
    const total = totalOriginal(components({ purchasePrice: 1_000_000 }), "USD")
    expect(total).toEqual({ amount: 1_000_000, currency: "USD" })
  })

  it("suma exacta de ocho importes que romperían en punto flotante", () => {
    const amounts: CostComponents = {
      purchasePrice: 10_10,
      auctionFees: 20_20,
      acquisitionTransportCost: 30_30,
      titleDocFees: 15_15,
      purchaseTax: 5_05,
      importDuties: 1_01,
      customsBrokerFees: 2_02,
      otherAcquisitionCosts: 3_03,
    }
    const total = totalOriginal(amounts, "MXN")
    const expected = Object.values(amounts).reduce((a, b) => a + b, 0)
    expect(total).toEqual({ amount: expected, currency: "MXN" })
  })
})

describe("totalUsd", () => {
  it("convierte 370,000.00 MXN a 18.50 en 20,000.00 USD", () => {
    const total = totalUsd(components({ purchasePrice: 37_000_000 }), "MXN", "18.50")
    expect(total).toEqual({ amount: 2_000_000, currency: "USD" })
  })

  it("una compra en USD no cambia con el tipo de cambio 1", () => {
    const total = totalUsd(components({ purchasePrice: 1_234_567 }), "USD", "1")
    expect(total).toEqual({ amount: 1_234_567, currency: "USD" })
  })
})

describe("control de signo por tipo", () => {
  it("solo Adjustment admite negativos", () => {
    expect(allowsNegativeAmounts("adjustment")).toBe(true)
    expect(allowsNegativeAmounts("initial")).toBe(false)
    expect(allowsNegativeAmounts("correction")).toBe(false)
    expect(allowsNegativeAmounts("related")).toBe(false)
  })

  it("Adjustment y Related exigen compra base", () => {
    expect(requiresExistingPurchase("adjustment")).toBe(true)
    expect(requiresExistingPurchase("related")).toBe(true)
    expect(requiresExistingPurchase("initial")).toBe(false)
    expect(requiresExistingPurchase("correction")).toBe(false)
  })

  it("solo Correction exige el objetivo que corrige", () => {
    expect(requiresCorrectionTarget("correction")).toBe(true)
    expect(requiresCorrectionTarget("initial")).toBe(false)
  })
})

describe("hasAnyAmount", () => {
  it("rechaza los ocho componentes en cero", () => {
    expect(hasAnyAmount(components())).toBe(false)
  })

  it("acepta con un solo componente distinto de cero", () => {
    expect(hasAnyAmount(components({ otherAcquisitionCosts: 1 }))).toBe(true)
  })

  it("acepta un componente negativo (Adjustment)", () => {
    expect(hasAnyAmount(components({ purchasePrice: -500 }))).toBe(true)
  })
})

describe("toReferenceKey", () => {
  it("' fac-1023 ' y 'FAC-1023' producen la misma clave", () => {
    expect(toReferenceKey(" fac-1023 ")).toBe(toReferenceKey("FAC-1023"))
    expect(toReferenceKey(" fac-1023 ")).toBe("FAC-1023")
  })

  it("una referencia vacía o ausente devuelve null", () => {
    expect(toReferenceKey("")).toBeNull()
    expect(toReferenceKey(null)).toBeNull()
    expect(toReferenceKey(undefined)).toBeNull()
    expect(toReferenceKey("   ")).toBeNull()
  })
})

describe("accumulateAcquisitionCost", () => {
  it("un vehículo sin compras da cero", () => {
    const result = accumulateAcquisitionCost([])
    expect(result.total).toEqual({ amount: 0, currency: "USD" })
  })

  it("suma una compra en USD y otra en MXN, cada una con su tipo de cambio", () => {
    const result = accumulateAcquisitionCost([
      { currency: "USD", exchangeRate: "1", components: components({ purchasePrice: 1_000_000 }), voidedAt: null },
      { currency: "MXN", exchangeRate: "18.50", components: components({ purchasePrice: 37_000_000 }), voidedAt: null },
    ])
    // 1,000,000 (USD) + 2,000,000 (37,000,000 MXN / 18.50) = 3,000,000
    expect(result.total).toEqual({ amount: 3_000_000, currency: "USD" })
  })

  it("ignora las compras anuladas", () => {
    const result = accumulateAcquisitionCost([
      { currency: "USD", exchangeRate: "1", components: components({ purchasePrice: 1_000_000 }), voidedAt: null },
      { currency: "USD", exchangeRate: "1", components: components({ purchasePrice: 5_000_000 }), voidedAt: new Date() },
    ])
    expect(result.total).toEqual({ amount: 1_000_000, currency: "USD" })
  })

  it("un ajuste negativo baja el acumulado", () => {
    const result = accumulateAcquisitionCost([
      { currency: "USD", exchangeRate: "1", components: components({ purchasePrice: 1_000_000 }), voidedAt: null },
      { currency: "USD", exchangeRate: "1", components: components({ purchasePrice: -200_000 }), voidedAt: null },
    ])
    expect(result.total).toEqual({ amount: 800_000, currency: "USD" })
  })

  it("el desglose por componente cuadra con el total", () => {
    const result = accumulateAcquisitionCost([
      {
        currency: "USD",
        exchangeRate: "1",
        components: components({ purchasePrice: 100, auctionFees: 50 }),
        voidedAt: null,
      },
    ])
    const summed = COST_COMPONENT_KEYS.reduce((sum, key) => sum + result.components[key].amount, 0)
    expect(summed).toBe(result.total.amount)
    expect(result.components.purchasePrice.amount).toBe(100)
    expect(result.components.auctionFees.amount).toBe(50)
  })
})
