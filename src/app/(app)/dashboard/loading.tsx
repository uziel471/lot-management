function LoadingCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-8 w-24 animate-pulse rounded bg-muted" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <LoadingCard key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-4">
            <div className="mb-3 h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((__, row) => (
                <div key={row}>
                  <div className="mb-1 h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-2 w-full animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
