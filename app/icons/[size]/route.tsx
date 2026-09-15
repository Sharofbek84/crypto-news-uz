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

  const ring = size * 0.88
  const border = Math.max(2, Math.round(size * 0.055))
  const inner = size * 0.72
  const innerBorder = Math.max(1, Math.round(size * 0.018))
  const fontSize = Math.round(size * 0.54)

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
            width: ring,
            height: ring,
            borderRadius: '50%',
            border: `${border}px solid #e8c547`,
            background: 'rgba(11, 15, 20, 0.92)',
            boxShadow: `0 0 ${Math.round(size * 0.08)}px rgba(232, 197, 71, 0.45)`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner thinner ring for depth */}
          <div
            style={{
              width: inner,
              height: inner,
              borderRadius: '50%',
              border: `${innerBorder}px solid rgba(232, 197, 71, 0.5)`,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          {/* G — geometric center of the circle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize,
              fontWeight: 800,
              color: '#f0d060',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: fontSize,
              height: fontSize,
              textAlign: 'center',
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
