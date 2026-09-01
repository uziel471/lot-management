import { describe, expect, it } from "vitest"

import {
  formDataToValuesWithIndexedGroups,
  formDataToValues,
  normalizeUsdExchangeRate,
  valueAsBoolean,
  valueAsNumber,
  valueAsString,
} from "./form-values"

describe("form-values", () => {
  it("serializa FormData simple como valores de formulario", () => {
    const formData = new FormData()
    formData.set("vehicleId", "veh_1")
    formData.set("amount", "12345")

    expect(formDataToValues(formData)).toEqual({
      vehicleId: "veh_1",
      amount: "12345",
    })
  })

  it("normaliza tipo de cambio USD a 1 sin tocar MXN", () => {
    expect(normalizeUsdExchangeRate({ currency: "USD", exchangeRate: "" })).toEqual({
      currency: "USD",
      exchangeRate: "1",
    })
    expect(normalizeUsdExchangeRate({ currency: "MXN", exchangeRate: "18.50" })).toEqual({
      currency: "MXN",
      exchangeRate: "18.50",
    })
  })

  it("preserva compra USD con tipo de cambio canonico e importes capturados", () => {
    const formData = new FormData()
    formData.set("vehicleId", "veh_1")
    formData.set("vendorId", "vendor_1")
    formData.set("purchaseDate", "2026-08-31")
    formData.set("sourceType", "auction")
    formData.set("txType", "initial")
    formData.set("currency", "USD")
    formData.set("exchangeRate", "")
    formData.set("purchasePrice", "1250000")
    formData.set("auctionFees", "95000")
    formData.set("referenceNumber", "REF-USD")
    formData.set("lotNumber", "LOT-42")
    formData.set("notes", "captura antes del error")

    expect(normalizeUsdExchangeRate(formDataToValues(formData))).toMatchObject({
      vehicleId: "veh_1",
      vendorId: "vendor_1",
      purchaseDate: "2026-08-31",
      sourceType: "auction",
      txType: "initial",
      currency: "USD",
      exchangeRate: "1",
      purchasePrice: "1250000",
      auctionFees: "95000",
      referenceNumber: "REF-USD",
      lotNumber: "LOT-42",
      notes: "captura antes del error",
    })
  })

  it("preserva compra MXN con tipo de cambio e importes capturados", () => {
    const formData = new FormData()
    formData.set("currency", "MXN")
    formData.set("exchangeRate", "18.25")
    formData.set("purchasePrice", "23000000")
    formData.set("acquisitionTransportCost", "180000")

    expect(normalizeUsdExchangeRate(formDataToValues(formData))).toEqual({
      currency: "MXN",
      exchangeRate: "18.25",
      purchasePrice: "23000000",
      acquisitionTransportCost: "180000",
    })
  })

  it("preserva importes de gastos y reparaciones junto con campos requeridos capturados", () => {
    const expenseData = new FormData()
    expenseData.set("category", "transport")
    expenseData.set("expenseDate", "2026-08-30")
    expenseData.set("currency", "MXN")
    expenseData.set("exchangeRate", "17.80")
    expenseData.set("amount", "250000")
    expenseData.set("tax", "40000")
    expenseData.set("fees", "15000")

    const repairData = new FormData()
    repairData.set("vehicleId", "veh_2")
    repairData.set("category", "mechanical")
    repairData.set("openedAt", "2026-08-29")
    repairData.set("currency", "USD")
    repairData.set("exchangeRate", "")
    repairData.set("laborCost", "120000")
    repairData.set("partsCost", "300000")
    repairData.set("description", "diagnostico capturado")

    expect(normalizeUsdExchangeRate(formDataToValues(expenseData))).toMatchObject({
      category: "transport",
      expenseDate: "2026-08-30",
      currency: "MXN",
      exchangeRate: "17.80",
      amount: "250000",
      tax: "40000",
      fees: "15000",
    })
    expect(normalizeUsdExchangeRate(formDataToValues(repairData))).toMatchObject({
      vehicleId: "veh_2",
      category: "mechanical",
      openedAt: "2026-08-29",
      currency: "USD",
      exchangeRate: "1",
      laborCost: "120000",
      partsCost: "300000",
      description: "diagnostico capturado",
    })
  })

  it("reconstruye aplicaciones seleccionadas de pagos conservando orden y evidencia", () => {
    const formData = new FormData()
    formData.set("paymentDate", "2026-08-31")
    formData.set("method", "wire")
    formData.set("providerId", "vendor_1")
    formData.set("currency", "MXN")
    formData.set("exchangeRate", "18")
    formData.set("amount", "360000")
    formData.set("applications.1.sourceType", "expense")
    formData.set("applications.1.sourceId", "expense_1")
    formData.set("applications.1.appliedAmount", "160000")
    formData.set("applications.0.sourceType", "purchase")
    formData.set("applications.0.sourceId", "purchase_1")
    formData.set("applications.0.appliedAmount", "200000")
    formData.set("evidence.0.type", "paymentProof")
    formData.set("evidence.0.label", "folio 123")
    formData.set("referenceNumber", "PAY-REF")
    formData.set("notes", "aplicaciones capturadas")

    expect(formDataToValuesWithIndexedGroups(formData, ["applications", "evidence"])).toEqual({
      paymentDate: "2026-08-31",
      method: "wire",
      providerId: "vendor_1",
      currency: "MXN",
      exchangeRate: "18",
      amount: "360000",
      applications: [
        { sourceType: "purchase", sourceId: "purchase_1", appliedAmount: "200000" },
        { sourceType: "expense", sourceId: "expense_1", appliedAmount: "160000" },
      ],
      evidence: [{ type: "paymentProof", label: "folio 123" }],
      referenceNumber: "PAY-REF",
      notes: "aplicaciones capturadas",
    })
  })

  it("preserva valores de vehiculos y catalogos, incluyendo checkbox ausente con default seguro", () => {
    const vehicleData = new FormData()
    vehicleData.set("makeId", "make_1")
    vehicleData.set("modelId", "model_1")
    vehicleData.set("year", "2025")
    vehicleData.set("vin", "1HGCM82633A004352")
    vehicleData.set("trim", "Sport")
    vehicleData.set("targetSalePriceUsd", "1800000")

    const values = formDataToValues(vehicleData)
    if (!("titleInHand" in values)) values.titleInHand = "false"

    expect(values).toMatchObject({
      makeId: "make_1",
      modelId: "model_1",
      year: "2025",
      vin: "1HGCM82633A004352",
      trim: "Sport",
      targetSalePriceUsd: "1800000",
      titleInHand: "false",
    })
    const catalogData = new FormData()
    catalogData.set("name", "Proveedor capturado")

    expect(formDataToValues(catalogData)).toEqual({
      name: "Proveedor capturado",
    })
  })

  it("convierte valores seguros para rehidratar formularios", () => {
    expect(valueAsString(123, "")).toBe("123")
    expect(valueAsNumber("4500")).toBe(4500)
    expect(valueAsNumber("")).toBe(0)
    expect(valueAsBoolean("on")).toBe(true)
    expect(valueAsBoolean("false", true)).toBe(false)
  })
})
