import type { Role } from "@/types/role"

/** DTO seguro: nunca incluye hash de contraseña ni tokens de sesión. */
export type UserDTO = {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
}
