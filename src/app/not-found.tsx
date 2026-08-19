import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground max-w-md">
        La ruta que buscas no existe.
      </p>
      <Button render={<Link href="/dashboard" />}>Volver al panel</Button>
    </div>
  )
}
