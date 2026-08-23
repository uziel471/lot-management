import "server-only"

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

type StorageObjectRef = {
  bucket: string
  path: string
}

type StorageEnv =
  | {
      provider: "supabase"
      url: string
      bucket: string
      isPublic: boolean
      serviceRoleKey: string
    }
  | {
      provider: "s3"
      url: string
      bucket: string
      isPublic: boolean
      endpoint: string
      region: string
      accessKeyId: string
      secretAccessKey: string
    }

function readEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const bucket = process.env.VEHICLE_IMAGES_BUCKET
  const isPublic = (process.env.VEHICLE_IMAGES_PUBLIC ?? "true").toLowerCase() === "true"
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const endpoint = process.env.SUPABASE_STORAGE_S3_ENDPOINT
  const accessKeyId = process.env.SUPABASE_STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY
  const region = process.env.SUPABASE_STORAGE_S3_REGION ?? "us-east-1"

  if (!url) {
    throw new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL.")
  }
  if (!bucket) {
    throw new Error("Falta la variable de entorno VEHICLE_IMAGES_BUCKET.")
  }

  if (serviceRoleKey) {
    return { provider: "supabase", url, serviceRoleKey, bucket, isPublic } satisfies StorageEnv
  }

  if (endpoint && accessKeyId && secretAccessKey) {
    return {
      provider: "s3",
      url,
      bucket,
      isPublic,
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    } satisfies StorageEnv
  }

  throw new Error(
    "Falta la configuración de Storage. Define SUPABASE_SERVICE_ROLE_KEY o las credenciales S3-compatible de Supabase Storage.",
  )
}

function createStorageClient() {
  const config = readEnv()
  if (config.provider !== "supabase") {
    throw new Error("El cliente de Supabase JS solo aplica al modo service-role.")
  }

  const { url, serviceRoleKey } = config
  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function createS3Client() {
  const config = readEnv()
  if (config.provider !== "s3") {
    throw new Error("El cliente S3 solo aplica al modo S3-compatible.")
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

function getPublicObjectUrl(bucket: string, path: string) {
  const { url } = readEnv()
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${encodedPath}`
}

export async function uploadVehicleImageObject({
  path,
  contentType,
  body,
}: {
  path: string
  contentType: string
  body: Uint8Array
}): Promise<StorageObjectRef> {
  const config = readEnv()

  if (config.provider === "supabase") {
    const { error } = await createStorageClient().storage.from(config.bucket).upload(path, body, {
      contentType,
      upsert: false,
    })

    if (error) {
      throw new Error(`No se pudo subir la imagen a Storage: ${error.message}`)
    }

    return { bucket: config.bucket, path }
  }

  try {
    await createS3Client().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: path,
        Body: body,
        ContentType: contentType,
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "sin detalle"
    throw new Error(`No se pudo subir la imagen a Storage: ${message}`)
  }

  return { bucket: config.bucket, path }
}

export async function deleteVehicleImageObject({ bucket, path }: StorageObjectRef) {
  const config = readEnv()

  if (config.provider === "supabase") {
    const { error } = await createStorageClient().storage.from(bucket).remove([path])

    if (error) {
      throw new Error(`No se pudo eliminar la imagen de Storage: ${error.message}`)
    }

    return
  }

  try {
    await createS3Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "sin detalle"
    throw new Error(`No se pudo eliminar la imagen de Storage: ${message}`)
  }
}

export async function getVehicleImageRenderableUrl({ bucket, path }: StorageObjectRef): Promise<string> {
  const config = readEnv()

  if (config.isPublic) {
    return getPublicObjectUrl(bucket, path)
  }

  if (config.provider === "supabase") {
    const storage = createStorageClient().storage.from(bucket)
    const { data, error } = await storage.createSignedUrl(path, 60 * 60)
    if (error || !data?.signedUrl) {
      throw new Error(`No se pudo generar la URL de la imagen: ${error?.message ?? "sin detalle"}`)
    }

    return data.signedUrl
  }

  try {
    return await getSignedUrl(
      createS3Client(),
      new GetObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
      { expiresIn: 60 * 60 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "sin detalle"
    throw new Error(`No se pudo generar la URL de la imagen: ${message}`)
  }
}
