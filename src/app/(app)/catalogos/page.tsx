import Link from "next/link"
import { ArrowRight, Factory, Handshake, ListOrdered, Shapes } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { PageToolbar, PageToolbarSummary } from "@/components/shared/page-toolbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listCatalogs, toCatalogMeta } from "@/features/catalogs/registry"

const catalogIcons = {
  makes: Factory,
  models: Shapes,
  vehicleStatuses: ListOrdered,
  vendors: Handshake,
} as const

/**
 * Índice de catálogos. Las cuatro secciones salen del registro: no hay
 * una lista escrita a mano que se pueda desincronizar.
 */
export default function CatalogosPage() {
  const catalogs = listCatalogs().map(toCatalogMeta)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogos"
        description="Administra las listas de referencia que alimentan captura, compras y el resto de los módulos operativos."
      />

      <PageToolbar>
        <PageToolbarSummary>
          Selecciona el catálogo que quieres mantener. Las entradas se retiran o se reactivan; no se eliminan.
        </PageToolbarSummary>
      </PageToolbar>

      <div className="grid gap-3 sm:grid-cols-2">
        {catalogs.map((catalog) => {
          const Icon = catalogIcons[catalog.key]

          return (
            <Card key={catalog.key} className="border-muted-foreground/20">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{catalog.plural}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{catalog.description}</p>
                  </div>
                  <div className="rounded-md border bg-muted/40 p-2 text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" render={<Link href={`/catalogos/${catalog.routeKey}`} />}>
                  Abrir catálogo
                  <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
