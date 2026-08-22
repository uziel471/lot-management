import { describe, expect, it } from "vitest"
import { repairCreateSchema } from "./schema"

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    vehicleId: "vehicle-id",
    category: "mechanical",
    openedAt: "2026-08-21",
    currency: "USD",
    exchangeRate: "1",
    laborCost: "10000",
    description: "Cambio de aceite y revisión general",
    submissionToken: "token-1",
    ...overrides,
  }
}

describe("repairCreateSchema", () => {
  it("acepta una reparación válida en USD", () => {
    const parsed = repairCreateSchema.safeParse(baseInput())
    expect(parsed.success).toBe(true)
  })

  it("rechaza tipo de cambio distinto de 1 en USD", () => {
    const parsed = repairCreateSchema.safeParse(baseInput({ exchangeRate: "18" }))
    expect(parsed.success).toBe(false)
  })

  it("rechaza tipo de cambio inválido en MXN", () => {
    const parsed = repairCreateSchema.safeParse(
      baseInput({ currency: "MXN", exchangeRate: "0" }),
    )
    expect(parsed.success).toBe(false)
  })

  it("rechaza importes negativos", () => {
    const parsed = repairCreateSchema.safeParse(baseInput({ laborCost: "-1" }))
    expect(parsed.success).toBe(false)
  })

  it("rechaza un total completo en cero", () => {
    const parsed = repairCreateSchema.safeParse(
      baseInput({ laborCost: "0", partsCost: "0", taxCost: "0", outsideServiceCost: "0", otherCost: "0" }),
    )
    expect(parsed.success).toBe(false)
  })
})
