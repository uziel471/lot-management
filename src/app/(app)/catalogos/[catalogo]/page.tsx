import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { notFound, unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { SegmentedNav } from "@/components/shared/segmented-nav"
import { Button } from "@/components/ui/button"
import { verifySession } from "@/lib/auth/dal"
import { CATALOG_SET_ACTIVE_ROLES, CATALOG_WRITE_ROLES } from "@/lib/auth/permissions"
import { CatalogForm } from "@/features/catalogs/components/catalog-form"
import { CatalogTable } from "@/features/catalogs/components/catalog-table"
import { listActiveOptions, listCatalogEntries } from "@/features/catalogs/queries"
import { catalogKeyFromRoute, getCatalog, listCatalogs, toCatalogMeta } from "@/features/catalogs/registry"

/**
 * Vista de un catálogo. La clave del segmento viene en español y se
 * resuelve contra el registro; cuatro páginas idénticas salvo por un
 * import serían la duplicación que la feature genérica ya evitó del
 * lado del servidor.
 */
export default async function CatalogoPage({
  params,
}: {
  params: Promise<{ catalogo: string }>
}) {
  const { catalogo } = await params
  const catalogKey = catalogKeyFromRoute(catalogo)
  if (!catalogKey) {
    notFound()
  }

  const { user } = await verifySession()
  const definition = getCatalog(catalogKey)
  const meta = toCatalogMeta(definition)
  const catalogs = listCatalogs().map(toCatalogMeta)

  const entries = await listCatalogEntries(catalogKey)
  if (entries === null) {
    unauthorized()
  }

  // Los modelos necesitan las marcas activas para su desplegable.
  const makeOptions = catalogKey === "models" ? await listActiveOptions("makes") : []
  const canWrite = CATALOG_WRITE_ROLES.includes(user.role)
  const canSetActive = CATALOG_SET_ACTIVE_ROLES.includes(user.role)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={meta.plural} description={meta.description}>
        <Button variant="outline" size="sm" render={<Link href="/catalogos" />}>
          <ArrowLeft />
          Todos los catálogos
        </Button>
        {canWrite ? (
          <CatalogForm
            meta={meta}
            makeOptions={makeOptions}
            trigger={
              <Button size="sm">
                <Plus />
                {meta.newEntryLabel}
              </Button>
            }
          />
        ) : null}
      </PageHeader>

      <SegmentedNav
        items={catalogs.map((catalog) => ({
          href: `/catalogos/${catalog.routeKey}`,
          label: catalog.plural,
          description: catalog.singular,
          isActive: catalog.key === meta.key,
        }))}
      />

      <CatalogTable
        meta={meta}
        entries={entries}
        makeOptions={makeOptions}
        canWrite={canWrite}
        canSetActive={canSetActive}
      />
    </div>
  )
}
