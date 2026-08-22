import Link from "next/link"
import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { PURCHASE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { PurchaseForm } from "@/features/purchases/components/purchase-form"
import { listVoidedPurchasesByVehicle } from "@/features/purchases/queries"
import { listVehicleOptions } from "@/features/vehicles/queries"

/**
 * Alta de una compra nueva. Puede llegar con `?vehicleId=` desde la
 * ficha de un vehículo, que precarga el desplegable — en ese caso
 * también se cargan sus compras anuladas, por si el capturista elige
 * "Corrección".
 */
export default async function NuevaCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; returnTo?: string }>
}) {
  const { user } = await verifySession()
  if (!PURCHASE_WRITE_ROLES.includes(user.role)) {
    unauthorized()
  }

  const { vehicleId, returnTo } = await searchParams

  const [vehicles, vendors, correctionTargets] = await Promise.all([
    listVehicleOptions(),
    listActiveOptions("vendors"),
    vehicleId ? listVoidedPurchasesByVehicle(vehicleId) : Promise.resolve([]),
  ])
  const selectedVehicle = vehicleId ? vehicles.find((vehicle) => vehicle.id === vehicleId) : undefined
  const cancelHref = returnTo ?? (selectedVehicle ? `/vehiculos/${selectedVehicle.code}` : "/compras")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nueva compra" description="El sistema asigna el código al guardar.">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Compras
        </Link>
      </PageHeader>

      <PurchaseForm
        vehicles={vehicles}
        vendors={vendors}
        defaultVehicleId={vehicleId}
        correctionTargets={correctionTargets}
        cancelHref={cancelHref}
      />
    </div>
  )
}
