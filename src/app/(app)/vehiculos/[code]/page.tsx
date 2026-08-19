import Link from "next/link"
import { notFound } from "next/navigation"

import { verifySession } from "@/lib/auth/dal"
import { VEHICLE_VOID_ROLES, VEHICLE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { VehicleDetail } from "@/features/vehicles/components/vehicle-detail"
import { getVehicleByCode } from "@/features/vehicles/queries"

/** Ficha de detalle de un vehículo: lectura, con acciones puntuales. */
export default async function VehiculoDetallePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { user } = await verifySession()

  const vehicle = await getVehicleByCode(code)
  if (vehicle === null) {
    // `getVehicleByCode` devuelve `null` tanto sin sesión permitida
    // como sin vehículo encontrado; `requireRole` ya filtró el rol en
    // `verifySession`, así que aquí el caso real es "no existe".
    notFound()
  }

  const statuses = await listActiveOptions("vehicleStatuses")

  return (
    <div className="flex flex-col gap-6">
      <Link href="/vehiculos" className="text-sm text-muted-foreground hover:text-foreground">
        ← Inventario
      </Link>

      <VehicleDetail
        vehicle={vehicle}
        statuses={statuses}
        canWrite={VEHICLE_WRITE_ROLES.includes(user.role)}
        canVoid={VEHICLE_VOID_ROLES.includes(user.role)}
      />
    </div>
  )
}
