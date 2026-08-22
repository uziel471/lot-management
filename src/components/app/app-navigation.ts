import type { Role } from "@/types/role"

export type AppNavIcon =
  | "dashboard"
  | "vehicles"
  | "purchases"
  | "payments"
  | "repairs"
  | "expenses"
  | "catalogs"
  | "users"
  | "account"

export type AppNavigationItem = {
  href: string
  label: string
  icon: AppNavIcon
  adminOnly?: boolean
  match?: "exact" | "prefix"
}

const APP_NAVIGATION: AppNavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", match: "exact" },
  { href: "/vehiculos", label: "Vehiculos", icon: "vehicles", match: "prefix" },
  { href: "/compras", label: "Compras", icon: "purchases", match: "prefix" },
  { href: "/pagos", label: "Pagos", icon: "payments", match: "prefix" },
  { href: "/reparaciones", label: "Reparaciones", icon: "repairs", match: "prefix" },
  { href: "/gastos", label: "Gastos", icon: "expenses", match: "prefix" },
  { href: "/catalogos", label: "Catalogos", icon: "catalogs", match: "prefix" },
  { href: "/usuarios", label: "Usuarios", icon: "users", adminOnly: true, match: "prefix" },
  { href: "/cuenta", label: "Mi cuenta", icon: "account", match: "prefix" },
]

export function getAppNavigation(role: Role): AppNavigationItem[] {
  return APP_NAVIGATION.filter((item) => !item.adminOnly || role === "admin")
}
