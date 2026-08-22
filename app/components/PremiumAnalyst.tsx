'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const coins=['BTC','ETH','LTC','SOL','BNB','NEAR','GRAM','SUI','APT','ATOM','XRP','XLM','BCH','LINK','AVAX']
const intervals=[['15m','M15'],['1h','H1'],['4h','H4'],['1d','D1']] as const
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;side?:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

function money(n:number){if(!Number.isFinite(n))return'—';if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:2});if(n>=1)return n.toFixed(4);return n.toPrecision(4)}
function money$(n:number){return'$'+money(n)}
function tfShort(i:string){return({ '15m':'M15','1h':'H1','4h':'H4','1d':'D1' } as any)[i]||i}

function CleanChart({candles,result,coin,interval}:{candles:any[];result:Result;coin:string;interval:string}){
  if(!candles?.length||!result)return null
  const W=920,H=420,L=56,R=118,T=48,B=36
  const plotW=W-L-R,plotH=H-T-B,plotRight=W-R
  const n=Math.min(candles.length,80)
  const slice=candles.slice(-n)
  const highs=slice.map((c:any)=>c.high),lows=slice.map((c:any)=>c.low)
  let min=Math.min(...lows),max=Math.max(...highs)
  const isSell=result.side==='SELL'
  const levels=[result.entryLow,result.entryHigh,result.invalidation,...(result.tp||[])].filter(Number.isFinite)
  if(levels.length){min=Math.min(min,...levels);max=Math.max(max,...levels)}
  const pad=(max-min)*0.08||1;min-=pad;max+=pad
  const y=(v:number)=>T+((max-v)/(max-min))*plotH
  const x=(i:number)=>L+(i/(n-1||1))*plotW
  const labelX=plotRight+8

  const rightBox=(yy:number,text:string,bg:string,w=100)=>(
    <g>
      <line x1={L} x2={plotRight} y1={yy} y2={yy} stroke={bg} strokeWidth="1.4" strokeDasharray="7 6" opacity=".85"/>
      <rect x={labelX} y={yy-13} width={w} height={26} rx="4" fill={bg}/>
      <text x={labelX+w/2} y={yy+5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{text}</text>
    </g>
  )

  const entryMid=(result.entryLow+result.entryHigh)/2
  const entryY=y(entryMid)
  const entryH=Math.max(18,Math.abs(y(result.entryHigh)-y(result.entryLow)))

  // zone fill between entry and first TP
  const zoneTop=isSell?Math.min(entryY,y(result.tp[0])):Math.min(entryY,y(result.tp[0]))
  const zoneBot=isSell?Math.max(entryY,y(result.tp[0])):Math.max(entryY,y(result.tp[0]))

  return (
    <div className="cleanChartWrap">
      <svg viewBox={`0 0 ${W} ${H+90}`} className="cleanChartSvg">
        <defs>
          <linearGradient id="zoneFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isSell?'#c84b4b':'#148f55'} stopOpacity=".18"/>
            <stop offset="100%" stopColor={isSell?'#c84b4b':'#148f55'} stopOpacity=".04"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H+90} fill="#0b0e11" rx="12"/>
        <text x={L} y="28" fill="#f0b90b" fontSize="18" fontWeight="800">{coin}/USDT · {tfShort(interval)} · {isSell?'SELL':'BUY'}</text>

        {/* grid */}
        {[0.25,0.5,0.75].map(p=>(
          <line key={p} x1={L} x2={plotRight} y1={T+p*plotH} y2={T+p*plotH} stroke="#1e2329" strokeWidth="1"/>
        ))}

        {/* zone */}
        <rect x={L} y={zoneTop} width={plotW} height={Math.max(2,zoneBot-zoneTop)} fill="url(#zoneFill)"/>

        {/* candles */}
        {slice.map((c:any,i:number)=>{
          const cx=x(i),bw=Math.max(3,plotW/n*0.55)
          const up=c.close>=c.open
          const color=up?'#0ecb81':'#f6465d'
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.2"/>
              <rect x={cx-bw/2} y={Math.min(y(c.open),y(c.close))} width={bw} height={Math.max(1,Math.abs(y(c.open)-y(c.close)))} fill={color} rx="1"/>
            </g>
          )
        })}

        {/* entry zone box */}
        <rect x={L} y={entryY-entryH/2} width={plotW} height={entryH} fill={isSell?'#c84b4b':'#148f55'} opacity=".12" stroke={isSell?'#c84b4b':'#148f55'} strokeWidth="1" strokeDasharray="4 3"/>

        {rightBox(y(result.entryHigh),`ENTRY  ${money(result.entryHigh)}`,isSell?'#c84b4b':'#148f55',110)}
        {rightBox(y(result.invalidation),`SL  ${money(result.invalidation)}`,'#c84b4b')}
        {rightBox(y(result.tp[0]),`TP1  ${money(result.tp[0]||0)}`,'#148f55')}
        {rightBox(y(result.tp[1]),`TP2  ${money(result.tp[1]||0)}`,'#148f55')}
        {rightBox(y(result.tp[2]),`TP3  ${money(result.tp[2]||0)}`,'#148f55')}

        {/* RSI mini */}
        <text x={L} y={H+28} fill="#7a8796" fontSize="12" fontWeight="600">RSI (14)</text>
        <rect x={L} y={H+36} width={plotW} height={40} fill="#12161c" rx="4"/>
        <line x1={L} x2={plotRight} y1={H+36+20} y2={H+36+20} stroke="#2b3139" strokeWidth="1" strokeDasharray="3 3"/>
        {(()=>{
          const rsiVals=slice.map((_:any,i:number)=>{
            // approximate from result only at end; draw flat near result
            return result.rsi
          })
          const ry=(v:number)=>H+36+40*((70-Math.min(70,Math.max(30,v)))/(70-30))
          return (
            <>
              <polyline
                fill="none"
                stroke="#9b7bff"
                strokeWidth="1.6"
                points={slice.map((_:any,i:number)=>`${x(i)},${ry(result.rsi)}`).join(' ')}
              />
              <rect x={labelX} y={ry(result.rsi)-12} width="70" height="24" rx="4" fill="#5b4a9a"/>
              <text x={labelX+35} y={ry(result.rsi)+5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{result.rsi.toFixed(2)}</text>
              <text x={plotRight-6} y={ry(70)-5} textAnchor="end" fill="#7a8796" fontSize="11">70</text>
              <text x={plotRight-6} y={ry(50)-5} textAnchor="end" fill="#7a8796" fontSize="11">50</text>
              <text x={plotRight-6} y={ry(30)-5} textAnchor="end" fill="#7a8796" fontSize="11">30</text>
            </>
          )
        })()}
      </svg>
    </div>
  )
}

function bearishLevels(r: Result): number[] {
  const sl = r.invalidation
  const supports = (r.support || []).filter(s => s < (r.side==='SELL'?r.entryHigh:sl)).sort((a, b) => b - a)
  const s1 = supports[0] ?? sl * 0.992
  const s2 = supports[1] ?? (supports[0] ? supports[0] * 0.995 : sl * 0.985)
  const deep = supports.length >= 2 ? supports[supports.length - 1] : sl * 0.97
  const levels = r.side==='SELL' ? [r.tp[0], r.tp[1], r.tp[2]] : [sl, s1, s2, deep]
  const uniq: number[] = []
  for (const v of levels.sort((a, b) => b - a)) {
    if (!uniq.length || Math.abs(uniq[uniq.length - 1] - v) / (Math.abs(sl) || 1) > 0.0015) uniq.push(v)
  }
  while (uniq.length < 4) uniq.push(uniq[uniq.length - 1] * 0.99)
  return uniq.slice(0, 4)
}

export default function PremiumAnalyst(){
  const searchParams=useSearchParams()
  const urlSymbol=(searchParams.get('symbol')||'').toUpperCase()
  const initial=coins.includes(urlSymbol)?urlSymbol:'BTC'
  const [coin,setCoin]=useState(initial),[interval,setInterval]=useState('1h'),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')

  useEffect(()=>{
    if(coins.includes(urlSymbol) && urlSymbol!==coin) setCoin(urlSymbol)
  },[urlSymbol])

  async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/analyze?symbol=${coin}&interval=${interval}`);const j=await r.json();if(!r.ok)throw new Error(j.error||'Market data xatosi');setData(j)}catch(e:any){setError(e.message||'Xato')}finally{setLoading(false)}}
  useEffect(()=>{load()},[coin,interval])
  const r=data?.result
  const tf=tfShort(interval)
  const bearPath = r ? bearishLevels(r) : []
  const risk = r
    ? (r.side==='SELL' ? Math.max(r.invalidation - r.entryHigh, 0) : Math.max(r.entryHigh - r.invalidation, 0))
    : 0
  const reward = r
    ? (r.side==='SELL' ? Math.max(r.entryHigh - r.tp[0], 0) : Math.max(r.tp[0] - r.entryHigh, 0))
    : 0
  const rr = risk > 0 ? (reward / risk).toFixed(1) : '—'

  return <section className="homeAnalyst">
    <div className="homeAnalystHead">
      <div>
        <div className="homeKicker">⭐ PREMIUM TAHLIL</div>
        <h2>Kengaytirilgan kripto bozor tahlili</h2>
        <p>15 ta coin · M15 / H1 / H4 / D1 · BUY/SELL · Entry · TP · SL · Risk:Reward</p>
      </div>
      <div className="homeControls">
        <select value={coin} onChange={e=>setCoin(e.target.value)}>{coins.map(c=><option key={c}>{c}</option>)}</select>
        <select value={interval} onChange={e=>setInterval(e.target.value)}>{intervals.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <button onClick={load}>↻ Yangilash</button>
      </div>
    </div>

    {loading?<div className="homeLoading">Premium grafik yuklanmoqda...</div>:error?<div className="homeLoading error">{error}</div>:r&&<>
      <div className="homeChartPanel">
        <CleanChart candles={data.candles} result={r} coin={coin} interval={interval}/>
      </div>

      <div className="proAnalysis">
        <div className="proCard">
          <h3>📊 TEXNIK TAHLIL · {tf}</h3>
          <div className="proRow"><span>TREND</span><strong className={r.trend==='BULLISH'?'good':r.trend==='BEARISH'?'bad':''}>{r.trend==='BULLISH'?'Bullish':r.trend==='BEARISH'?'Bearish':'Neytral'}</strong></div>
          <div className="proRow"><span>SIGNAL</span><strong className={r.side==='SELL'?'bad':'good'}>{r.side==='SELL'?'SELL':'BUY'}</strong></div>
          <div className="proRow"><span>RSI (14)</span><strong>{r.rsi.toFixed(2)}</strong></div>
          <div className="proRow"><span>R:R (TP1)</span><strong className="good">1 : {rr}</strong></div>
          <p className="proNote">{r.rsi>=50?'RSI 50 dan yuqorida, bu bullish momentumni ko\'rsatadi.':'RSI 50 dan past, momentum susaygan.'}</p>
          <div className="proRow"><span>ASOSIY XULOSA</span></div>
          <p className="proSummary">{r.summary}</p>
        </div>

        <div className="proCard">
          <div className={`proBox ${r.side==='SELL'?'red':'green'}`}>
            <b>KIRISH ZONASI ({r.side==='SELL'?'SELL':'BUY'})</b>
            <strong>{money$(r.entryLow)} – {money$(r.entryHigh)}</strong>
          </div>
          <div className="proBox red">
            <b>STOP LOSS (SL)</b>
            <strong>{money$(r.invalidation)}</strong>
            <small>{r.side==='SELL'?'yuqorisida':'pastida'} {tf} candle yopilsa</small>
          </div>
          <div className="proBox tp">
            <b>TAKE PROFIT (TP)</b>
            <div className="tpLine"><span>TP1</span><strong>{money$(r.tp[0])}</strong></div>
            <div className="tpLine"><span>TP2</span><strong>{money$(r.tp[1])}</strong></div>
            <div className="tpLine"><span>TP3</span><strong>{money$(r.tp[2])}</strong></div>
          </div>
        </div>

        <div className="proCard bullCard">
          <h3 className="bullText">🟢 BULLISH SENARIY · {tf}</h3>
          <p>{r.bullish}</p>
          <div className="levelPath greenPath">
            {r.side==='SELL'
              ? <>{money$(r.entryHigh)} ↑ {money$(r.invalidation)}</>
              : <>{money$(r.entryHigh)} ↑ {money$(r.tp[0])} ↑ {money$(r.tp[1])} ↑ {money$(r.tp[2])}</>}
          </div>
        </div>

        <div className="proCard bearCard">
          <h3 className="bearText">🔴 BEARISH SENARIY · {tf}</h3>
          <p>{r.bearish}</p>
          <div className="levelPath redPath">
            {r.side==='SELL'
              ? <>{money$(r.tp[0])} ↓ {money$(r.tp[1])} ↓ {money$(r.tp[2])}</>
              : <>{money$(bearPath[0])} ↓ {money$(bearPath[1])} ↓ {money$(bearPath[2])} ↓ {money$(bearPath[3])}</>}
          </div>
        </div>
      </div>

      <p className="homeDisclaimer">⚠️ Eslatma: Ushbu tahlil faqat axborot maqsadida. Investitsiya tavsiyasi emas. Savdo qilishdan oldin o\'zingiz tahlil qiling.</p>
    </>
  </section>
}
