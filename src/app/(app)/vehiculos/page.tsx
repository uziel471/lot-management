import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { VEHICLE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { VehicleTable } from "@/features/vehicles/components/vehicle-table"
import { listVehicles } from "@/features/vehicles/queries"

/**
 * Inventario de vehículos: filtrable por estatus, marca y rango de
 * fecha de recepción, buscable por código, VIN o número de
 * inventario (ver proposal.md).
 */
export default async function VehiculosPage() {
  const { user } = await verifySession()

  const [vehicles, makes, statuses] = await Promise.all([
    listVehicles(),
    listActiveOptions("makes"),
    listActiveOptions("vehicleStatuses"),
  ])

  if (vehicles === null) {
    unauthorized()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehículos"
        description="El inventario del lote. Un vehículo entra con lo que se sabe el día que llega y se completa después."
      />

      <VehicleTable
        vehicles={vehicles}
        makes={makes}
        statuses={statuses}
        canWrite={VEHICLE_WRITE_ROLES.includes(user.role)}
      />
    </div>
  )
}
