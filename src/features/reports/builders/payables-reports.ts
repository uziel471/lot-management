import { PAYMENT_SOURCE_TYPE_LABELS, PAYMENT_STATUS_LABELS } from "@/features/payments/enums"
import { money } from "../domain"
import { applyPayableFilters, payableActions, paymentApplicationActions, reportBase } from "./common"
import type { ReportId, ReportResolvedFilters, ReportResult } from "../types"
import type { ReportDataset } from "./common"

export function buildPayablesReport(
  reportId: Extract<
    ReportId,
    "accounts-payable" | "payment-history" | "unpaid-obligations" | "partially-paid-obligations" | "paid-obligations" | "provider-balances" | "payment-applications"
  >,
  dataset: ReportDataset,
  filters: ReportResolvedFilters,
): ReportResult {
  if (reportId === "payment-history") {
    const rows = dataset.payments
      .filter((payment) => {
        if (!filters.includeVoided && payment.voidedAt) return false
        if (filters.start && payment.paymentDate < filters.start) return false
        if (filters.end && payment.paymentDate > filters.end) return false
        if (filters.providerId && String(payment.providerId) !== filters.providerId) return false
        if (filters.paymentMethod && payment.method !== filters.paymentMethod) return false
        if (filters.search) {
          const providerName = payment.providerId ? dataset.vendorNames.get(String(payment.providerId)) ?? "" : ""
          const haystack = [payment.code, providerName, payment.method].join(" ").toLowerCase()
          if (!haystack.includes(filters.search.toLowerCase())) return false
        }
        return true
      })
      .map((payment) => ({
        id: String(payment._id),
        values: {
          code: payment.code,
          paymentDate: payment.paymentDate.toISOString(),
          providerName: payment.providerId ? (dataset.vendorNames.get(String(payment.providerId)) ?? "Sin proveedor") : "Sin proveedor",
          method: payment.method,
          currency: payment.currency,
          originalAmount: money(payment.amount),
          usdAmount: money(payment.currency === "USD" ? payment.amount : Math.round((payment.amount / Number(payment.exchangeRate.toString())))),
          applicationCount: payment.applications.length,
          status: payment.voidedAt ? "Anulado" : "Activo",
        },
        actions: [{ label: "Pago", href: `/pagos/${payment.code}` }],
      }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "code", label: "Pago", kind: "text" },
        { key: "paymentDate", label: "Fecha", kind: "date" },
        { key: "providerName", label: "Proveedor", kind: "text" },
        { key: "method", label: "Metodo", kind: "text" },
        { key: "currency", label: "Moneda", kind: "text" },
        { key: "originalAmount", label: "Importe original", kind: "money", align: "right" },
        { key: "usdAmount", label: "USD", kind: "money", align: "right" },
        { key: "applicationCount", label: "Aplicaciones", kind: "number", align: "right" },
        { key: "status", label: "Estatus", kind: "text" },
      ],
      [{ key: "count", label: "Pagos", kind: "number", value: rows.length }],
      ["Los pagos anulados no afectan saldos, pero pueden incluirse para consulta cuando el filtro lo permite."],
    )
  }

  if (reportId === "provider-balances") {
    const payables = applyPayableFilters(dataset, filters)
    const grouped = new Map<string, { providerName: string; obligationUsd: number; paidUsd: number; pendingUsd: number; count: number }>()
    for (const payable of payables) {
      const key = payable.providerId ?? "missing"
      const current = grouped.get(key) ?? {
        providerName: payable.providerName ?? "Sin proveedor",
        obligationUsd: 0,
        paidUsd: 0,
        pendingUsd: 0,
        count: 0,
      }
      current.obligationUsd += payable.originalUsd
      current.paidUsd += payable.paidUsd
      current.pendingUsd += payable.pendingUsd
      current.count += 1
      grouped.set(key, current)
    }
    const rows = Array.from(grouped.entries()).map(([id, value]) => ({
      id,
      values: {
        providerName: value.providerName,
        obligationUsd: money(value.obligationUsd),
        paidUsd: money(value.paidUsd),
        pendingUsd: money(value.pendingUsd),
        count: value.count,
      },
      actions: [],
    }))
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "providerName", label: "Proveedor", kind: "text" },
        { key: "obligationUsd", label: "Obligado", kind: "money", align: "right" },
        { key: "paidUsd", label: "Pagado", kind: "money", align: "right" },
        { key: "pendingUsd", label: "Pendiente", kind: "money", align: "right" },
        { key: "count", label: "Documentos", kind: "number", align: "right" },
      ],
      [{ key: "providers", label: "Proveedores", kind: "number", value: rows.length }],
      ["Saldo pendiente = obligaciones activas - aplicaciones de pagos activos no anulados."],
    )
  }

  if (reportId === "payment-applications") {
    const rows = dataset.payments.flatMap((payment) =>
      payment.applications.map((application, index) => ({
        id: `${payment._id}:${index}`,
        values: {
          paymentCode: payment.code,
          paymentDate: payment.paymentDate.toISOString(),
          sourceType: PAYMENT_SOURCE_TYPE_LABELS[application.sourceType],
          sourceCode: application.sourceCode,
          appliedAmount: money(application.appliedAmount),
          appliedUsd: money(application.appliedUsd),
          status: payment.voidedAt ? "Anulado" : "Activo",
        },
        actions: paymentApplicationActions(application, payment),
      })),
    )
    return reportBase(
      reportId,
      filters,
      rows,
      [
        { key: "paymentCode", label: "Pago", kind: "text" },
        { key: "paymentDate", label: "Fecha", kind: "date" },
        { key: "sourceType", label: "Tipo origen", kind: "text" },
        { key: "sourceCode", label: "Codigo origen", kind: "text" },
        { key: "appliedAmount", label: "Aplicado original", kind: "money", align: "right" },
        { key: "appliedUsd", label: "Aplicado USD", kind: "money", align: "right" },
        { key: "status", label: "Estatus pago", kind: "text" },
      ],
      [{ key: "applications", label: "Aplicaciones", kind: "number", value: rows.length }],
      ["Las aplicaciones de pagos anulados se muestran solo para auditoria cuando aplica el filtro."],
    )
  }

  const statusFilter =
    reportId === "unpaid-obligations"
      ? "unpaid"
      : reportId === "partially-paid-obligations"
        ? "partial"
        : reportId === "paid-obligations"
          ? "paid"
          : filters.reportStatus
  const payables = applyPayableFilters(dataset, { ...filters, reportStatus: statusFilter })
  const rows = payables.map((payable) => ({
    id: payable.id,
    values: {
      sourceLabel: payable.sourceLabel,
      code: payable.code,
      date: payable.date.toISOString(),
      providerName: payable.providerName ?? "Sin proveedor",
      vehicleCode: payable.vehicleCode,
      originalUsd: money(payable.originalUsd),
      paidUsd: money(payable.paidUsd),
      pendingUsd: money(payable.pendingUsd),
      status: PAYMENT_STATUS_LABELS[payable.status],
      dueDate: null,
    },
    actions: payableActions(payable),
  }))
  return reportBase(
    reportId,
    filters,
    rows,
    [
      { key: "sourceLabel", label: "Origen", kind: "text" },
      { key: "code", label: "Codigo", kind: "text" },
      { key: "date", label: "Fecha", kind: "date" },
      { key: "providerName", label: "Proveedor", kind: "text" },
      { key: "vehicleCode", label: "Vehiculo", kind: "text" },
      { key: "originalUsd", label: "Original USD", kind: "money", align: "right" },
      { key: "paidUsd", label: "Pagado USD", kind: "money", align: "right" },
      { key: "pendingUsd", label: "Pendiente USD", kind: "money", align: "right" },
      { key: "status", label: "Estatus", kind: "text" },
      { key: "dueDate", label: "Vencimiento", kind: "text" },
    ],
    [
      { key: "count", label: "Documentos", kind: "number", value: rows.length },
      { key: "pending", label: "Saldo pendiente", kind: "money", value: money(rows.reduce((sum, row) => sum + ((row.values.pendingUsd as ReturnType<typeof money>)?.amount ?? 0), 0)) },
    ],
    ["Saldo pendiente = total del documento - pagos activos no anulados aplicados al documento."],
  )
}
