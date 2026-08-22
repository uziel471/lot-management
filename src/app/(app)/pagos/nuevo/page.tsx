import Link from "next/link"
import { unauthorized } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { PAYMENT_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { PaymentForm } from "@/features/payments/components/payment-form"
import { searchPayableSources } from "@/features/payments/queries"

export default async function NuevoPagoPage() {
  const { user } = await verifySession()
  if (!PAYMENT_WRITE_ROLES.includes(user.role)) unauthorized()

  const [vendors, payableSources] = await Promise.all([
    listActiveOptions("vendors"),
    searchPayableSources({}),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registrar pago"
        description="Captura un pago saliente y distribúyelo entre obligaciones vigentes sin sobrepagar saldos pendientes."
      >
        <Link href="/pagos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Pagos
        </Link>
      </PageHeader>

      <PaymentForm vendors={vendors} payableSources={payableSources ?? []} cancelHref="/pagos" />
    </div>
  )
}
