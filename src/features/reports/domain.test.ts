import { describe, expect, it } from "vitest"
import { resolveReportFilters, resolveReportPeriod, styledPdfFromReport, toCsv } from "./domain"
import type { ReportResult } from "./types"

describe("reports domain", () => {
  it("resolves year to date with inclusive bounds", () => {
    const period = resolveReportPeriod("yearToDate", undefined, undefined, new Date("2026-08-23T12:00:00.000Z"))
    expect(period.start?.toISOString()).toBe("2026-01-01T00:00:00.000Z")
    expect(period.end?.toISOString()).toBe("2026-08-23T23:59:59.999Z")
  })

  it("rejects invalid custom ranges", () => {
    const { error } = resolveReportFilters(
      { preset: "custom", startDate: "2026-08-23", endDate: "2026-08-01" },
      ["preset", "startDate", "endDate"],
      new Date("2026-08-23T12:00:00.000Z"),
    )
    expect(error).toContain("fecha inicial")
  })

  it("exports csv and styled pdf from normalized report data", () => {
    const result: ReportResult = {
      metadata: {
        id: "profit-loss",
        category: "financial",
        title: "Profit and loss",
        description: "Resumen",
        dateBasis: "saleDate",
        supportedFilters: ["preset"],
        supportedExports: ["csv", "pdf"],
        roles: ["admin", "lectura"],
        availability: "available",
        availabilityNotes: [],
        exportDescriptors: [
          { format: "csv", label: "CSV", maxRows: 5000 },
          { format: "pdf", label: "PDF", maxRows: 500 },
        ],
        lastGeneratedAt: null,
        generatedAt: "2026-08-23T00:00:00.000Z",
      },
      selectedFilters: {
        preset: "thisMonth",
        includeVoided: false,
        start: new Date("2026-08-01T00:00:00.000Z"),
        end: new Date("2026-08-23T23:59:59.999Z"),
      },
      summaries: [{ key: "net", label: "Neto", kind: "money", value: { amount: 1200, currency: "USD" } }],
      columns: [{ key: "code", label: "Codigo", kind: "text" }],
      rows: [{ id: "1", values: { code: "SALE-1" }, actions: [] }],
      formulas: [],
      availabilityNotes: [],
    }

    expect(toCsv(result, 100)).toContain("Profit and loss")
    expect(new TextDecoder().decode(styledPdfFromReport(result)).startsWith("%PDF-1.4")).toBe(true)
  })
})
