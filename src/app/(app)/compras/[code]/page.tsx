import Link from "next/link"
import { notFound } from "next/navigation"

import { verifySession } from "@/lib/auth/dal"
import { PURCHASE_VOID_ROLES } from "@/lib/auth/permissions"
import { PurchaseDetail } from "@/features/purchases/components/purchase-detail"
import { getPurchaseByCode } from "@/features/purchases/queries"

/** Ficha de detalle de una compra: lectura, con la acción de anular. */
export default async function CompraDetallePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { user } = await verifySession()

  const purchase = await getPurchaseByCode(code)
  if (purchase === null) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/compras" className="text-sm text-muted-foreground hover:text-foreground">
        ← Compras
      </Link>

      <PurchaseDetail purchase={purchase} canVoid={PURCHASE_VOID_ROLES.includes(user.role)} />
    </div>
  )
}
