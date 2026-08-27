import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin'
import { authOptions } from '@/lib/auth'
import { computeUserStats, listAllUsers } from '@/lib/users'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 })
  }

  const users = await listAllUsers()
  const stats = computeUserStats(users)

  return NextResponse.json({ stats, users })
}
