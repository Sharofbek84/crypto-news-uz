'use client'

import { useEffect, useState } from 'react'

type Candle={time:number;open:number;high:number;low:number;close:number;volume:number}
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

const coins=['BTC','ETH','SOL','SUI','APT','XRP','BNB','CORE','MYX','ALEO']
const intervals=[['1h','H1'],['4h','H4'],['1d','D1']]
function money(n:number){if(n>=1000)return n.toLocaleString('en-US',{maximumFractionDigits:0});if(n>=1)return n.toFixed(2);return n.toFixed(5)}
function money$(n:number){return '$'+money(n)}
function rsiSeries(c:Candle[],p=14){const out:number[]=[];let g=0,l=0;for(let i=0;i<c.length;i++){if(i===0){out.push(50);continue}const d=c[i].close-c[i-1].close,gg=Math.max(d,0),ll=Math.max(-d,0);if(i<=p){g+=gg;l+=ll;out.push(i===p?(l===0?100:100-100/(1+g/l)):50)}else{g=(g*(p-1)+gg)/p;l=(l*(p-1)+ll)/p;out.push(l===0?100:100-100/(1+g/l))}}return out}
function emaSeries(c:Candle[],p:number){let a=c[0]?.close||0,k=2/(p+1);return c.map((x,i)=>{if(i)a=x.close*k+a*(1-k);return a})}

function CleanChart({candles,result,coin,interval}:{candles:Candle[];result:Result;coin:string;interval:string}){
  const [zoom,setZoom]=useState(1)
  const W=1600,H=820,L=70,R=200,T=78,MB=540,RT=580,RB=740
  const plotRight=W-R
  const min=Math.min(...candles.map(c=>c.low),result.invalidation,result.entryLow)*.997
  const max=Math.max(...candles.map(c=>c.high),...result.tp)*1.003
  const x=(i:number)=>L+i*(plotRight-L)/Math.max(1,candles.length-1)
  const y=(v:number)=>MB-(v-min)/(max-min)*(MB-T)
  const ry=(v:number)=>RB-(Math.max(0,Math.min(100,v))/100)*(RB-RT)
  const e10=emaSeries(candles,10),e20=emaSeries(candles,20),e50=emaSeries(candles,50),rs=rsiSeries(candles)
  const poly=(arr:number[])=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(' ')
  const last=candles[candles.length-1]
  const latest=last?.close||0, lx=x(candles.length-1)
  const prev=candles[candles.length-2]?.close||latest
  const chg=latest-prev, chgPct=prev? (chg/prev)*100:0
  const cw=Math.max(2.5,Math.min(10,(plotRight-L)/candles.length*.65))
  const zoneLeft=x(Math.max(0,candles.length-20))
  const zoneW=Math.max(90,lx+55-zoneLeft)
  const arrowEndX=plotRight-12
  const labelX=plotRight+8
  const tf=interval==='4h'?'4 soatlik (H4)':interval==='1d'?'1 kunlik (D1)':'1 soatlik (H1)'

  const rightBox=(yy:number,text:string,bg:string,w=92)=>(
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
            <marker id="hcBull" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0 0L9 4.5L0 9Z" fill="#20d67a"/>
            </marker>
          </defs>

          <rect width={W} height={H} fill="url(#hcMain)"/>
          <rect x="0" y={RT-16} width={W} height={RB-RT+50} fill="#0e1320"/>

          {/* grid */}
          {[0,.2,.4,.6,.8,1].map(v=><line key={v} x1={L} x2={plotRight} y1={T+v*(MB-T)} y2={T+v*(MB-T)} stroke="#182230"/>)}
          {[30,50,70].map(v=><line key={v} x1={L} x2={plotRight} y1={ry(v)} y2={ry(v)} stroke="#3a4658" strokeDasharray="4 6"/>)}

          {/* header title + OHLC */}
          <text x={L} y="28" fill="#f0b90b" fontSize="18" fontWeight="800">{coin}/USDT · {tf}</text>
          <text x={L} y="50" fill="#9aa7b8" fontSize="12">
            O {money(last?.open||0)}   H {money(last?.high||0)}   L {money(last?.low||0)}   C {money(latest)}{'  '}
            <tspan fill={chg>=0?'#20d67a':'#ff5360'}>{chg>=0?'+':''}{money(chg)} ({chgPct>=0?'+':''}{chgPct.toFixed(2)}%)</tspan>
          </text>

          {/* EMA legend with values */}
          <text x={L} y="70" fill="#ff9f0a" fontSize="12" fontWeight="700">EMA 10 (to‘q sariq): {money(result.ema10)}</text>
          <text x={L+260} y="70" fill="#00c7e6" fontSize="12" fontWeight="700">EMA 20 (ko‘k): {money(result.ema20)}</text>
          <text x={L+500} y="70" fill="#4aa8ff" fontSize="12" fontWeight="700">EMA 50 (havorang): {money(result.ema50)}</text>

          {/* candles */}
          {candles.map((c,i)=>{
            const up=c.close>=c.open
            return <g key={c.time}>
              <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={up?'#36d66f':'#ff4d5a'} strokeWidth="1.15"/>
              <rect x={x(i)-cw/2} y={Math.min(y(c.open),y(c.close))} width={cw} height={Math.max(1.4,Math.abs(y(c.open)-y(c.close)))} fill={up?'#36d66f':'#ff4d5a'} rx="1"/>
            </g>
          })}

          {/* EMAs */}
          <polyline points={poly(e10)} fill="none" stroke="#ff9f0a" strokeWidth="1.9"/>
          <polyline points={poly(e20)} fill="none" stroke="#00c7e6" strokeWidth="1.9"/>
          <polyline points={poly(e50)} fill="none" stroke="#4aa8ff" strokeWidth="1.9"/>

          {/* entry zone */}
          <rect x={zoneLeft} y={y(result.entryHigh)} width={zoneW} height={Math.max(12,y(result.entryLow)-y(result.entryHigh))} fill="#1dbf6b" fillOpacity=".18" stroke="#20d67a" strokeOpacity=".55" rx="3"/>
          <rect x={zoneLeft+zoneW-118} y={y((result.entryLow+result.entryHigh)/2)-18} width="112" height="36" rx="4" fill="#0d3d28" fillOpacity=".92" stroke="#20d67a" strokeOpacity=".5"/>
          <text x={zoneLeft+zoneW-62} y={y((result.entryLow+result.entryHigh)/2)-3} textAnchor="middle" fill="#20d67a" fontSize="11" fontWeight="800">KIRISH ZONASI</text>
          <text x={zoneLeft+zoneW-62} y={y((result.entryLow+result.entryHigh)/2)+12} textAnchor="middle" fill="#b8f5d0" fontSize="11" fontWeight="700">{money(result.entryLow)} – {money(result.entryHigh)}</text>

          {/* current price line + box */}
          <line x1={lx} x2={plotRight} y1={y(latest)} y2={y(latest)} stroke="#65d9ff" strokeDasharray="3 4" strokeWidth="1.2"/>
          <rect x={labelX} y={y(latest)-13} width="92" height="26" rx="4" fill="#1a9e55"/>
          <text x={labelX+46} y={y(latest)+5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">{money(latest)}</text>

          {/* TP / SL boxes */}
          {rightBox(y(result.tp[2]||latest*1.03),`TP3  ${money(result.tp[2]||0)}`,'#148f55')}
          {rightBox(y(result.tp[1]||latest*1.02),`TP2  ${money(result.tp[1]||0)}`,'#148f55')}
          {rightBox(y(result.tp[0]||latest*1.01),`TP1  ${money(result.tp[0]||0)}`,'#148f55')}
          {rightBox(y(result.invalidation),`SL  ${money(result.invalidation)}`,'#c52f3a')}

          {/* straight arrows to TPs */}
          <line x1={lx+14} y1={y(latest)-4} x2={arrowEndX-20} y2={y(result.tp[0]||latest)+4} stroke="#20d67a" strokeWidth="2" strokeDasharray="7 5" markerEnd="url(#hcBull)"/>
          <line x1={lx+14} y1={y(latest)-10} x2={arrowEndX-20} y2={y(result.tp[1]||latest)-2} stroke="#20d67a" strokeWidth="1.8" strokeDasharray="7 5" markerEnd="url(#hcBull)" opacity=".85"/>

          {/* RSI */}
          <text x={L} y={RT+6} fill="#e6edf3" fontSize="14" fontWeight="800">RSI 14  {result.rsi.toFixed(2)}</text>
          <polyline points={rs.map((v,i)=>`${x(i)},${ry(v)}`).join(' ')} fill="none" stroke="#a78bfa" strokeWidth="2"/>
          <rect x={plotRight+8} y={ry(result.rsi)-12} width="70" height="24" rx="4" fill="#5b4a9a"/>
          <text x={plotRight+43} y={ry(result.rsi)+5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{result.rsi.toFixed(2)}</text>
          <text x={plotRight-6} y={ry(70)-5} textAnchor="end" fill="#7a8796" fontSize="11">70</text>
          <text x={plotRight-6} y={ry(50)-5} textAnchor="end" fill="#7a8796" fontSize="11">50</text>
          <text x={plotRight-6} y={ry(30)-5} textAnchor="end" fill="#7a8796" fontSize="11">30</text>
        </svg>
      </div>
    </div>
  )
}

export default function HomeAnalyst(){
  const [coin,setCoin]=useState('BTC'),[interval,setInterval]=useState('4h'),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/analyze?symbol=${coin}&interval=${interval}`);const j=await r.json();if(!r.ok)throw new Error(j.error||'Market data xatosi');setData(j)}catch(e:any){setError(e.message||'Xato')}finally{setLoading(false)}}
  useEffect(()=>{load()},[coin,interval])
  const r=data?.result

  return <section className="homeAnalyst">
    <div className="homeAnalystHead">
      <div>
        <div className="homeKicker">🤖 AI CRYPTO ANALYST</div>
        <h2>Professional TradingView tahlili</h2>
        <p>Jonli market data asosida avtomatik Entry · TP1 · TP2 · TP3 · SL va texnik xulosa.</p>
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
          <h3>📊 TEXNIK TAHLIL</h3>
          <div className="proRow"><span>TREND</span><strong className={r.trend==='BULLISH'?'good':r.trend==='BEARISH'?'bad':''}>{r.trend==='BULLISH'?'Bullish':r.trend==='BEARISH'?'Bearish':'Neytral → Bullish momentum'}</strong></div>
          <div className="proRow"><span>RSI (14)</span><strong>{r.rsi.toFixed(2)}</strong></div>
          <p className="proNote">{r.rsi>=50?'RSI 50 dan yuqorida, bu bullish momentumni ko‘rsatadi.':'RSI 50 dan past, momentum susaygan.'}</p>
          <div className="proRow"><span>ASOSIY XULOSA</span></div>
          <p className="proSummary">{r.summary}</p>
        </div>

        <div className="proCard">
          <div className="proBox green">
            <b>KIRISH ZONASI (BUY)</b>
            <strong>{money$(r.entryLow)} – {money$(r.entryHigh)}</strong>
          </div>
          <div className="proBox red">
            <b>STOP LOSS (SL)</b>
            <strong>{money$(r.invalidation)}</strong>
            <small>pastida 4H candle yopilsa</small>
          </div>
          <div className="proBox tp">
            <b>TAKE PROFIT (TP)</b>
            <div className="tpLine"><span>TP1</span><strong>{money$(r.tp[0])}</strong></div>
            <div className="tpLine"><span>TP2</span><strong>{money$(r.tp[1])}</strong></div>
            <div className="tpLine"><span>TP3</span><strong>{money$(r.tp[2])}</strong></div>
          </div>
        </div>

        <div className="proCard bullCard">
          <h3 className="bullText">🟢 BULLISH SENARIY</h3>
          <p>{r.bullish}</p>
          <div className="levelPath greenPath">
            {money$(r.entryHigh)} ↑ {money$(r.tp[0])} ↑ {money$(r.tp[1])} ↑ {money$(r.tp[2])}
          </div>
        </div>

        <div className="proCard bearCard">
          <h3 className="bearText">🔴 BEARISH SENARIY</h3>
          <p>{r.bearish}</p>
          <div className="levelPath redPath">
            {money$(r.invalidation)} ↓ {money$(r.invalidation*0.99)} ↓ {money$(r.invalidation*0.97)}
          </div>
        </div>
      </div>

      <p className="homeDisclaimer">⚠️ Eslatma: Ushbu tahlil faqat axborot maqsadida. Investitsiya tavsiyasi emas. Savdo qilishdan oldin o‘zingiz tahlil qiling.</p>
    </>}
  </section>
}
