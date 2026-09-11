import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> | { size: string } }
) {
  const raw = await Promise.resolve(context.params)
  const n = parseInt(String(raw.size || '192'), 10)
  const size = Number.isFinite(n) ? Math.min(512, Math.max(48, n)) : 192

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
          position: 'relative',
        }}
      >
        <div
          style={{
            width: Math.round(size * 0.76),
            height: Math.round(size * 0.76),
            borderRadius: '50%',
            background: '#f0b90b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: Math.round(size * 0.52),
              height: Math.round(size * 0.52),
              borderRadius: '50%',
              background: '#0b0f14',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f0b90b',
              fontSize: Math.round(size * 0.32),
              fontWeight: 800,
              fontFamily: 'system-ui, sans-serif',
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
