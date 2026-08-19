import Link from "next/link"
import { notFound, unauthorized } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { verifySession } from "@/lib/auth/dal"
import { CATALOG_SET_ACTIVE_ROLES, CATALOG_WRITE_ROLES } from "@/lib/auth/permissions"
import { CatalogTable } from "@/features/catalogs/components/catalog-table"
import { listActiveOptions, listCatalogEntries } from "@/features/catalogs/queries"
import { catalogKeyFromRoute, getCatalog, toCatalogMeta } from "@/features/catalogs/registry"

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

  const entries = await listCatalogEntries(catalogKey)
  if (entries === null) {
    unauthorized()
  }

  // Los modelos necesitan las marcas activas para su desplegable.
  const makeOptions = catalogKey === "models" ? await listActiveOptions("makes") : []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={meta.plural} description={meta.description}>
        <Link href="/catalogos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Todos los catálogos
        </Link>
      </PageHeader>

      <CatalogTable
        meta={meta}
        entries={entries}
        makeOptions={makeOptions}
        canWrite={CATALOG_WRITE_ROLES.includes(user.role)}
        canSetActive={CATALOG_SET_ACTIVE_ROLES.includes(user.role)}
      />
    </div>
  )
}
