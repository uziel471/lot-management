import Link from "next/link"
import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { EXPENSE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { ExpenseTable } from "@/features/expenses/components/expense-table"
import { listExpenses } from "@/features/expenses/queries"
import { listVehicleOptions } from "@/features/vehicles/queries"

export default async function GastosPage() {
  const { user } = await verifySession()

  const [expenses, vehicles, vendors] = await Promise.all([
    listExpenses({ includeVoided: true }),
    listVehicleOptions(),
    listActiveOptions("vendors"),
  ])
  if (expenses === null) unauthorized()

  const canWrite = EXPENSE_WRITE_ROLES.includes(user.role)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gastos"
        description="Egresos operativos del lote y de cada unidad, con totales activos en USD y trazabilidad de anulación."
      >
        {canWrite ? (
          <Link
            href="/gastos/nuevo"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            Registrar gasto
          </Link>
        ) : null}
      </PageHeader>

      <ExpenseTable expenses={expenses} vehicles={vehicles} vendors={vendors} canWrite={canWrite} />
    </div>
  )
}
