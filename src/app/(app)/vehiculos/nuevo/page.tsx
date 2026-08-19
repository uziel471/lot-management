import Link from "next/link"
import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { VEHICLE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { VehicleForm } from "@/features/vehicles/components/vehicle-form"

/** Alta de un vehículo nuevo, con solo los cinco campos obligatorios exigidos por el esquema. */
export default async function NuevoVehiculoPage() {
  const { user } = await verifySession()
  if (!VEHICLE_WRITE_ROLES.includes(user.role)) {
    unauthorized()
  }

  const [makes, statuses] = await Promise.all([
    listActiveOptions("makes"),
    listActiveOptions("vehicleStatuses"),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nuevo vehículo" description="El sistema asigna el código al guardar.">
        <Link href="/vehiculos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Inventario
        </Link>
      </PageHeader>

      <VehicleForm makes={makes} statuses={statuses} />
    </div>
  )
}
