import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> | { size: string } }
) {
  const raw = await Promise.resolve(context.params)
  const n = parseInt(String(raw.size || '192'), 10)
  const size = Number.isFinite(n) ? Math.min(512, Math.max(48, n)) : 192

  // Aylana ingichka, G qalin
  const outer = Math.round(size * 0.78)
  const inner = Math.round(size * 0.68)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f14',
        }}
      >
        <div
          style={{
            width: outer,
            height: outer,
            borderRadius: '50%',
            background: '#f0b90b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: inner,
              height: inner,
              borderRadius: '50%',
              background: '#0b0f14',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f0b90b',
              fontSize: Math.round(size * 0.48),
              fontWeight: 900,
              fontFamily: 'Arial Black, Impact, system-ui, sans-serif',
              lineHeight: 1,
              letterSpacing: Math.round(size * -0.03),
              WebkitTextStroke: `${Math.max(1, Math.round(size * 0.014))}px #f0b90b`,
            }}
          >
            G
          </div>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  )
}
