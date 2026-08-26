import { verifySession } from "@/lib/auth/dal"
import { ChangePasswordForm } from "@/features/auth/components/change-password-form"
import { signOutAction } from "@/features/auth/actions"
import { DetailGrid, DetailItem, DetailSection } from "@/components/shared/detail-section"
import { FormSection } from "@/components/shared/form-section"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"

const ROLE_LABELS = {
  admin: "Administrador",
  capturista: "Capturista",
  lectura: "Lectura",
} as const

const ROLE_DESCRIPTIONS = {
  admin: "Administra usuarios, catalogos y operaciones sensibles desde los modulos autorizados.",
  capturista: "Registra la operacion diaria sin administrar usuarios ni anulaciones.",
  lectura: "Consulta informacion y exporta reportes sin permisos de escritura.",
} as const

export default async function CuentaPage() {
  const { user } = await verifySession()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi cuenta"
        description="Consulta tus datos de acceso, cambia tu propia contrasena y cierra la sesion actual."
      >
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Cerrar sesion
          </Button>
        </form>
      </PageHeader>

      <DetailSection
        title="Perfil de acceso"
        description="Estos datos vienen de tu sesion activa y no permiten administrar otros usuarios."
      >
        <div className="rounded-lg border p-4">
          <DetailGrid className="lg:grid-cols-4">
            <DetailItem label="Nombre" value={user.name} />
            <DetailItem label="Correo" value={user.email} mono />
            <DetailItem label="Rol" value={<StatusBadge tone="neutral">{ROLE_LABELS[user.role]}</StatusBadge>} />
            <DetailItem label="Estado" value={<StatusBadge tone="success">Activa</StatusBadge>} />
          </DetailGrid>
          <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[user.role]}</p>
        </div>
      </DetailSection>

      <FormSection
        title="Cambiar contrasena"
        description="Confirma tu contrasena actual. Al guardar, tus otras sesiones activas se revocan."
        contentClassName="grid-cols-1"
      >
        <ChangePasswordForm />
      </FormSection>
    </div>
  )
}
