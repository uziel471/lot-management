import { unauthorized } from "next/navigation"
import { ExecutiveDashboard } from "@/features/dashboard/components/executive-dashboard"
import { getExecutiveDashboard } from "@/features/dashboard/queries"

type DashboardPageProps = {
  searchParams: Promise<{
    preset?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const dashboard = await getExecutiveDashboard({
    preset: params.preset,
    startDate: params.startDate,
    endDate: params.endDate,
  })

  if (dashboard === null) unauthorized()

  return <ExecutiveDashboard dashboard={dashboard} />
}
