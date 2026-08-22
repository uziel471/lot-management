import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { PAYMENT_VOID_ROLES } from "@/lib/auth/permissions"
import { PaymentDetail } from "@/features/payments/components/payment-detail"
import { getPaymentByCode } from "@/features/payments/queries"

export default async function PagoDetallePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { user } = await verifySession()

  const payment = await getPaymentByCode(code)
  if (payment === null) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={payment.code}
        description="Registro financiero inmutable. Si requiere corrección, se anula y se captura un nuevo pago."
      >
        <Link href="/pagos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Pagos
        </Link>
      </PageHeader>

      <PaymentDetail payment={payment} canVoid={PAYMENT_VOID_ROLES.includes(user.role)} />
    </div>
  )
}
