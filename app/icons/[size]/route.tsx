import { ImageResponse } from 'next/og'

export const runtime = 'edge'

/** Brand logo (golden globe + G) — generated for all requested sizes */
export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> | { size: string } }
) {
  const params = await Promise.resolve(context.params)
  const raw = parseInt(String(params.size), 10)
  const size = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 512) : 192

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        {/* Outer golden ring */}
        <div
          style={{
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: '50%',
            border: `${Math.max(2, Math.round(size * 0.055))}px solid #c9a951`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 15, 20, 0.92)',
            boxShadow: `0 0 ${Math.round(size * 0.06)}px rgba(201, 169, 81, 0.35)`,
          }}
        >
          {/* Inner thinner ring for depth */}
          <div
            style={{
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: '50%',
              border: `${Math.max(1, Math.round(size * 0.018))}px solid rgba(201, 169, 81, 0.45)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: Math.round(size * 0.42),
                fontWeight: 800,
                color: '#c9a951',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              G
            </span>
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
