"use client"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
      <h2 className="text-xl font-semibold">No se pudo cargar el dashboard</h2>
      <p className="max-w-xl text-sm text-muted-foreground">
        Vuelve a intentar. Si el problema persiste, revisa la conectividad a la base o los datos necesarios para el
        periodo seleccionado.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  )
}
