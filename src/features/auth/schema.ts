import { z } from "zod"

export const loginSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
  next: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Ingresa tu contraseña actual." }),
    newPassword: z.string().min(8, { error: "La nueva contraseña debe tener al menos 8 caracteres." }),
    confirmPassword: z.string().min(1, { error: "Confirma la nueva contraseña." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })

export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>
