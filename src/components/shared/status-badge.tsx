import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusBadgeTone = "neutral" | "success" | "warning" | "muted" | "destructive"

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border-border text-foreground",
  success: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warning: "border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-300",
  muted: "border-transparent bg-muted text-muted-foreground",
  destructive: "border-transparent bg-destructive/10 text-destructive",
}

export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusBadgeTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <Badge variant="outline" className={cn(toneClasses[tone], className)}>
      {children}
    </Badge>
  )
}
