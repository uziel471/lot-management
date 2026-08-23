import Link from "next/link"
import { REPORT_CATEGORY_LABELS } from "@/features/reports/domain"
import type { ReportCatalogItem } from "@/features/reports/types"
import { PageContainer } from "@/components/shared/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function availabilityTone(status: ReportCatalogItem["availability"]) {
  if (status === "available") return "success"
  if (status === "partial") return "warning"
  return "muted"
}

function availabilityLabel(status: ReportCatalogItem["availability"]) {
  if (status === "available") return "Disponible"
  if (status === "partial") return "Parcial"
  return "No disponible"
}

export function ReportCatalog({ items }: { items: ReportCatalogItem[] }) {
  const grouped = new Map<string, ReportCatalogItem[]>()
  for (const item of items) {
    grouped.set(item.category, [...(grouped.get(item.category) ?? []), item])
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reportes"
        description="Catalogo operativo y financiero basado en los registros vigentes del sistema."
      />
      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([category, reports]) => (
          <section key={category} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{REPORT_CATEGORY_LABELS[category as keyof typeof REPORT_CATEGORY_LABELS]}</h2>
              <p className="text-sm text-muted-foreground">{reports.length} reportes</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {reports.map((report) => (
                <Card key={report.id} size="sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{report.title}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                      </div>
                      <StatusBadge tone={availabilityTone(report.availability)}>
                        {availabilityLabel(report.availability)}
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Filtros: {report.supportedFilters.join(", ") || "Ninguno"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Exporta: {report.exportDescriptors.map((item) => item.label).join(", ") || "No"}
                    </p>
                    {report.availabilityNotes.length > 0 ? (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {report.availabilityNotes.slice(0, 2).map((note) => (
                          <li key={note.code}>{note.reason}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="flex justify-end">
                      <Link
                        href={`/reportes/${report.id}`}
                        className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted"
                      >
                        Abrir reporte
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}
