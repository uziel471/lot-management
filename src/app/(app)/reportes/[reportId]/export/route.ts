import type { NextRequest } from "next/server"
import { REPORT_IDS, type ReportExportFormat, type ReportId } from "@/features/reports/types"
import { getReportExport } from "@/features/reports/queries"

function first(value: string | string[] | null) {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function optional(value: string | null) {
  return value ?? undefined
}

export async function GET(request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params
  if (!(REPORT_IDS as readonly string[]).includes(reportId)) {
    return new Response("Not found", { status: 404 })
  }
  const { searchParams } = request.nextUrl
  const format = first(searchParams.getAll("format")) as ReportExportFormat | null
  if (format !== "csv" && format !== "pdf") {
    return new Response("Invalid export format", { status: 400 })
  }
  const payload = await getReportExport(reportId as ReportId, {
    preset: first(searchParams.getAll("preset")) as never,
    startDate: optional(first(searchParams.getAll("startDate"))),
    endDate: optional(first(searchParams.getAll("endDate"))),
    vehicleId: optional(first(searchParams.getAll("vehicleId"))),
    vehicleStatusId: optional(first(searchParams.getAll("vehicleStatusId"))),
    providerId: optional(first(searchParams.getAll("providerId"))),
    buyer: optional(first(searchParams.getAll("buyer"))),
    paymentMethod: optional(first(searchParams.getAll("paymentMethod"))),
    category: optional(first(searchParams.getAll("category"))),
    reportStatus: optional(first(searchParams.getAll("reportStatus"))),
    search: optional(first(searchParams.getAll("search"))),
    missingField: optional(first(searchParams.getAll("missingField"))),
    includeVoided: first(searchParams.getAll("includeVoided")) === "1",
  }, format)

  if (!payload) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = typeof payload.body === "string" ? payload.body : new Uint8Array(payload.body)
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Content-Disposition": `attachment; filename="${payload.fileName}"`,
    },
  })
}
