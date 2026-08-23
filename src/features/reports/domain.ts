import { formatMoney } from "@/lib/money"
import { REPORT_EXPORT_ROLES as SHARED_REPORT_EXPORT_ROLES, REPORT_READ_ROLES as SHARED_REPORT_READ_ROLES } from "@/lib/auth/permissions"
import type { Money } from "@/types/money"
import type {
  ReportAvailabilityNote,
  ReportDateBasis,
  ReportExportDescriptor,
  ReportExportFormat,
  ReportFilterKey,
  ReportFilterValue,
  ReportPeriodPreset,
  ReportResolvedFilters,
  ReportResult,
} from "./types"

export const REPORT_READ_ROLES = SHARED_REPORT_READ_ROLES
export const REPORT_EXPORT_ROLES = SHARED_REPORT_EXPORT_ROLES

export const REPORT_CATEGORY_LABELS = {
  financial: "Financieros",
  inventory: "Inventario",
  sales: "Ventas",
  payablesPayments: "Cuentas por pagar y pagos",
  expenses: "Gastos",
  operations: "Operativos",
  taxPreparation: "Preparacion fiscal",
  audit: "Auditoria",
} as const

export const REPORT_EXPORT_LIMITS: Record<ReportExportFormat, number> = {
  csv: 5_000,
  pdf: 500,
}

export function reportExportDescriptors(
  formats: readonly ReportExportFormat[],
): ReportExportDescriptor[] {
  return formats.map((format) => ({
    format,
    label: format === "csv" ? "CSV" : "PDF",
    maxRows: REPORT_EXPORT_LIMITS[format],
  }))
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

function parseDate(value: string | undefined) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function resolveReportPeriod(
  preset: ReportPeriodPreset | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
  today = new Date(),
) {
  const basePreset = preset ?? "thisMonth"
  const utcToday = startOfUtcDay(today)
  const year = utcToday.getUTCFullYear()
  const month = utcToday.getUTCMonth()

  if (basePreset === "custom") {
    const start = parseDate(startDate)
    const end = parseDate(endDate)
    return {
      preset: basePreset,
      start: start ? startOfUtcDay(start) : null,
      end: end ? endOfUtcDay(end) : null,
    }
  }

  if (basePreset === "allTime") {
    return { preset: basePreset, start: null, end: null }
  }

  if (basePreset === "yearToDate") {
    return {
      preset: basePreset,
      start: new Date(Date.UTC(year, 0, 1)),
      end: endOfUtcDay(utcToday),
    }
  }

  if (basePreset === "last12Months") {
    return {
      preset: basePreset,
      start: new Date(Date.UTC(year - 1, month, utcToday.getUTCDate())),
      end: endOfUtcDay(utcToday),
    }
  }

  if (basePreset === "lastMonth") {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
    return { preset: basePreset, start, end }
  }

  return {
    preset: "thisMonth" as const,
    start: new Date(Date.UTC(year, month, 1)),
    end: endOfUtcDay(utcToday),
  }
}

export function validateDateRange(start: Date | null, end: Date | null) {
  if (start && end && start.getTime() > end.getTime()) {
    return "La fecha inicial no puede ser posterior a la fecha final."
  }
  return null
}

export function resolveReportFilters(
  input: ReportFilterValue,
  supportedFilters: readonly ReportFilterKey[],
  today = new Date(),
): { filters: ReportResolvedFilters; error: string | null } {
  const base = resolveReportPeriod(input.preset, input.startDate, input.endDate, today)
  const filters: ReportResolvedFilters = {
    preset: base.preset,
    includeVoided: Boolean(input.includeVoided && supportedFilters.includes("includeVoided")),
    start: base.start,
    end: base.end,
    startDate: supportedFilters.includes("startDate") ? input.startDate : undefined,
    endDate: supportedFilters.includes("endDate") ? input.endDate : undefined,
    vehicleId: supportedFilters.includes("vehicleId") ? input.vehicleId : undefined,
    vehicleStatusId: supportedFilters.includes("vehicleStatusId") ? input.vehicleStatusId : undefined,
    providerId: supportedFilters.includes("providerId") ? input.providerId : undefined,
    buyer: supportedFilters.includes("buyer") ? input.buyer?.trim() || undefined : undefined,
    paymentMethod: supportedFilters.includes("paymentMethod")
      ? input.paymentMethod?.trim() || undefined
      : undefined,
    category: supportedFilters.includes("category") ? input.category?.trim() || undefined : undefined,
    reportStatus: supportedFilters.includes("reportStatus")
      ? input.reportStatus?.trim() || undefined
      : undefined,
    search: supportedFilters.includes("search") ? input.search?.trim() || undefined : undefined,
    missingField: supportedFilters.includes("missingField")
      ? input.missingField?.trim() || undefined
      : undefined,
  }

  return {
    filters,
    error: validateDateRange(filters.start, filters.end),
  }
}

export function inInclusiveRange(date: Date, start: Date | null, end: Date | null) {
  const time = date.getTime()
  if (start && time < start.getTime()) return false
  if (end && time > end.getTime()) return false
  return true
}

export function basisLabel(basis: ReportDateBasis) {
  switch (basis) {
    case "saleDate":
      return "Fecha de venta"
    case "paymentDate":
      return "Fecha de pago"
    case "expenseDate":
      return "Fecha de gasto"
    case "purchaseDate":
      return "Fecha de compra"
    case "repairOpenedAt":
      return "Fecha de apertura de reparacion"
    case "dateReceived":
      return "Fecha de recepcion"
    case "currentState":
      return "Estado actual"
  }
}

export function availabilityNote(
  code: ReportAvailabilityNote["code"],
  reason: string,
): ReportAvailabilityNote {
  return { code, reason }
}

export function money(amount: number): Money {
  return { amount, currency: "USD" }
}

export function divideAsPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 10_000) / 100
}

export function average(numbers: readonly number[]) {
  if (numbers.length === 0) return null
  return Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 100) / 100
}

export function csvEscape(value: string) {
  if (/[\",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`
  }
  return value
}

export function formatCell(value: unknown, kind: string) {
  if (value === null || value === undefined) return "—"
  if (kind === "money") return formatMoney(value as Money)
  if (kind === "percent") return typeof value === "number" ? `${value.toFixed(2)}%` : String(value)
  if (kind === "boolean") return value ? "Si" : "No"
  if (kind === "date") return String(value).slice(0, 10)
  if (typeof value === "number") return new Intl.NumberFormat("es-MX").format(value)
  return String(value)
}

export function toCsv(result: ReportResult, maxRows: number): string {
  const rows = result.rows.slice(0, maxRows)
  const lines: string[] = []
  lines.push(csvEscape(result.metadata.title))
  lines.push(`Generado,${csvEscape(result.metadata.generatedAt)}`)
  lines.push(`Base de fecha,${csvEscape(basisLabel(result.metadata.dateBasis))}`)
  for (const [key, value] of Object.entries(result.selectedFilters)) {
    if (value === undefined || value === null || value === "" || key === "start" || key === "end") continue
    lines.push(`${csvEscape(key)},${csvEscape(String(value))}`)
  }
  for (const note of result.availabilityNotes) {
    lines.push(`Disponibilidad,${csvEscape(note.reason)}`)
  }
  if (rows.length < result.rows.length) {
    lines.push(`Limite,${rows.length} de ${result.rows.length} filas exportadas`)
  }
  lines.push("")
  lines.push(result.columns.map((column) => csvEscape(column.label)).join(","))
  for (const row of rows) {
    lines.push(
      result.columns
        .map((column) => csvEscape(formatCell(row.values[column.key], column.kind)))
        .join(","),
    )
  }
  if (result.summaries.length > 0) {
    lines.push("")
    lines.push("Resumen")
    for (const summary of result.summaries) {
      lines.push(`${csvEscape(summary.label)},${csvEscape(formatCell(summary.value, summary.kind))}`)
    }
  }
  return lines.join("\n")
}

export function truncateReportRows(result: ReportResult, maxRows: number) {
  if (result.rows.length <= maxRows) return result
  return {
    ...result,
    rows: result.rows.slice(0, maxRows),
    availabilityNotes: [
      ...result.availabilityNotes,
      availabilityNote(
        "exportLimit",
        `La exportacion se limito a ${maxRows} filas por restricciones del servidor.`,
      ),
    ],
  }
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function wrapText(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [""]
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

function color(r: number, g: number, b: number) {
  return `${r} ${g} ${b}`
}

function drawText(
  lines: string[],
  text: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2" = "F1",
  rgb = color(0.06, 0.09, 0.16),
) {
  lines.push("BT")
  lines.push(`/${font} ${size} Tf`)
  lines.push(`${rgb} rg`)
  lines.push(`${x} ${y} Td`)
  lines.push(`(${escapePdfText(text)}) Tj`)
  lines.push("ET")
}

function drawWrappedText(
  lines: string[],
  text: string,
  x: number,
  y: number,
  size: number,
  maxChars: number,
  lineHeight: number,
  font: "F1" | "F2" = "F1",
  rgb = color(0.30, 0.36, 0.45),
) {
  const wrapped = wrapText(text, maxChars)
  wrapped.forEach((part, index) => {
    drawText(lines, part, x, y - index * lineHeight, size, font, rgb)
  })
  return wrapped.length
}

function drawFilledRect(lines: string[], x: number, y: number, width: number, height: number, rgb: string) {
  lines.push(`${rgb} rg`)
  lines.push(`${x} ${y} ${width} ${height} re f`)
}

function drawStrokedRect(lines: string[], x: number, y: number, width: number, height: number, rgb: string, lineWidth = 1) {
  lines.push(`${lineWidth} w`)
  lines.push(`${rgb} RG`)
  lines.push(`${x} ${y} ${width} ${height} re S`)
}

function pdfContentStream(result: ReportResult) {
  const pageWidth = 842
  const pageHeight = 595
  const margin = 28
  const headerHeight = 92
  const tableHeaderHeight = 22
  const rowHeight = 18
  const contentWidth = pageWidth - margin * 2
  const columnWidth = contentWidth / Math.max(result.columns.length, 1)
  const pages: string[] = []
  const topMeta = [
    `Categoria: ${result.metadata.category}`,
    `Base de fecha: ${basisLabel(result.metadata.dateBasis)}`,
    `Generado: ${result.metadata.generatedAt.slice(0, 19).replace("T", " ")}`,
  ]

  const tableRows = result.rows.map((row) =>
    result.columns.map((column) => formatCell(row.values[column.key], column.kind)),
  )

  const introLines = [
    ...topMeta,
    ...Object.entries(result.selectedFilters)
      .filter(([key, value]) => value !== undefined && value !== null && value !== "" && key !== "start" && key !== "end")
      .map(([key, value]) => `${key}: ${String(value)}`),
    ...result.formulas.map((formula) => `Formula: ${formula}`),
    ...result.availabilityNotes.map((note) => `Nota: ${note.reason}`),
  ]

  let rowIndex = 0
  let pageIndex = 0

  while (rowIndex < tableRows.length || pageIndex === 0) {
    const lines: string[] = []
    drawFilledRect(lines, 0, pageHeight - headerHeight, pageWidth, headerHeight, color(0.95, 0.98, 1))
    drawFilledRect(lines, margin, pageHeight - headerHeight + 18, 120, 18, color(0.91, 0.98, 0.98))
    drawText(lines, "REPORTE OPERATIVO", margin + 10, pageHeight - 46, 9, "F2", color(0.05, 0.46, 0.43))
    drawText(lines, result.metadata.title, margin, pageHeight - 68, 22, "F2", color(0.06, 0.09, 0.16))
    drawWrappedText(lines, result.metadata.description, margin, pageHeight - 86, 9, 110, 11, "F1", color(0.32, 0.38, 0.47))

    let y = pageHeight - headerHeight - 16
    if (pageIndex === 0) {
      const metricWidth = (contentWidth - 24) / Math.max(Math.min(result.summaries.length, 4), 1)
      result.summaries.slice(0, 4).forEach((summary, index) => {
        const x = margin + index * (metricWidth + 8)
        drawFilledRect(lines, x, y - 54, metricWidth, 48, color(0.97, 0.98, 0.99))
        drawStrokedRect(lines, x, y - 54, metricWidth, 48, color(0.86, 0.90, 0.94), 0.7)
        drawText(lines, summary.label, x + 10, y - 18, 8, "F1", color(0.37, 0.43, 0.51))
        drawText(lines, formatCell(summary.value, summary.kind), x + 10, y - 36, 14, "F2", color(0.06, 0.09, 0.16))
      })
      y -= 70

      introLines.slice(0, 10).forEach((line) => {
        const used = drawWrappedText(lines, line, margin, y, 8, 132, 10, "F1", color(0.32, 0.38, 0.47))
        y -= used * 10 + 2
      })
      y -= 8
    }

    drawFilledRect(lines, margin, y - tableHeaderHeight, contentWidth, tableHeaderHeight, color(0.94, 0.96, 0.98))
    drawStrokedRect(lines, margin, y - tableHeaderHeight, contentWidth, tableHeaderHeight, color(0.84, 0.88, 0.92), 0.7)
    result.columns.forEach((column, index) => {
      const x = margin + index * columnWidth + 6
      drawText(lines, column.label.slice(0, 24), x, y - 15, 8, "F2", color(0.30, 0.36, 0.45))
    })
    y -= tableHeaderHeight

    const maxRows = Math.max(10, Math.floor((y - margin - 26) / rowHeight))
    const endIndex = Math.min(rowIndex + maxRows, tableRows.length)
    for (let current = rowIndex; current < endIndex; current += 1) {
      const rowY = y - (current - rowIndex + 1) * rowHeight
      if ((current - rowIndex) % 2 === 0) {
        drawFilledRect(lines, margin, rowY, contentWidth, rowHeight, color(0.99, 0.99, 1))
      }
      drawStrokedRect(lines, margin, rowY, contentWidth, rowHeight, color(0.92, 0.94, 0.96), 0.4)
      tableRows[current]!.forEach((cell, index) => {
        const maxChars = Math.max(8, Math.floor(columnWidth / 5.9))
        const text = cell.length > maxChars ? `${cell.slice(0, maxChars - 1)}…` : cell
        drawText(lines, text, margin + index * columnWidth + 6, rowY + 6, 7.5, "F1", color(0.10, 0.14, 0.20))
      })
    }

    drawText(
      lines,
      `Pagina ${pageIndex + 1} · Filas ${rowIndex + 1}-${Math.max(rowIndex + 1, endIndex)} de ${Math.max(result.rows.length, 1)}`,
      margin,
      18,
      8,
      "F1",
      color(0.42, 0.48, 0.56),
    )

    pages.push(lines.join("\n"))
    rowIndex = endIndex
    pageIndex += 1
  }

  return pages
}

export function styledPdfFromReport(result: ReportResult): Uint8Array {
  const contents = pdfContentStream(result)
  const objects: string[] = []
  const addObject = (body: string) => {
    objects.push(body)
    return objects.length
  }

  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
  const pageIds: number[] = []
  const contentIds: number[] = []
  const pageWidth = 842
  const pageHeight = 595

  for (const content of contents) {
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    contentIds.push(contentId)
    pageIds.push(0)
  }

  const pagesId = addObject("<< /Type /Pages /Kids [] /Count 0 >>")
  for (let index = 0; index < contentIds.length; index += 1) {
    pageIds[index] = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`,
    )
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  let output = "%PDF-1.4\n"
  const offsets: number[] = [0]
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(output.length)
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`
  }
  const xrefOffset = output.length
  output += `xref\n0 ${objects.length + 1}\n`
  output += "0000000000 65535 f \n"
  for (let index = 1; index < offsets.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`
  }
  output += `trailer << /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new TextEncoder().encode(output)
}
