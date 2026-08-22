import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { PURCHASE_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { PurchaseTable } from "@/features/purchases/components/purchase-table"
import { listPurchases } from "@/features/purchases/queries"
import { listVehicleOptions } from "@/features/vehicles/queries"
import Link from "next/link"

/** Listado de compras: el costo de adquisición del lote, en un solo lugar. */
export default async function ComprasPage() {
  const { user } = await verifySession()

  const [purchases, vehicles, vendors] = await Promise.all([
    listPurchases({ includeVoided: true }),
    listVehicleOptions(),
    listActiveOptions("vendors"),
  ])
  if (purchases === null) {
    unauthorized()
  }

  const canWrite = PURCHASE_WRITE_ROLES.includes(user.role)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compras"
        description="El registro del costo de adquisición de cada unidad. Una vez guardada, una compra no se edita: se anula y se corrige."
      >
        {canWrite ? (
          <Link
            href="/compras/nueva"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            Registrar compra
          </Link>
        ) : null}
      </PageHeader>

      <PurchaseTable purchases={purchases} vehicles={vehicles} vendors={vendors} canWrite={canWrite} />
    </div>
  )
}
