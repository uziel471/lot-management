import { unauthorized } from "next/navigation"
import { ReportCatalog } from "@/features/reports/components/report-catalog"
import { listReportCatalog } from "@/features/reports/queries"

export default async function ReportsCatalogPage() {
  const catalog = await listReportCatalog()
  if (catalog === null) unauthorized()
  return <ReportCatalog items={catalog} />
}
