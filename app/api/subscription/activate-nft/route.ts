import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { JsonRpcProvider, Contract } from 'ethers'
import { authOptions } from '@/lib/auth'
import { activateLifetimePremium, findUserByEmail, isPremiumActive } from '@/lib/users'
import { NFT_ABI, NFT_CONTRACT, NFT_RPC_URL } from '@/lib/nft-config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 })
  }

  if (!NFT_CONTRACT) {
    return NextResponse.json({ error: 'NFT contract sozlanmagan' }, { status: 503 })
  }

  let body: { wallet?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 })
  }

  const wallet = (body.wallet || '').trim().toLowerCase()
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet manzili noto‘g‘ri' }, { status: 400 })
  }

  try {
    const rpc = NFT_RPC_URL || 'https://bsc-dataseed.binance.org'
    const provider = new JsonRpcProvider(rpc)
    const contract = new Contract(NFT_CONTRACT, NFT_ABI, provider)
    const balance = await contract.balanceOf(wallet)
    if (balance <= BigInt(0)) {
      return NextResponse.json(
        { error: 'Bu wallet da GoldenWeb NFT topilmadi' },
        { status: 403 }
      )
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Blockchain tekshiruvida xatolik' },
      { status: 502 }
    )
  }

  const existing = await findUserByEmail(email)
  if (isPremiumActive(existing) && existing?.subscriptionEndsAt === null) {
    return NextResponse.json({
      ok: true,
      already: true,
      message: 'Lifetime Premium allaqachon faol',
      premium: true,
    })
  }

  const user = await activateLifetimePremium(email)
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    message: 'Lifetime Premium yoqildi (GoldenWeb NFT)',
    user,
    premium: true,
    wallet,
  })
}
