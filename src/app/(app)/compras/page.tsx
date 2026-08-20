import { unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { PURCHASE_WRITE_ROLES } from "@/lib/auth/permissions"
import { PurchaseTable } from "@/features/purchases/components/purchase-table"
import { listPurchases } from "@/features/purchases/queries"

/** Listado de compras: el costo de adquisición del lote, en un solo lugar. */
export default async function ComprasPage() {
  const { user } = await verifySession()

  const purchases = await listPurchases({ includeVoided: true })
  if (purchases === null) {
    unauthorized()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compras"
        description="El registro del costo de adquisición de cada unidad. Una vez guardada, una compra no se edita: se anula y se corrige."
      />

      <PurchaseTable purchases={purchases} canWrite={PURCHASE_WRITE_ROLES.includes(user.role)} />
    </div>
  )
}
