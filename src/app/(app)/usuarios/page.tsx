import { unauthorized } from "next/navigation"
import { listUsers } from "@/features/users/queries"
import { CreateUserForm } from "@/features/users/components/create-user-form"
import { UserRowActions } from "@/features/users/components/user-row-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function UsuariosPage() {
  const users = await listUsers()
  if (users === null) {
    unauthorized()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Alta, rol y estado de las personas que operan el sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{users.length} usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {user.name}{" "}
                    {!user.isActive ? (
                      <span className="text-muted-foreground text-xs">(desactivado)</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
                <UserRowActions user={user} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
