import { NextResponse } from 'next/server'
import { createUser } from '@/lib/users'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '')
    const password = String(body.password || '')
    const name = body.name ? String(body.name) : undefined

    const result = await createUser({ email, password, name })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true, user: result.user })
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 })
  }
}
