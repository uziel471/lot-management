import Link from "next/link"
import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { REPAIR_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { RepairTable } from "@/features/repairs/components/repair-table"
import { listRepairs } from "@/features/repairs/queries"
import { listVehicleOptions } from "@/features/vehicles/queries"

export default async function ReparacionesPage() {
  const { user } = await verifySession()

  const [repairs, vehicles, vendors] = await Promise.all([
    listRepairs({ includeVoided: true }),
    listVehicleOptions(),
    listActiveOptions("vendors"),
  ])
  if (repairs === null) unauthorized()

  const canWrite = REPAIR_WRITE_ROLES.includes(user.role)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reparaciones"
        description="Seguimiento operativo y financiero del trabajo de servicio por unidad, con historial y costo activo en USD."
      >
        {canWrite ? (
          <Link
            href="/reparaciones/nueva"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            Registrar reparación
          </Link>
        ) : null}
      </PageHeader>

      <RepairTable repairs={repairs} vehicles={vehicles} vendors={vendors} canWrite={canWrite} />
    </div>
  )
}
