function readEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`)
  }
  return value
}

export function getSupabasePublicEnv() {
  return {
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  }
}
