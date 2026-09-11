import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> | { size: string } }
) {
  const raw = await Promise.resolve(context.params)
  const n = parseInt(String(raw.size || '192'), 10)
  const size = Number.isFinite(n) ? Math.min(512, Math.max(48, n)) : 192

  const plate = Math.round(size * 0.92)
  const radius = Math.round(size * 0.22)
  // Aylana biroz kichikroq va ingichkaroq
  const outer = Math.round(size * 0.74)
  const inner = Math.round(size * 0.66)
  const stroke = Math.max(3, Math.round(size * 0.032))
  const fontSize = Math.round(size * 0.48)

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
        <div
          style={{
            width: plate,
            height: plate,
            borderRadius: radius,
            background: '#0b0f14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  color: '#f0b90b',
                  fontSize,
                  fontWeight: 900,
                  fontFamily: 'Arial Black, Impact, system-ui, sans-serif',
                  lineHeight: 1,
                  textAlign: 'center',
                  paddingBottom: Math.round(size * 0.02),
                  letterSpacing: Math.round(size * -0.05),
                  WebkitTextStroke: `${stroke}px #f0b90b`,
                }}
              >
                G
              </div>
            </div>
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
