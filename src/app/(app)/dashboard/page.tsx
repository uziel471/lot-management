import { verifySession } from "@/lib/auth/dal"

export default async function DashboardPage() {
  const { user } = await verifySession()

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Panel</h1>
      <p className="text-muted-foreground">
        Sesión activa como <strong>{user.name}</strong> ({user.email}), rol{" "}
        <strong>{user.role}</strong>.
      </p>
    </div>
  )
}
