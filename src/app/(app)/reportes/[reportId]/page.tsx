import { notFound, unauthorized } from "next/navigation"
import { ReportView } from "@/features/reports/components/report-view"
import { getReportFilterOptions, getReportResult } from "@/features/reports/queries"
import { REPORT_IDS, type ReportId } from "@/features/reports/types"

type ReportPageProps = {
  params: Promise<{ reportId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { reportId } = await params
  if (!(REPORT_IDS as readonly string[]).includes(reportId)) notFound()
  const raw = await searchParams
  const report = await getReportResult(reportId as ReportId, {
    preset: first(raw.preset) as never,
    startDate: first(raw.startDate),
    endDate: first(raw.endDate),
    vehicleId: first(raw.vehicleId),
    vehicleStatusId: first(raw.vehicleStatusId),
    providerId: first(raw.providerId),
    buyer: first(raw.buyer),
    paymentMethod: first(raw.paymentMethod),
    category: first(raw.category),
    reportStatus: first(raw.reportStatus),
    search: first(raw.search),
    missingField: first(raw.missingField),
    includeVoided: first(raw.includeVoided) === "1",
  })
  if (report === null) unauthorized()
  const filterOptions = await getReportFilterOptions()
  return <ReportView result={report.result} filterOptions={filterOptions} error={report.error} />
}
