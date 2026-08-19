import type { StatusHistoryEntryDTO } from "../types"

/** Secuencia de estatus por los que ha pasado un vehículo, con autor y fecha. */
export function StatusHistory({ entries }: { entries: StatusHistoryEntryDTO[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin historial todavía.</p>
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry, index) => (
        <li key={`${entry.changedAt}-${index}`} className="flex flex-col gap-0.5 border-l-2 pl-3">
          <p className="text-sm">
            {entry.previousStatusName ? (
              <>
                <span className="text-muted-foreground">{entry.previousStatusName}</span>
                {" → "}
              </>
            ) : null}
            <span className="font-medium">{entry.newStatusName}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {entry.changedByName ?? "—"} ·{" "}
            {new Date(entry.changedAt).toLocaleString("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </li>
      ))}
    </ol>
  )
}
