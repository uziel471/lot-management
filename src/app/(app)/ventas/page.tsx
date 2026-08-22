import Link from "next/link"
import { unauthorized } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { SALE_WRITE_ROLES } from "@/lib/auth/permissions"
import { SaleTable } from "@/features/sales/components/sale-table"
import { listSales } from "@/features/sales/queries"
import { listVehicleOptions } from "@/features/vehicles/queries"

export default async function VentasPage() {
  const { user } = await verifySession()
  const [response, vehicles] = await Promise.all([listSales({ includeVoided: true }), listVehicleOptions()])
  if (response === null) unauthorized()
  const canWrite = SALE_WRITE_ROLES.includes(user.role)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description="Cierre operativo por unidad: precio, costo activo, profit y ROI congelados al momento de vender."
      >
        {canWrite ? (
          <Link href="/ventas/nuevo" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90">
            Registrar venta
          </Link>
        ) : null}
      </PageHeader>
      <SaleTable response={response} vehicles={vehicles} canWrite={canWrite} />
    </div>
  )
}
