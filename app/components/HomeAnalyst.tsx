'use client'

import { useEffect, useState } from 'react'

type Candle={time:number;open:number;high:number;low:number;close:number;volume:number}
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

const coins=['BTC','ETH','SOL','SUI','APT','XRP','BNB','CORE','MYX','ALEO']
const intervals=[['1h','H1'],['4h','H4'],['1d','D1']]
function money(n:number){if(n>=1000)return '$'+n.toLocaleString('en-US',{maximumFractionDigits:0});if(n>=1)return '$'+n.toFixed(2);return '$'+n.toFixed(5)}
function rsiSeries(c:Candle[],p=14){const out:number[]=[];let g=0,l=0;for(let i=0;i<c.length;i++){if(i===0){out.push(50);continue}const d=c[i].close-c[i-1].close,gg=Math.max(d,0),ll=Math.max(-d,0);if(i<=p){g+=gg;l+=ll;out.push(i===p?(l===0?100:100-100/(1+g/l)):50)}else{g=(g*(p-1)+gg)/p;l=(l*(p-1)+ll)/p;out.push(l===0?100:100-100/(1+g/l))}}return out}
function emaSeries(c:Candle[],p:number){let a=c[0]?.close||0,k=2/(p+1);return c.map((x,i)=>{if(i)a=x.close*k+a*(1-k);return a})}

function CleanChart({candles,result,coin,interval}:{candles:Candle[];result:Result;coin:string;interval:string}){
  const [zoom,setZoom]=useState(1)
  // Reserve a generous right-side "breathing room" so the latest candles never touch Entry/TP/SL labels.
  const W=1500,H=780,L=62,R=280,T=48,MB=520,RT=565,RB=700
  const min=Math.min(...candles.map(c=>c.low),result.invalidation,result.entryLow)*.998
  const max=Math.max(...candles.map(c=>c.high),...result.tp)*1.002
  const x=(i:number)=>L+i*(W-L-R)/Math.max(1,candles.length-1)
  const y=(v:number)=>MB-(v-min)/(max-min)*(MB-T)
  const ry=(v:number)=>RB-(Math.max(0,Math.min(100,v))/100)*(RB-RT)
  const e10=emaSeries(candles,10),e20=emaSeries(candles,20),e50=emaSeries(candles,50),rs=rsiSeries(candles)
  const poly=(arr:number[])=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(' ')
  const latest=candles[candles.length-1]?.close||0, lx=x(candles.length-1), fw=Math.min(W-R,lx+110)
  const cw=Math.max(3,Math.min(11,(W-L-R)/candles.length*.7))
  const label=(yy:number,text:string,fill:string)=> <g><line x1={L} x2={W-R} y1={yy} y2={yy} stroke={fill} strokeWidth="1.6" strokeDasharray="9 7"/><rect x={W-R+10} y={yy-15} width="170" height="30" rx="5" fill={fill}/><text x={W-R+95} y={yy+5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">{text}</text></g>
  return <div className="homeChartWrap"><div className="chartZoomControls"><button onClick={()=>setZoom(z=>Math.min(1.8,+(z+0.2).toFixed(1)))}>＋</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.max(1,+(z-0.2).toFixed(1)))}>−</button><button onClick={()=>setZoom(1)}>Reset</button></div><div className="homeChartScroller"><svg viewBox={`0 0 ${W} ${H}`} className="homeChart" style={{width:`${zoom*100}%`,maxWidth:'none'}} role="img" aria-label={`${coin} ${interval} professional technical analysis`}>
    <defs><linearGradient id="hcMain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1420"/><stop offset="1" stopColor="#081019"/></linearGradient><marker id="hcBull" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#20d67a"/></marker></defs>
    <rect width={W} height={H} fill="url(#hcMain)"/><rect x="0" y={RT-18} width={W} height={RB-RT+40} fill="#111326"/>
    {[0,.2,.4,.6,.8,1].map(v=><line key={v} x1={L} x2={W-R} y1={T+v*(MB-T)} y2={T+v*(MB-T)} stroke="#1c2a38"/>)}
    {[30,50,70].map(v=><line key={v} x1={L} x2={W-R} y1={ry(v)} y2={ry(v)} stroke="#596474" strokeDasharray="5 7"/>)}
    <text x={L} y="27" fill="#f0f4f8" fontSize="21" fontWeight="800">{coin}/USDT · {interval==='4h'?'4 soatlik (H4)':interval==='1d'?'1 kunlik (D1)':'1 soatlik (H1)'}</text>
    <text x={L} y="48" fill="#ff9f0a" fontSize="13">EMA 10</text><text x={L+82} y="48" fill="#00c7e6" fontSize="13">EMA 20</text><text x={L+164} y="48" fill="#4aa8ff" fontSize="13">EMA 50</text>
    {candles.map((c,i)=>{const up=c.close>=c.open;return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={up?'#36d66f':'#ff4d5a'} strokeWidth="1.25"/><rect x={x(i)-cw/2} y={Math.min(y(c.open),y(c.close))} width={cw} height={Math.max(1.5,Math.abs(y(c.open)-y(c.close)))} fill={up?'#36d66f':'#ff4d5a'} rx="1"/></g>})}
    <polyline points={poly(e10)} fill="none" stroke="#ff9f0a" strokeWidth="2"/><polyline points={poly(e20)} fill="none" stroke="#00c7e6" strokeWidth="2"/><polyline points={poly(e50)} fill="none" stroke="#4aa8ff" strokeWidth="2"/>
    <line x1={lx} x2={W-R} y1={y(latest)} y2={y(latest)} stroke="#65d9ff" strokeDasharray="3 5"/><rect x={W-R+10} y={y(latest)-15} width="170" height="30" rx="5" fill="#1d9f59"/><text x={W-R+95} y={y(latest)+5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800">{money(latest)}</text>
    <rect x={x(Math.max(0,candles.length-16))} y={y(result.entryHigh)} width={Math.max(100,fw-x(Math.max(0,candles.length-16)))} height={Math.max(10,y(result.entryLow)-y(result.entryHigh))} fill="#1dbf6b" fillOpacity=".12" stroke="#20d67a" strokeOpacity=".45" rx="4"/><text x={fw-10} y={y((result.entryLow+result.entryHigh)/2)+5} textAnchor="end" fill="#20d67a" fontSize="13" fontWeight="800">KIRISH ZONASI</text>
    {label(y(result.entryHigh),`ENTRY ${money(result.entryLow)}–${money(result.entryHigh)}`,'#188a52')}
    {label(y(result.tp[0]||latest),`TP1 ${money(result.tp[0]||latest)}`,'#148f55')}
    {label(y(result.tp[1]||latest),`TP2 ${money(result.tp[1]||latest)}`,'#148f55')}
    {label(y(result.tp[2]||latest),`TP3 ${money(result.tp[2]||latest)}`,'#148f55')}
    {label(y(result.invalidation),`SL ${money(result.invalidation)}`,'#c52f3a')}
    <path d={`M${lx},${y(latest)-5} C${lx+45},${y(latest)-40} ${fw-40},${y(result.tp[0]||latest)+30} ${fw},${y(result.tp[0]||latest)}`} fill="none" stroke="#20d67a" strokeWidth="2" strokeDasharray="8 6" markerEnd="url(#hcBull)"/>
    <text x={L} y={RT+4} fill="#e6edf3" fontSize="16" fontWeight="800">RSI (14) · {result.rsi.toFixed(2)}</text><polyline points={rs.map((v,i)=>`${x(i)},${ry(v)}`).join(' ')} fill="none" stroke="#a78bfa" strokeWidth="2.2"/>
    <text x={W-R-8} y={ry(70)-6} textAnchor="end" fill="#8c98a6" fontSize="12">70</text><text x={W-R-8} y={ry(50)-6} textAnchor="end" fill="#8c98a6" fontSize="12">50</text><text x={W-R-8} y={ry(30)-6} textAnchor="end" fill="#8c98a6" fontSize="12">30</text>
  </svg></div></div>
}

export default function HomeAnalyst(){
  const [coin,setCoin]=useState('BTC'),[interval,setInterval]=useState('1h'),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/analyze?symbol=${coin}&interval=${interval}`);const j=await r.json();if(!r.ok)throw new Error(j.error||'Market data xatosi');setData(j)}catch(e:any){setError(e.message||'Xato')}finally{setLoading(false)}}
  useEffect(()=>{load()},[coin,interval])
  const r=data?.result
  const risk=((r?.tp?.[0]||0)-(r?.entryHigh||0)), downside=((r?.entryLow||0)-(r?.invalidation||0))
  const rr=downside>0?(risk/downside):0
  return <section className="homeAnalyst"><div className="homeAnalystHead"><div><div className="homeKicker">🤖 AI CRYPTO ANALYST</div><h2>Professional TradingView tahlili</h2><p>Jonli market data asosida avtomatik Entry · TP1 · TP2 · TP3 · SL va texnik xulosa.</p></div><div className="homeControls"><select value={coin} onChange={e=>setCoin(e.target.value)}>{coins.map(c=><option key={c}>{c}</option>)}</select><select value={interval} onChange={e=>setInterval(e.target.value)}>{intervals.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button onClick={load}>↻ Yangilash</button></div></div>{loading?<div className="homeLoading">Grafik va tahlil yuklanmoqda...</div>:error?<div className="homeLoading error">{error}</div>:r&&<><div className="homeChartPanel"><CleanChart candles={data.candles} result={r} coin={coin} interval={interval}/></div><div className="homeAnalysis"><div className="homeAnalysisCard"><h3>📊 TEXNIK TAHLIL</h3><p>{r.summary}</p><div className="miniGrid"><span>Trend<strong>{r.trend}</strong></span><span>RSI<strong>{r.rsi.toFixed(2)}</strong></span><span>EMA 10<strong>{money(r.ema10)}</strong></span><span>EMA 20<strong>{money(r.ema20)}</strong></span><span>EMA 50<strong>{money(r.ema50)}</strong></span><span>Risk/Reward<strong>1:{rr.toFixed(2)}</strong></span></div></div><div className="homeAnalysisCard"><h3 className="bullText">🟢 BULLISH SSENARIY</h3><p>{r.bullish}</p><h3 className="bearText">🔴 BEARISH SSENARIY</h3><p>{r.bearish}</p></div><div className="homeTradeCard"><div><b>KIRISH</b><strong>{money(r.entryLow)} – {money(r.entryHigh)}</strong></div><div><b>STOP LOSS</b><strong className="redText">{money(r.invalidation)}</strong></div><div><b>TP1</b><strong>{money(r.tp[0])}</strong></div><div><b>TP2</b><strong>{money(r.tp[1])}</strong></div><div><b>TP3</b><strong>{money(r.tp[2])}</strong></div></div></div><p className="homeDisclaimer">⚠️ Bu avtomatik texnik tahlil axborot maqsadida. Kafolatlangan narx prognozi yoki investitsiya maslahati emas.</p></>}</section>
}
