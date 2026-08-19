import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listCatalogs, toCatalogMeta } from "@/features/catalogs/registry"

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
        description="Las listas de referencia que alimentan la captura. Una entrada nunca se borra: se retira."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {catalogs.map((catalog) => (
          <Card key={catalog.key}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={`/catalogos/${catalog.routeKey}`} className="hover:underline">
                  {catalog.plural}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{catalog.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
