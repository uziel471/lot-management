import { REPAIR_STATUS_LABELS } from "@/features/repairs/enums"
import { money } from "../domain"
import { applySalesFilters, buildCurrentInventoryCost, reportBase, saleVehicleActions } from "./common"
import type { ReportId, ReportResolvedFilters, ReportResult } from "../types"
import type { ReportDataset } from "./common"

export function buildAdminReport(
  reportId: Extract<ReportId, "sales-register" | "sales-tax-preparation" | "vendor-payments" | "administrative-exceptions">,
  dataset: ReportDataset,
  filters: ReportResolvedFilters,
): ReportResult {
  if (reportId === "sales-register" || reportId === "sales-tax-preparation") {
    const sales = applySalesFilters(dataset, filters)
    const rows = sales.map((sale) => {
      const vehicle = dataset.vehicleById.get(String(sale.vehicleId))
      return {
        id: String(sale._id),
        values: {
          code: sale.code,
          saleDate: sale.saleDate.toISOString(),
          vehicleCode: vehicle?.code ?? "—",
          vehicleDescription: vehicle?.description ?? "—",
          buyerName: sale.buyerName,
          salePriceUsd: money(sale.salePriceUsd),
          totalCostUsd: money(sale.totalCostUsd),
          grossProfitUsd: money(sale.profitUsd),
          paymentStatus: "No capturado",
          referenceNumber: sale.referenceNumber,
          voidedStatus: sale.voidedAt ? "Anulada" : "Activa",
          salesTaxCollected: null,
          jurisdiction: null,
          exemptionStatus: null,
          filingTreatment: null,
        },
        actions: saleVehicleActions(sale, dataset),
      }
    })
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Venta", kind: "text" },
        { key: "saleDate", label: "Fecha", kind: "date" },
        { key: "vehicleCode", label: "Vehiculo", kind: "text" },
        { key: "buyerName", label: "Comprador", kind: "text" },
        { key: "salePriceUsd", label: "Precio", kind: "money", align: "right" },
        { key: "totalCostUsd", label: "Costo", kind: "money", align: "right" },
        { key: "grossProfitUsd", label: "Profit", kind: "money", align: "right" },
        { key: "paymentStatus", label: "Pago", kind: "text" },
        { key: "referenceNumber", label: "Referencia", kind: "text" },
        { key: "voidedStatus", label: "Estatus", kind: "text" },
        ...(reportId === "sales-tax-preparation"
          ? [
              { key: "salesTaxCollected", label: "Sales tax", kind: "text" as const },
              { key: "jurisdiction", label: "Jurisdiccion", kind: "text" as const },
              { key: "exemptionStatus", label: "Exencion", kind: "text" as const },
              { key: "filingTreatment", label: "Tratamiento", kind: "text" as const },
            ]
          : []),
      ],
      [{ key: "count", label: "Ventas", kind: "number", value: rows.length }],
      [
        reportId === "sales-tax-preparation"
          ? "Los campos regulatorios no capturados se marcan como no disponibles."
          : "Registro de ventas basado en snapshots congelados de la venta.",
      ],
    )
  }

  if (reportId === "vendor-payments") {
    const rows = dataset.payables
      .filter((payable) => {
        if (filters.providerId && payable.providerId !== filters.providerId) return false
        if (filters.start && payable.date < filters.start) return false
        if (filters.end && payable.date > filters.end) return false
        return true
      })
      .map((payable) => ({
        id: payable.id,
        values: {
          sourceLabel: payable.sourceLabel,
          code: payable.code,
          providerName: payable.providerName ?? "Sin proveedor",
          originalUsd: money(payable.originalUsd),
          paidUsd: money(payable.paidUsd),
          pendingUsd: money(payable.pendingUsd),
          status: payable.status,
        },
        actions: [{ label: "Abrir", href: payable.href }],
      }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "sourceLabel", label: "Origen", kind: "text" },
        { key: "code", label: "Codigo", kind: "text" },
        { key: "providerName", label: "Proveedor", kind: "text" },
        { key: "originalUsd", label: "Original USD", kind: "money", align: "right" },
        { key: "paidUsd", label: "Pagado USD", kind: "money", align: "right" },
        { key: "pendingUsd", label: "Pendiente USD", kind: "money", align: "right" },
        { key: "status", label: "Estatus", kind: "text" },
      ],
      [{ key: "count", label: "Documentos", kind: "number", value: rows.length }],
      ["Soporte administrativo por proveedor con obligaciones y saldos pendientes."],
    )
  }

  const rows = [
    ...dataset.activeVehicles
      .filter((vehicle) => !vehicle.titleInHand || !vehicle.vin || !vehicle.stockNumber || vehicle.daysInInventory > 90)
      .map((vehicle) => ({
        id: `vehicle:${vehicle.id}`,
        values: {
          type: "Vehiculo",
          code: vehicle.code,
          description: vehicle.description,
          reason: !vehicle.titleInHand
            ? "Titulo pendiente"
            : !vehicle.vin
              ? "VIN faltante"
              : !vehicle.stockNumber
                ? "No. inventario faltante"
                : "Inventario antiguo",
          status: vehicle.statusName,
        },
        actions: [{ label: "Vehiculo", href: `/vehiculos/${vehicle.code}` }],
      })),
    ...dataset.activeSales
      .filter((sale) => sale.profitUsd < 0)
      .map((sale) => ({
        id: `sale:${sale._id}`,
        values: {
          type: "Venta",
          code: sale.code,
          description: dataset.vehicleById.get(String(sale.vehicleId))?.description ?? "—",
          reason: "Margen negativo",
          status: "Activa",
        },
        actions: saleVehicleActions(sale, dataset),
      })),
    ...dataset.payables
      .filter((payable) => payable.pendingUsd > 0 && !payable.providerName)
      .map((payable) => ({
        id: `payable:${payable.id}`,
        values: {
          type: payable.sourceLabel,
          code: payable.code,
          description: payable.vehicleDescription ?? payable.sourceLabel,
          reason: "Saldo pendiente sin proveedor",
          status: payable.status,
        },
        actions: [{ label: "Abrir", href: payable.href }],
      })),
  ]

  return reportBase(
    reportId,
    filters,
    rows,
    [
      { key: "type", label: "Tipo", kind: "text" },
      { key: "code", label: "Codigo", kind: "text" },
      { key: "description", label: "Descripcion", kind: "text" },
      { key: "reason", label: "Motivo", kind: "text" },
      { key: "status", label: "Estatus", kind: "text" },
    ],
    [{ key: "count", label: "Excepciones", kind: "number", value: rows.length }],
    ["Lista de registros que requieren atencion administrativa inmediata."],
  )
}
