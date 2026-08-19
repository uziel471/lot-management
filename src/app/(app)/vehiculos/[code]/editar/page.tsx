import Link from "next/link"
import { notFound, unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { VEHICLE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveModelsByMake, listActiveOptions } from "@/features/catalogs/queries"
import { VehicleForm } from "@/features/vehicles/components/vehicle-form"
import { getVehicleByCode } from "@/features/vehicles/queries"

/** Edición de un vehículo existente: mismo formulario que el alta, ya poblado. */
export default async function EditarVehiculoPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { user } = await verifySession()
  if (!VEHICLE_WRITE_ROLES.includes(user.role)) {
    unauthorized()
  }

  const vehicle = await getVehicleByCode(code)
  if (!vehicle) {
    notFound()
  }
  if (vehicle.isVoided) {
    unauthorized()
  }

  const [makes, statuses, initialModels] = await Promise.all([
    listActiveOptions("makes"),
    listActiveOptions("vehicleStatuses"),
    listActiveModelsByMake(vehicle.makeId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Editar ${vehicle.description}`}
        description={`Código ${vehicle.code}. El código no se puede cambiar.`}
      >
        <Link
          href={`/vehiculos/${vehicle.code}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Ficha del vehículo
        </Link>
      </PageHeader>

      <VehicleForm entry={vehicle} makes={makes} statuses={statuses} initialModels={initialModels} />
    </div>
  )
}
