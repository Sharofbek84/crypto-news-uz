import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { addIdeaComment } from '@/lib/community-ideas'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
  }

  const userId = (session.user as { id?: string }).id || session.user.email
  const authorName = session.user.name || session.user.email.split('@')[0]
  const ideaId = context.params.id

  try {
    const body = await request.json()
    const text = String(body?.text || '')

    const result = await addIdeaComment({
      ideaId,
      text,
      authorId: String(userId),
      authorName: String(authorName),
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
