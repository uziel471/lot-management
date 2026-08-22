import Link from "next/link"
import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { EXPENSE_WRITE_ROLES } from "@/lib/auth/permissions"
import { ExpenseForm } from "@/features/expenses/components/expense-form"
import { getExpenseFormOptions } from "@/features/expenses/queries"

export default async function NuevoGastoPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; returnTo?: string }>
}) {
  const { user } = await verifySession()
  if (!EXPENSE_WRITE_ROLES.includes(user.role)) unauthorized()

  const { vehicleId, returnTo } = await searchParams
  const { vehicles, vendors } = await getExpenseFormOptions()

  const selectedVehicle = vehicleId ? vehicles.find((vehicle) => vehicle.id === vehicleId) : undefined
  const cancelHref = returnTo ?? (selectedVehicle ? `/vehiculos/${selectedVehicle.code}` : "/gastos")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nuevo gasto" description="El sistema asigna el código al guardar.">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Gastos
        </Link>
      </PageHeader>

      <ExpenseForm vehicles={vehicles} vendors={vendors} defaultVehicleId={vehicleId} cancelHref={cancelHref} />
    </div>
  )
}
