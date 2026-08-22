import { describe, expect, it } from "vitest"
import {
  accumulateActiveRepairCost,
  cancelRepair,
  completeRepair,
  hasPositiveRepairAmount,
  isActiveRepairStatus,
  repairTotalOriginal,
  repairTotalUsd,
  transitionRepairStatus,
  voidRepair,
} from "./domain"
import { REPAIR_COST_COMPONENT_KEYS, type RepairCostComponents } from "./enums"

function components(overrides: Partial<RepairCostComponents> = {}): RepairCostComponents {
  const base = Object.fromEntries(REPAIR_COST_COMPONENT_KEYS.map((key) => [key, 0])) as RepairCostComponents
  return { ...base, ...overrides }
}

describe("repairTotalOriginal", () => {
  it("suma exacta de los componentes capturados", () => {
    const total = repairTotalOriginal(
      components({ laborCost: 100_00, partsCost: 25_50, taxCost: 8_08, otherCost: 1_01 }),
      "USD",
    )
    expect(total).toEqual({ amount: 13_459, currency: "USD" })
  })
})

describe("repairTotalUsd", () => {
  it("convierte MXN a USD con el tipo de cambio congelado", () => {
    const total = repairTotalUsd(components({ laborCost: 37_000_000 }), "MXN", "18.50")
    expect(total).toEqual({ amount: 2_000_000, currency: "USD" })
  })

  it("preserva el importe en USD con tipo de cambio 1", () => {
    const total = repairTotalUsd(components({ partsCost: 123_45 }), "USD", "1")
    expect(total).toEqual({ amount: 123_45, currency: "USD" })
  })
})

describe("hasPositiveRepairAmount", () => {
  it("rechaza todos los componentes en cero", () => {
    expect(hasPositiveRepairAmount(components())).toBe(false)
  })

  it("acepta con un solo componente positivo", () => {
    expect(hasPositiveRepairAmount(components({ outsideServiceCost: 1 }))).toBe(true)
  })
})

describe("transitionRepairStatus", () => {
  it("permite cambios entre estados activos", () => {
    expect(transitionRepairStatus("requested", "quoted", "Esperando precio")).toEqual({
      previousStatus: "requested",
      nextStatus: "quoted",
      note: "Esperando precio",
    })
  })

  it("rechaza repetir el mismo estatus", () => {
    expect(() => transitionRepairStatus("quoted", "quoted")).toThrow("ya está en ese estatus")
  })

  it("rechaza cambiar un estado terminal", () => {
    expect(() => transitionRepairStatus("completed", "inProgress")).toThrow("registro terminal")
  })
})

describe("completeRepair", () => {
  const openedAt = new Date("2026-08-20T00:00:00Z")

  it("marca la reparación como completada", () => {
    expect(completeRepair("inProgress", openedAt, new Date("2026-08-21T00:00:00Z"), "Lista")).toEqual({
      previousStatus: "inProgress",
      nextStatus: "completed",
      note: "Lista",
    })
  })

  it("rechaza una fecha de conclusión anterior a la apertura", () => {
    expect(() =>
      completeRepair("quoted", openedAt, new Date("2026-08-19T00:00:00Z")),
    ).toThrow("no puede ser anterior")
  })

  it("rechaza completar un estado terminal", () => {
    expect(() => completeRepair("cancelled", openedAt, new Date("2026-08-21T00:00:00Z"))).toThrow(
      "ya no admite marcarse como completada",
    )
  })
})

describe("cancelRepair", () => {
  it("cancela una reparación activa con motivo", () => {
    expect(cancelRepair("inProgress", "Sin autorización del cliente")).toEqual({
      previousStatus: "inProgress",
      nextStatus: "cancelled",
      note: "Sin autorización del cliente",
    })
  })

  it("rechaza cancelar una reparación completada", () => {
    expect(() => cancelRepair("completed", "Ya no aplica")).toThrow("no puede cancelarse")
  })
})

describe("voidRepair", () => {
  it("permite anular cualquier estado no anulado", () => {
    expect(voidRepair("completed", "Registro duplicado")).toEqual({
      previousStatus: "completed",
      nextStatus: "voided",
      note: "Registro duplicado",
    })
  })

  it("rechaza anular una reparación ya anulada", () => {
    expect(() => voidRepair("voided", "Duplicada")).toThrow("ya está anulada")
  })
})

describe("accumulateActiveRepairCost", () => {
  it("suma solo las reparaciones activas y vigentes", () => {
    const result = accumulateActiveRepairCost([
      { currency: "USD", exchangeRate: "1", components: components({ laborCost: 100_00 }), status: "requested", voidedAt: null },
      { currency: "USD", exchangeRate: "1", components: components({ partsCost: 50_00 }), status: "completed", voidedAt: null },
      { currency: "USD", exchangeRate: "1", components: components({ otherCost: 20_00 }), status: "quoted", voidedAt: new Date("2026-08-21T00:00:00Z") },
      { currency: "MXN", exchangeRate: "20", components: components({ partsCost: 200_00 }), status: "inProgress", voidedAt: null },
    ])

    expect(result.total).toEqual({ amount: 110_00, currency: "USD" })
    expect(result.components.laborCost.amount).toBe(100_00)
    expect(result.components.partsCost.amount).toBe(10_00)
  })
})

describe("isActiveRepairStatus", () => {
  it("distingue estados activos de terminales", () => {
    expect(isActiveRepairStatus("requested")).toBe(true)
    expect(isActiveRepairStatus("inProgress")).toBe(true)
    expect(isActiveRepairStatus("completed")).toBe(false)
    expect(isActiveRepairStatus("voided")).toBe(false)
  })
})
