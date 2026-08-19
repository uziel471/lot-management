import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">No tienes autorización</h1>
      <p className="text-muted-foreground max-w-md">
        Tu cuenta no tiene permiso para ver esta sección. Si crees que es un
        error, contacta a un administrador.
      </p>
      <Button render={<Link href="/dashboard" />}>Volver al panel</Button>
    </div>
  )
}
