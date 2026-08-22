import Link from "next/link"
import { unauthorized } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { SALE_WRITE_ROLES } from "@/lib/auth/permissions"
import { SaleForm } from "@/features/sales/components/sale-form"
import { getVehicleSaleCostPreviews, listSaleCandidateVehicles } from "@/features/sales/queries"

export default async function NuevaVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; returnTo?: string }>
}) {
  const { user } = await verifySession()
  if (!SALE_WRITE_ROLES.includes(user.role)) unauthorized()

  const { vehicleId, returnTo } = await searchParams
  const vehicles = await listSaleCandidateVehicles()
  const previews = await getVehicleSaleCostPreviews(vehicles.map((vehicle) => vehicle.id))
  const defaultVehicle = vehicleId ? vehicles.find((vehicle) => vehicle.id === vehicleId) : undefined
  const cancelHref = returnTo ?? (defaultVehicle ? `/vehiculos/${defaultVehicle.code}` : "/ventas")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nueva venta" description="El sistema asigna el código al guardar y conserva el snapshot financiero de ese momento.">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Ventas
        </Link>
      </PageHeader>
      <SaleForm
        vehicles={vehicles}
        previews={Object.fromEntries(previews.entries())}
        defaultVehicleId={vehicleId}
        cancelHref={cancelHref}
      />
    </div>
  )
}
