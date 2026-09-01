import { getUserManualPdf } from "@/features/user-manual/pdf"
import { requireRole } from "@/lib/auth/dal"
import { MANUAL_READ_ROLES } from "@/lib/auth/permissions"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireRole(MANUAL_READ_ROLES)
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const payload = await getUserManualPdf()

  return new Response(new Uint8Array(payload.body), {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Content-Disposition": `attachment; filename="${payload.fileName}"`,
    },
  })
}
