import { cn } from "@/lib/utils"

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  )
}
