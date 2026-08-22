import Link from "next/link"
import { unauthorized } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { PAYMENT_WRITE_ROLES } from "@/lib/auth/permissions"
import { listActiveOptions } from "@/features/catalogs/queries"
import { PaymentTable } from "@/features/payments/components/payment-table"
import { listPayments } from "@/features/payments/queries"

export default async function PagosPage() {
  const { user } = await verifySession()

  const [payments, vendors] = await Promise.all([
    listPayments({ includeVoided: true }),
    listActiveOptions("vendors"),
  ])
  if (payments === null) unauthorized()

  const canWrite = PAYMENT_WRITE_ROLES.includes(user.role)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pagos"
        description="Pagos salientes contra compras, gastos y reparaciones, con aplicaciones parciales, saldo pendiente y anulación trazable."
      >
        {canWrite ? (
          <Link
            href="/pagos/nuevo"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            Registrar pago
          </Link>
        ) : null}
      </PageHeader>

      <PaymentTable payments={payments} vendors={vendors} canWrite={canWrite} />
    </div>
  )
}
