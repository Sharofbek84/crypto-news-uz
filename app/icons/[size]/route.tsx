import { LOGO_PNG_BASE64 } from '@/lib/brand-logo'

export const runtime = 'edge'

function decodeBase64Png(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const PNG_BYTES = decodeBase64Png(LOGO_PNG_BASE64)

/** Brand logo (globe + G) — serves the uploaded PNG for all requested sizes */
export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> | { size: string } }
) {
  await Promise.resolve(context.params)
  return new Response(PNG_BYTES, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  })
}
