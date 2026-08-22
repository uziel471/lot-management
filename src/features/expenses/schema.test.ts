import { describe, expect, it } from "vitest"
import { expenseCreateSchema } from "./schema"

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    category: "fuel",
    expenseDate: "2026-08-22",
    currency: "USD",
    exchangeRate: "1",
    amount: "10000",
    submissionToken: "token-1",
    ...overrides,
  }
}

describe("expenseCreateSchema", () => {
  it("acepta un gasto general válido en USD", () => {
    const parsed = expenseCreateSchema.safeParse(baseInput())
    expect(parsed.success).toBe(true)
  })

  it("acepta gasto sin vehículo ni proveedor", () => {
    const parsed = expenseCreateSchema.safeParse(baseInput({ vehicleId: "", vendorId: "" }))
    expect(parsed.success).toBe(true)
  })

  it("rechaza tipo de cambio distinto de 1 en USD", () => {
    const parsed = expenseCreateSchema.safeParse(baseInput({ exchangeRate: "18" }))
    expect(parsed.success).toBe(false)
  })

  it("rechaza tipo de cambio inválido en MXN", () => {
    const parsed = expenseCreateSchema.safeParse(baseInput({ currency: "MXN", exchangeRate: "0" }))
    expect(parsed.success).toBe(false)
  })

  it("rechaza importes negativos", () => {
    const parsed = expenseCreateSchema.safeParse(baseInput({ tax: "-1" }))
    expect(parsed.success).toBe(false)
  })

  it("rechaza un total final no positivo", () => {
    const parsed = expenseCreateSchema.safeParse(baseInput({ amount: "1000", discount: "1000" }))
    expect(parsed.success).toBe(false)
  })

  it("rechaza evidencia con URL inválida", () => {
    const parsed = expenseCreateSchema.safeParse(
      baseInput({ evidenceType: "invoice", evidenceUrl: "nota-invalida" }),
    )
    expect(parsed.success).toBe(false)
  })

  it("exige tipo de evidencia si se captura metadata", () => {
    const parsed = expenseCreateSchema.safeParse(baseInput({ evidenceLabel: "Factura 10" }))
    expect(parsed.success).toBe(false)
  })
})
