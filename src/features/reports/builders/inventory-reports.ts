import { applyVehicleFilters, buildCurrentInventoryCost, reportBase } from "./common"
import { money } from "../domain"
import type { ReportId, ReportResolvedFilters, ReportResult } from "../types"
import type { ReportDataset } from "./common"

export function buildInventoryReport(
  reportId: Extract<
    ReportId,
    "current-inventory" | "inventory-aging" | "vehicles-by-status" | "vehicles-without-title" | "inventory-without-list-price" | "missing-identifiers"
  >,
  dataset: ReportDataset,
  filters: ReportResolvedFilters,
): ReportResult {
  const vehicles = applyVehicleFilters(dataset, filters)

  if (reportId === "inventory-aging") {
    const rows = vehicles.map((vehicle) => ({
      id: vehicle.id,
      values: {
        code: vehicle.code,
        description: vehicle.description,
        dateReceived: vehicle.dateReceived,
        daysInInventory: vehicle.daysInInventory,
        bucket:
          vehicle.daysInInventory <= 30
            ? "0-30"
            : vehicle.daysInInventory <= 60
              ? "31-60"
              : vehicle.daysInInventory <= 90
                ? "61-90"
                : "90+",
      },
      actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
    }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Vehiculo", kind: "text" },
        { key: "description", label: "Descripcion", kind: "text" },
        { key: "dateReceived", label: "Fecha recepcion", kind: "date" },
        { key: "daysInInventory", label: "Dias", kind: "number", align: "right" },
        { key: "bucket", label: "Bucket", kind: "text" },
      ],
      [
        { key: "0-30", label: "0-30 dias", kind: "number", value: rows.filter((row) => row.values.bucket === "0-30").length },
        { key: "31-60", label: "31-60 dias", kind: "number", value: rows.filter((row) => row.values.bucket === "31-60").length },
        { key: "61-90", label: "61-90 dias", kind: "number", value: rows.filter((row) => row.values.bucket === "61-90").length },
        { key: "90+", label: "90+ dias", kind: "number", value: rows.filter((row) => row.values.bucket === "90+").length },
      ],
      ["Bucket por dias en inventario usando la fecha de recepcion y la fecha actual."],
    )
  }

  if (reportId === "vehicles-by-status") {
    const rows = vehicles.map((vehicle) => ({
      id: vehicle.id,
      values: {
        code: vehicle.code,
        description: vehicle.description,
        status: vehicle.statusName,
        daysInInventory: vehicle.daysInInventory,
      },
      actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
    }))
    const counts = new Map<string, number>()
    for (const vehicle of vehicles) {
      counts.set(vehicle.statusName, (counts.get(vehicle.statusName) ?? 0) + 1)
    }
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Vehiculo", kind: "text" },
        { key: "description", label: "Descripcion", kind: "text" },
        { key: "status", label: "Estatus", kind: "text" },
        { key: "daysInInventory", label: "Dias", kind: "number", align: "right" },
      ],
      Array.from(counts.entries()).map(([status, value]) => ({ key: status, label: status, kind: "number" as const, value })),
      ["Agrupacion por estatus actual del vehiculo, sin reconstruccion historica."],
    )
  }

  if (reportId === "vehicles-without-title") {
    const rows = vehicles
      .filter((vehicle) => !vehicle.titleInHand)
      .map((vehicle) => ({
        id: vehicle.id,
        values: {
          code: vehicle.code,
          description: vehicle.description,
          dateReceived: vehicle.dateReceived,
          daysInInventory: vehicle.daysInInventory,
          titleNumber: vehicle.titleNumber,
          titleInHand: vehicle.titleInHand,
        },
        actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
      }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Vehiculo", kind: "text" },
        { key: "description", label: "Descripcion", kind: "text" },
        { key: "dateReceived", label: "Fecha recepcion", kind: "date" },
        { key: "daysInInventory", label: "Dias", kind: "number", align: "right" },
        { key: "titleNumber", label: "Titulo", kind: "text" },
        { key: "titleInHand", label: "En mano", kind: "boolean", align: "center" },
      ],
      [{ key: "count", label: "Vehiculos sin titulo", kind: "number", value: rows.length }],
      ["Un vehiculo aparece aqui cuando titleInHand es falso."],
    )
  }

  if (reportId === "inventory-without-list-price") {
    const rows = vehicles
      .filter((vehicle) => vehicle.askingPriceUsd === null)
      .map((vehicle) => ({
        id: vehicle.id,
        values: {
          code: vehicle.code,
          description: vehicle.description,
          status: vehicle.statusName,
          dateReceived: vehicle.dateReceived,
          daysInInventory: vehicle.daysInInventory,
        },
        actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
      }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Vehiculo", kind: "text" },
        { key: "description", label: "Descripcion", kind: "text" },
        { key: "status", label: "Estatus", kind: "text" },
        { key: "dateReceived", label: "Fecha recepcion", kind: "date" },
        { key: "daysInInventory", label: "Dias", kind: "number", align: "right" },
      ],
      [{ key: "count", label: "Sin precio de lista", kind: "number", value: rows.length }],
      ["El reporte usa el campo askingPrice actual del vehiculo."],
    )
  }

  if (reportId === "missing-identifiers") {
    const rows = vehicles
      .filter((vehicle) => {
        if (filters.missingField === "vin") return !vehicle.vin
        if (filters.missingField === "stockNumber") return !vehicle.stockNumber
        if (filters.missingField === "titleNumber") return !vehicle.titleNumber
        if (filters.missingField === "askingPrice") return vehicle.askingPriceUsd === null
        return !vehicle.vin || !vehicle.stockNumber || !vehicle.titleNumber || vehicle.askingPriceUsd === null
      })
      .map((vehicle) => ({
        id: vehicle.id,
        values: {
          code: vehicle.code,
          description: vehicle.description,
          vin: vehicle.vin,
          stockNumber: vehicle.stockNumber,
          titleNumber: vehicle.titleNumber,
          askingPriceUsd: vehicle.askingPriceUsd === null ? null : money(vehicle.askingPriceUsd),
        },
        actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
      }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Vehiculo", kind: "text" },
        { key: "description", label: "Descripcion", kind: "text" },
        { key: "vin", label: "VIN", kind: "text" },
        { key: "stockNumber", label: "No. inventario", kind: "text" },
        { key: "titleNumber", label: "No. titulo", kind: "text" },
        { key: "askingPriceUsd", label: "Precio lista", kind: "money", align: "right" },
      ],
      [{ key: "count", label: "Registros con faltantes", kind: "number", value: rows.length }],
      ["Muestra identificadores faltantes soportados por el modelo de vehiculos."],
    )
  }

  const rows = vehicles.map((vehicle) => {
    const cost = buildCurrentInventoryCost(dataset, vehicle.id)
    return {
      id: vehicle.id,
      values: {
        code: vehicle.code,
        description: vehicle.description,
        status: vehicle.statusName,
        dateReceived: vehicle.dateReceived,
        daysInInventory: vehicle.daysInInventory,
        totalCostUsd: money(cost.total),
        askingPriceUsd: vehicle.askingPriceUsd === null ? null : money(vehicle.askingPriceUsd),
      },
      actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
    }
  })
  return reportBase(
    reportId,
    filters,
    rows,
    [
      { key: "code", label: "Vehiculo", kind: "text" },
      { key: "description", label: "Descripcion", kind: "text" },
      { key: "status", label: "Estatus", kind: "text" },
      { key: "dateReceived", label: "Fecha recepcion", kind: "date" },
      { key: "daysInInventory", label: "Dias", kind: "number", align: "right" },
      { key: "totalCostUsd", label: "Costo actual", kind: "money", align: "right" },
      { key: "askingPriceUsd", label: "Precio lista", kind: "money", align: "right" },
    ],
    [
      { key: "units", label: "Unidades", kind: "number", value: rows.length },
      {
        key: "value",
        label: "Valor inventario",
        kind: "money",
        value: money(rows.reduce((sum, row) => sum + ((row.values.totalCostUsd as ReturnType<typeof money>)?.amount ?? 0), 0)),
      },
    ],
    ["Inventario actual = vehiculos no vendidos ni anulados al momento de consultar."],
  )
}
