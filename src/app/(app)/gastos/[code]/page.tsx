import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { EXPENSE_VOID_ROLES } from "@/lib/auth/permissions"
import { ExpenseDetail } from "@/features/expenses/components/expense-detail"
import { getExpenseByCode } from "@/features/expenses/queries"

export default async function GastoDetallePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { user } = await verifySession()

  const expense = await getExpenseByCode(code)
  if (expense === null) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={expense.code}
        description="Registro financiero inmutable. Si un gasto requiere corrección, se anula y se captura de nuevo."
      >
        <Link href="/gastos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Gastos
        </Link>
      </PageHeader>

      <ExpenseDetail expense={expense} canVoid={EXPENSE_VOID_ROLES.includes(user.role)} />
    </div>
  )
}
