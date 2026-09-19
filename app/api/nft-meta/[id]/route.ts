import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.goldenweb.uz'
const IMAGE = `${SITE.replace(/\/$/, '')}/goldenweb-nft-pass.png`

/**
 * ERC-721 metadata for GoldenWeb NFT Pass.
 * Contract tokenURI = baseURI + tokenId + ".json"
 * Example: https://www.goldenweb.uz/api/nft-meta/1.json
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const raw = await Promise.resolve(context.params)
  const idParam = raw.id || ''
  const tokenId = idParam.replace(/\.json$/i, '').trim()

  if (!/^\d+$/.test(tokenId) || Number(tokenId) < 1) {
    return NextResponse.json({ error: 'Invalid token id' }, { status: 400 })
  }

  const metadata = {
    name: `GoldenWeb NFT Pass #${tokenId}`,
    description:
      'GoldenWeb.uz Traders Club NFT Pass — lifetime Premium access on goldenweb.uz. Stay one step ahead.',
    image: IMAGE,
    external_url: 'https://www.goldenweb.uz/nft',
    attributes: [
      { trait_type: 'Collection', value: 'GoldenWeb NFT Pass' },
      { trait_type: 'Access', value: 'Lifetime Premium' },
      { trait_type: 'Token ID', value: tokenId },
    ],
  }

  return NextResponse.json(metadata, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
