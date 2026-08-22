import { PageContainer } from "@/components/shared/page-container"

export function AppShell({
  sidebar,
  header,
  children,
}: {
  sidebar: React.ReactNode
  header: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background md:flex">
      {sidebar}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {header}
        <main className="flex-1">
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  )
}
