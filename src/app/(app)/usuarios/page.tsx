import { unauthorized } from "next/navigation"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { verifySession } from "@/lib/auth/dal"
import { UserFormDialog } from "@/features/users/components/create-user-form"
import { UsersManagement } from "@/features/users/components/users-management"
import { listUsers } from "@/features/users/queries"

export default async function UsuariosPage() {
  const { user } = await verifySession()
  if (user.role !== "admin") {
    unauthorized()
  }

  const users = await listUsers()
  if (users === null) {
    unauthorized()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Alta, acceso y credenciales de las personas que operan el sistema."
      >
        <UserFormDialog
          trigger={
            <Button size="sm" data-icon="inline-start">
              <Plus />
              Crear usuario
            </Button>
          }
        />
      </PageHeader>

      <UsersManagement users={users} currentUserId={user.id} />
    </div>
  )
}
