'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Candle={time:number;open:number;high:number;low:number;close:number;volume:number}
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;side?:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

const coins=['BTC','ETH','LTC','SOL','BNB','NEAR','GRAM','SUI','APT','ATOM']
const intervals=[['1h','H1'],['4h','H4'],['1d','D1']]
function money(n:number){if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:0});if(n>=1)return n.toFixed(2);return n.toFixed(5)}
function money$(n:number){return '$'+money(n)}
function tfShort(interval:string){return interval==='4h'?'H4':interval==='1d'?'D1':'H1'}
function rsiSeries(c:Candle[],p=14){const out:number[]=[];let g=0,l=0;for(let i=0;i<c.length;i++){if(i===0){out.push(50);continue}const d=c[i].close-c[i-1].close,gg=Math.max(d,0),ll=Math.max(-d,0);if(i<=p){g+=gg;l+=ll;out.push(i===p?(l===0?100:100-100/(1+g/l)):50)}else{g=(g*(p-1)+gg)/p;l=(l*(p-1)+ll)/p;out.push(l===0?100:100-100/(1+g/l))}}return out}
function emaSeries(c:Candle[],p:number){let a=c[0]?.close||0,k=2/(p+1);return c.map((x,i)=>{if(i)a=x.close*k+a*(1-k);return a})}

function CleanChart({candles,result,coin,interval}:{candles:Candle[];result:Result;coin:string;interval:string}){
  const [zoom,setZoom]=useState(1)
  const W=1700,H=820,L=68,R=210,T=78,MB=540,RT=580,RB=740
  const plotRight=W-R
  const candleRight=L+(plotRight-L)*0.93
  const min=Math.min(...candles.map(c=>c.low),result.entryLow,...result.tp,result.invalidation)*.997
  const max=Math.max(...candles.map(c=>c.high),result.entryHigh,...result.tp,result.invalidation)*1.003
  const x=(i:number)=>L+i*(candleRight-L)/Math.max(1,candles.length-1)
  const y=(v:number)=>MB-(v-min)/(max-min)*(MB-T)
  const ry=(v:number)=>RB-(Math.max(0,Math.min(100,v))/100)*(RB-RT)
  const e10=emaSeries(candles,10),e20=emaSeries(candles,20),e50=emaSeries(candles,50),rs=rsiSeries(candles)
  const poly=(arr:number[])=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(' ')
  const last=candles[candles.length-1]
  const latest=last?.close||0, lx=x(candles.length-1)
  const prev=candles[candles.length-2]?.close||latest
  const chg=latest-prev, chgPct=prev?(chg/prev)*100:0
  const cw=Math.max(2.5,Math.min(11,(candleRight-L)/candles.length*.65))
  const zoneLeft=x(Math.max(0,candles.length-18))
  const zoneW=Math.max(80,lx+35-zoneLeft)
  const arrowStartX=lx+10
  const arrowEndX=plotRight-16
  const labelX=plotRight+10
  const tf=interval==='4h'?'4 soatlik (H4)':interval==='1d'?'1 kunlik (D1)':'1 soatlik (H1)'
  const isSell=result.side==='SELL'

  const rightBox=(yy:number,text:string,bg:string,w=100)=>(
    <g>
      <line x1={L} x2={plotRight} y1={yy} y2={yy} stroke={bg} strokeWidth="1.4" strokeDasharray="7 6" opacity=".85"/>
      <rect x={labelX} y={yy-13} width={w} height={26} rx="4" fill={bg}/>
      <text x={labelX+w/2} y={yy+5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">{text}</text>
    </g>
  )

  return (
    <div className="homeChartWrap">
      <div className="chartZoomControls">
        <button onClick={()=>setZoom(z=>Math.min(1.8,+(z+0.2).toFixed(1)))}>＋</button>
        <span>{Math.round(zoom*100)}%</span>
        <button onClick={()=>setZoom(z=>Math.max(1,+(z-0.2).toFixed(1)))}>−</button>
        <button onClick={()=>setZoom(1)}>Reset</button>
      </div>
      <div className="homeChartScroller">
        <svg viewBox={`0 0 ${W} ${H}`} className="homeChart" style={{width:`${zoom*100}%`,maxWidth:'none'}} role="img" aria-label={`${coin} ${interval} professional technical analysis`}>
          <defs>
            <linearGradient id="hcMain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a1018"/><stop offset="1" stopColor="#070b11"/>
            </linearGradient>
            <marker id="hcBull" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="#20d67a"/>
            </marker>
          </defs>

          <rect width={W} height={H} fill="url(#hcMain)"/>
          <rect x="0" y={RT-16} width={W} height={RB-RT+50} fill="#0e1320"/>

          {[0,.2,.4,.6,.8,1].map(v=><line key={v} x1={L} x2={plotRight} y1={T+v*(MB-T)} y2={T+v*(MB-T)} stroke="#182230"/>)}
          {[30,50,70].map(v=><line key={v} x1={L} x2={plotRight} y1={ry(v)} y2={ry(v)} stroke="#3a4658" strokeDasharray="4 6"/>)}

          <text x={L} y="28" fill="#f0b90b" fontSize="18" fontWeight="800">{coin}/USDT · {tf} · {isSell?'SELL':'BUY'}</text>
          <text x={L} y="50" fill="#9aa7b8" fontSize="12">
            O {money(last?.open||0)}   H {money(last?.high||0)}   L {money(last?.low||0)}   C {money(latest)}{'  '}
            <tspan fill={chg>=0?'#20d67a':'#ff5360'}>{chg>=0?'+':''}{money(chg)} ({chgPct>=0?'+':''}{chgPct.toFixed(2)}%)</tspan>
          </text>

          <text x={L} y="70" fill="#ff9f0a" fontSize="12" fontWeight="700">EMA 10 (to‘q sariq): {money(result.ema10)}</text>
          <text x={L+260} y="70" fill="#00c7e6" fontSize="12" fontWeight="700">EMA 20 (ko‘k): {money(result.ema20)}</text>
          <text x={L+500} y="70" fill="#4aa8ff" fontSize="12" fontWeight="700">EMA 50 (havorang): {money(result.ema50)}</text>

          {candles.map((c,i)=>{
            const up=c.close>=c.open
            return <g key={c.time}>
              <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={up?'#36d66f':'#ff4d5a'} strokeWidth="1.15"/>
              <rect x={x(i)-cw/2} y={Math.min(y(c.open),y(c.close))} width={cw} height={Math.max(1.4,Math.abs(y(c.open)-y(c.close)))} fill={up?'#36d66f':'#ff4d5a'} rx="1"/>
            </g>
          })}

          <polyline points={poly(e10)} fill="none" stroke="#ff9f0a" strokeWidth="1.9"/>
          <polyline points={poly(e20)} fill="none" stroke="#00c7e6" strokeWidth="1.9"/>
          <polyline points={poly(e50)} fill="none" stroke="#4aa8ff" strokeWidth="1.9"/>

          <rect x={zoneLeft} y={Math.min(y(result.entryHigh),y(result.entryLow))} width={zoneW} height={Math.max(12,Math.abs(y(result.entryLow)-y(result.entryHigh)))} fill={isSell?'#c52f3a':'#1dbf6b'} fillOpacity=".18" stroke={isSell?'#ff4d5a':'#20d67a'} strokeOpacity=".55" rx="3"/>

          <line x1={lx} x2={plotRight} y1={y(latest)} y2={y(latest)} stroke="#65d9ff" strokeDasharray="3 4" strokeWidth="1.2"/>
          <rect x={labelX} y={y(latest)-13} width="100" height="26" rx="4" fill={isSell?'#c52f3a':'#1a9e55'}/>
          <text x={labelX+50} y={y(latest)+5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">{money(latest)}</text>

          {rightBox(y(result.tp[2]),`TP3  ${money(result.tp[2]||0)}`,'#148f55')}
          {rightBox(y(result.tp[1]),`TP2  ${money(result.tp[1]||0)}`,'#148f55')}
          {rightBox(y(result.tp[0]),`TP1  ${money(result.tp[0]||0)}`,'#148f55')}
          {rightBox(y(result.invalidation),`SL  ${money(result.invalidation)}`,'#c52f3a')}

          <line x1={arrowStartX} y1={y(latest)} x2={arrowEndX} y2={y(result.tp[0])} stroke={isSell?'#ff4d5a':'#20d67a'} strokeWidth="2.2" strokeDasharray="8 5" markerEnd={isSell?undefined:'url(#hcBull)'}/>
          <line x1={arrowStartX} y1={y(latest)} x2={arrowEndX} y2={y(result.tp[1])} stroke={isSell?'#ff4d5a':'#20d67a'} strokeWidth="1.9" strokeDasharray="8 5" markerEnd={isSell?undefined:'url(#hcBull)'} opacity=".88"/>

          <text x={L} y={RT+6} fill="#e6edf3" fontSize="14" fontWeight="800">RSI 14  {result.rsi.toFixed(2)}</text>
          <polyline points={rs.map((v,i)=>`${x(i)},${ry(v)}`).join(' ')} fill="none" stroke="#a78bfa" strokeWidth="2"/>
          <rect x={labelX} y={ry(result.rsi)-12} width="70" height="24" rx="4" fill="#5b4a9a"/>
          <text x={labelX+35} y={ry(result.rsi)+5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{result.rsi.toFixed(2)}</text>
          <text x={plotRight-6} y={ry(70)-5} textAnchor="end" fill="#7a8796" fontSize="11">70</text>
          <text x={plotRight-6} y={ry(50)-5} textAnchor="end" fill="#7a8796" fontSize="11">50</text>
          <text x={plotRight-6} y={ry(30)-5} textAnchor="end" fill="#7a8796" fontSize="11">30</text>
        </svg>
      </div>
    </div>
  )
}

function bearishLevels(r: Result): number[] {
  if (r.side==='SELL') {
    return [r.entryHigh, r.tp[0], r.tp[1], r.tp[2]]
  }
  const sl = r.invalidation
  const supports = (r.support || []).filter(s => s < sl).sort((a, b) => b - a)
  const s1 = supports[0] ?? sl * 0.992
  const s2 = supports[1] ?? (supports[0] ? supports[0] * 0.995 : sl * 0.985)
  const deep = supports.length >= 2 ? supports[supports.length - 1] : sl * 0.97
  const levels = [sl, s1, s2, deep]
  const uniq: number[] = []
  for (const v of levels.sort((a, b) => b - a)) {
    if (!uniq.length || Math.abs(uniq[uniq.length - 1] - v) / (sl || 1) > 0.0015) uniq.push(v)
  }
  while (uniq.length < 4) uniq.push(uniq[uniq.length - 1] * 0.99)
  return uniq.slice(0, 4)
}

export default function HomeAnalyst(){
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

  return <section className="homeAnalyst">
    <div className="homeAnalystHead">
      <div>
        <div className="homeKicker">🤖 AI CRYPTO ANALYST</div>
        <h2>Real vaqtda kripto bozor tahlili</h2>
        <p>Jonli market data asosida avtomatik BUY/SELL · Entry · TP · SL va texnik xulosa.</p>
      </div>
      <div className="homeControls">
        <select value={coin} onChange={e=>setCoin(e.target.value)}>{coins.map(c=><option key={c}>{c}</option>)}</select>
        <select value={interval} onChange={e=>setInterval(e.target.value)}>{intervals.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <button onClick={load}>↻ Yangilash</button>
      </div>
    </div>

    {loading?<div className="homeLoading">Grafik va tahlil yuklanmoqda...</div>:error?<div className="homeLoading error">{error}</div>:r&&<>
      <div className="homeChartPanel">
        <CleanChart candles={data.candles} result={r} coin={coin} interval={interval}/>
      </div>

      <div className="proAnalysis">
        <div className="proCard">
          <h3>📊 TEXNIK TAHLIL · {tf}</h3>
          <div className="proRow"><span>TREND</span><strong className={r.trend==='BULLISH'?'good':r.trend==='BEARISH'?'bad':''}>{r.trend==='BULLISH'?'Bullish':r.trend==='BEARISH'?'Bearish':'Neytral'}</strong></div>
          <div className="proRow"><span>SIGNAL</span><strong className={r.side==='SELL'?'bad':'good'}>{r.side==='SELL'?'SELL':'BUY'}</strong></div>
          <div className="proRow"><span>RSI (14)</span><strong>{r.rsi.toFixed(2)}</strong></div>
          <p className="proNote">{r.rsi>=50?'RSI 50 dan yuqorida, bu bullish momentumni ko‘rsatadi.':'RSI 50 dan past, momentum susaygan.'}</p>
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
            {money$(bearPath[0])} ↓ {money$(bearPath[1])} ↓ {money$(bearPath[2])} ↓ {money$(bearPath[3])}
          </div>
        </div>
      </div>

      <p className="homeDisclaimer">⚠️ Eslatma: Ushbu tahlil faqat axborot maqsadida. Investitsiya tavsiyasi emas. Savdo qilishdan oldin o‘zingiz tahlil qiling.</p>
    </>}
  </section>
}
