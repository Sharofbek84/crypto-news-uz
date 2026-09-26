import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { deleteCommunityIdea, updateCommunityIdea } from '@/lib/community-ideas'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return null
  }
  return session
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Ruxsat yo‘q.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const title = String(body?.title || '')
    const text = String(body?.body || '')
    const replaceImage = Boolean(body?.replaceImage)
    const imageData =
      body?.imageData === null ? null : body?.imageData ? String(body.imageData) : undefined

    const result = await updateCommunityIdea({
      id: context.params.id,
      title,
      body: text,
      replaceImage,
      imageData: replaceImage ? imageData ?? null : undefined,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true, idea: result.idea })
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Xatolik' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Ruxsat yo‘q.' }, { status: 403 })
  }

  try {
    const result = await deleteCommunityIdea(context.params.id)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Xatolik' },
      { status: 500 }
    )
  }
}
