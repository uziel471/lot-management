import Link from "next/link"
import { notFound } from "next/navigation"

import { verifySession } from "@/lib/auth/dal"
import { PURCHASE_WRITE_ROLES, VEHICLE_VOID_ROLES, VEHICLE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { VehicleDetail } from "@/features/vehicles/components/vehicle-detail"
import { getVehicleByCode } from "@/features/vehicles/queries"
import { VehicleAcquisitionCost } from "@/features/purchases/components/vehicle-acquisition-cost"
import { getVehicleAcquisitionCost, listPurchasesByVehicle } from "@/features/purchases/queries"
import { VehicleRepairSummary } from "@/features/repairs/components/vehicle-repair-summary"
import { getVehicleRepairSummary } from "@/features/repairs/queries"
import { REPAIR_WRITE_ROLES } from "@/lib/auth/permissions"

/**
 * Ficha de detalle de un vehículo: lectura, con acciones puntuales.
 *
 * El costo de adquisición se compone aquí, no dentro de
 * `features/vehicles`: esta página consulta ambas features y pasa el
 * resultado como prop (ver design.md de `add-purchases`, "El costo
 * acumulado se compone en la página, no en la feature").
 */
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

  const [statuses, acquisitionCost, purchases, repairSummary] = await Promise.all([
    listActiveOptions("vehicleStatuses"),
    getVehicleAcquisitionCost(vehicle.id),
    listPurchasesByVehicle(vehicle.id),
    getVehicleRepairSummary(vehicle.id),
  ])

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

      {acquisitionCost ? (
        <VehicleAcquisitionCost
          vehicleId={vehicle.id}
          vehicleCode={vehicle.code}
          cost={acquisitionCost}
          purchases={purchases ?? []}
          canWrite={PURCHASE_WRITE_ROLES.includes(user.role)}
        />
      ) : null}

      {repairSummary ? (
        <VehicleRepairSummary
          vehicleId={vehicle.id}
          vehicleCode={vehicle.code}
          summary={repairSummary}
          canWrite={REPAIR_WRITE_ROLES.includes(user.role)}
        />
      ) : null}
    </div>
  )
}
