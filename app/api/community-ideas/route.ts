import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { createCommunityIdea, listCommunityIdeas, MAX_STORED_IDEAS } from '@/lib/community-ideas'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  try {
    const ideas = await listCommunityIdeas(MAX_STORED_IDEAS)
    const slim = ideas.map((i) => ({
      ...i,
      imageData: i.imageData ? i.imageData : null,
      hasImage: Boolean(i.imageData),
      commentCount: i.comments.length,
    }))
    return NextResponse.json({ ok: true, ideas: slim, max: MAX_STORED_IDEAS })
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Xatolik' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 })
  }

  const userId = (session.user as { id?: string }).id || session.user.email
  const authorName = session.user.name || session.user.email.split('@')[0]

  try {
    const body = await request.json()
    const title = String(body?.title || '')
    const text = String(body?.body || '')
    const imageData = body?.imageData ? String(body.imageData) : null

    const result = await createCommunityIdea({
      title,
      body: text,
      imageData,
      authorId: String(userId),
      authorName: String(authorName),
      authorEmail: session.user.email,
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
