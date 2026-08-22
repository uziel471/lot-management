import Link from "next/link"
import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { REPAIR_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { RepairForm } from "@/features/repairs/components/repair-form"
import { listVehicleOptions } from "@/features/vehicles/queries"

export default async function NuevaReparacionPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; returnTo?: string }>
}) {
  const { user } = await verifySession()
  if (!REPAIR_WRITE_ROLES.includes(user.role)) unauthorized()

  const { vehicleId, returnTo } = await searchParams
  const [vehicles, vendors] = await Promise.all([listVehicleOptions(), listActiveOptions("vendors")])

  const selectedVehicle = vehicleId ? vehicles.find((vehicle) => vehicle.id === vehicleId) : undefined
  const cancelHref = returnTo ?? (selectedVehicle ? `/vehiculos/${selectedVehicle.code}` : "/reparaciones")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nueva reparación" description="El sistema asigna el código al guardar.">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Reparaciones
        </Link>
      </PageHeader>

      <RepairForm vehicles={vehicles} vendors={vendors} defaultVehicleId={vehicleId} cancelHref={cancelHref} />
    </div>
  )
}
