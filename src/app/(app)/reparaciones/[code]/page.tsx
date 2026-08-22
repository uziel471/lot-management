import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { REPAIR_VOID_ROLES, REPAIR_WRITE_ROLES } from "@/lib/auth/permissions"
import { RepairDetail } from "@/features/repairs/components/repair-detail"
import { getRepairByCode } from "@/features/repairs/queries"

export default async function ReparacionDetallePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { user } = await verifySession()

  const repair = await getRepairByCode(code)
  if (repair === null) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={repair.code}
        description="Registro operativo consultable con historial de estatus, costos congelados y acciones de ciclo de vida."
      >
        <Link href="/reparaciones" className="text-sm text-muted-foreground hover:text-foreground">
          ← Reparaciones
        </Link>
      </PageHeader>

      <RepairDetail
        repair={repair}
        canWrite={REPAIR_WRITE_ROLES.includes(user.role)}
        canVoid={REPAIR_VOID_ROLES.includes(user.role)}
      />
    </div>
  )
}
