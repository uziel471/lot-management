import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { SALE_VOID_ROLES } from "@/lib/auth/permissions"
import { SaleDetail } from "@/features/sales/components/sale-detail"
import { getSaleByCode } from "@/features/sales/queries"

export default async function VentaDetallePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { user } = await verifySession()
  const sale = await getSaleByCode(code)
  if (sale === null) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={sale.code} description="Registro financiero consultable e inmutable: para corregir, se anula y se reemplaza.">
        <Link href="/ventas" className="text-sm text-muted-foreground hover:text-foreground">
          ← Ventas
        </Link>
      </PageHeader>
      <SaleDetail sale={sale} canVoid={SALE_VOID_ROLES.includes(user.role)} />
    </div>
  )
}
