import { z } from "zod"
import { ROLES } from "@/types/role"

export const roleSchema = z.enum(ROLES)

export const createUserSchema = z.object({
  name: z.string().trim().min(2, { error: "El nombre debe tener al menos 2 caracteres." }),
  email: z.email({ error: "Ingresa un correo válido." }),
  role: roleSchema,
  password: z.string().min(8, { error: "La contraseña debe tener al menos 8 caracteres." }),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
})

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2, { error: "El nombre debe tener al menos 2 caracteres." }),
  email: z.email({ error: "Ingresa un correo válido." }),
  role: roleSchema,
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const setUserStatusSchema = z.object({
  userId: z.string().min(1),
})

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, { error: "La contraseña debe tener al menos 8 caracteres." }),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
