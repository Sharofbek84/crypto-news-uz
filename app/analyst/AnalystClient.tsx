'use client'

import { useEffect, useState } from 'react'

type Candle={time:number;open:number;high:number;low:number;close:number;volume:number}
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

const coins=['BTC','ETH','SOL','SUI','APT','XRP','BNB','CORE','MYX','ALEO']
const intervals=[['1h','H1'],['4h','H4'],['1d','D1']]

function money(n:number){if(n>=1000)return '$'+n.toLocaleString('en-US',{maximumFractionDigits:0});if(n>=1)return '$'+n.toFixed(2);return '$'+n.toFixed(5)}
function rsiSeries(candles:Candle[],period=14){
  const out:number[]=[]; let gain=0,loss=0
  for(let i=0;i<candles.length;i++){
    if(i===0){out.push(50);continue}
    const d=candles[i].close-candles[i-1].close
    const g=Math.max(d,0), l=Math.max(-d,0)
    if(i<=period){gain+=g;loss+=l;out.push(i===period?(loss===0?100:100-100/(1+gain/loss)):50)}
    else {gain=(gain*(period-1)+g)/period;loss=(loss*(period-1)+l)/period;out.push(loss===0?100:100-100/(1+gain/loss))}
  }
  return out
}

function Chart({candles,result,coin,interval}:{candles:Candle[];result:Result;coin:string;interval:string}){
  const W=1400,H=800,left=65,right=125,gap=40,top=48,mainBottom=505,rsiTop=555,rsiBottom=715
  const plotRight=W-right-gap
  const plotWidth=plotRight-left
  const highs=candles.map(c=>c.high), lows=candles.map(c=>c.low)
  const tradeLevels=[result.entryLow,result.entryHigh,result.invalidation,...result.tp.slice(0,3)].filter(Number.isFinite)
  const rawMin=Math.min(...lows,...tradeLevels),rawMax=Math.max(...highs,...tradeLevels),pad=(rawMax-rawMin)*.09
  const min=rawMin-pad,max=rawMax+pad
  const x=(i:number)=>left+i*(plotWidth/(Math.max(1,candles.length-1)))
  const y=(v:number)=>mainBottom-(v-min)/(max-min)*(mainBottom-top)
  const ry=(v:number)=>rsiBottom-(Math.max(0,Math.min(100,v))/100)*(rsiBottom-rsiTop)
  const ema=(period:number)=>{let a=candles[0]?.close||0,k=2/(period+1);return candles.map((c,i)=>{if(i>0)a=c.close*k+a*(1-k);return `${x(i)},${y(a)}`}).join(' ')}
  const rsis=rsiSeries(candles)
  const rsiPoints=rsis.map((v,i)=>`${x(i)},${ry(v)}`).join(' ')
  const latest=candles[candles.length-1]?.close||0
  const latestX=x(candles.length-1)
  const candleW=Math.max(3,Math.min(12,plotWidth/candles.length*.72))
  const fmtTime=(t:number)=>new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})
  const xFuture=Math.min(plotRight,latestX+155)
  const bullishY=y(result.tp[0]||latest*1.02), bearishY=y(result.invalidation)
  const labelX=W-right+6
  const labelCenter=labelX+44
  const level=(value:number,label:string,stroke:string,fill:string,dash='8 7')=><g><line x1={left} x2={plotRight} y1={y(value)} y2={y(value)} stroke={stroke} strokeDasharray={dash} strokeWidth="1.8"/><rect x={labelX} y={y(value)-14} width="88" height="28" rx="5" fill={fill}/><text x={labelCenter} y={y(value)+5} textAnchor="middle" fill="white" fontSize="13" fontWeight="800">{label}</text><text x={W-8} y={y(value)+5} textAnchor="end" fill={stroke} fontSize="12" fontWeight="700">{money(value)}</text></g>
  return <div className="chartWrap">
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`${coin} ${interval} texnik tahlil grafigi`}>
      <rect width={W} height={H} fill="#080d15"/>
      <rect x="0" y="0" width={W} height={mainBottom+18} fill="#0b111b"/>
      <rect x="0" y={rsiTop-18} width={W} height={rsiBottom-rsiTop+45} fill="#111326"/>
      {[0,.25,.5,.75,1].map(t=><line key={t} x1={left} x2={plotRight} y1={top+t*(mainBottom-top)} y2={top+t*(mainBottom-top)} stroke="#1d2734" strokeWidth="1"/>)}
      {[30,50,70].map(v=><line key={v} x1={left} x2={plotRight} y1={ry(v)} y2={ry(v)} stroke="#4b5563" strokeDasharray="5 6" strokeWidth="1"/>)}
      <text x={left} y="27" fill="#e6edf3" fontSize="18" fontWeight="800">{coin}/USDT ({coin==='BTC'?'Bitcoin':coin}), {interval==='4h'?'4 soatlik (H4)':interval==='1d'?'1 kunlik (D1)':'1 soatlik (H1)'} grafik</text>
      <text x={left} y="48" fill="#9aa7b5" fontSize="13">EMA 10 / 20 / 50 • RSI (14) • Entry / TP / SL</text>
      {candles.map((c,i)=>{const up=c.close>=c.open;return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={up?'#37d66f':'#ff4d5a'} strokeWidth="1.2"/><rect x={x(i)-candleW/2} y={Math.min(y(c.open),y(c.close))} width={candleW} height={Math.max(1.5,Math.abs(y(c.open)-y(c.close)))} rx=".8" fill={up?'#37d66f':'#ff4d5a'}/></g>})}
      <polyline points={ema(10)} fill="none" stroke="#ff9f0a" strokeWidth="2.2"/><polyline points={ema(20)} fill="none" stroke="#00bcd4" strokeWidth="2.2"/><polyline points={ema(50)} fill="none" stroke="#49b6ff" strokeWidth="2.2"/>
      <line x1={latestX} x2={plotRight} y1={y(latest)} y2={y(latest)} stroke="#55d6ff" strokeDasharray="3 5"/>
      <rect x={labelX} y={y(latest)-15} width="88" height="30" rx="5" fill="#20a85a"/><text x={labelCenter} y={y(latest)+5} textAnchor="middle" fill="white" fontSize="14" fontWeight="800">{money(latest)}</text>
      {level(result.entryLow,'ENTRY','#ffd43b','#7a5b00','6 5')}
      {result.entryHigh!==result.entryLow && <level(result.entryHigh,'ENTRY','#ffd43b','#7a5b00','6 5')}
      {result.tp.slice(0,3).map((v,i)=>level(v,`TP${i+1}`,'#23d18b','#116b4b','8 7'))}
      {level(result.invalidation,'SL','#ff4d5a','#8f202a','8 7')}
      <text x={left} y={rsiTop+4} fill="#e6edf3" fontSize="16" fontWeight="800">RSI (14) = {result.rsi.toFixed(2)}</text>
      <text x={plotRight-5} y={ry(70)-6} textAnchor="end" fill="#8f9baa" fontSize="12">70</text><text x={plotRight-5} y={ry(50)-6} textAnchor="end" fill="#8f9baa" fontSize="12">50</text><text x={plotRight-5} y={ry(30)-6} textAnchor="end" fill="#8f9baa" fontSize="12">30</text>
      <polyline points={rsiPoints} fill="none" stroke="#a78bfa" strokeWidth="2.2"/>
      {candles.filter((_,i)=>i%Math.max(1,Math.floor(candles.length/7))===0).map((c,i)=><text key={i} x={x(candles.indexOf(c))} y={rsiBottom+27} textAnchor="middle" fill="#7f8b99" fontSize="12">{fmtTime(c.time)}</text>)}
      <path d={`M${latestX},${y(latest)-4} C${latestX+45},${y(latest)-45} ${xFuture-40},${bullishY+40} ${xFuture},${bullishY}`} fill="none" stroke="#23d18b" strokeWidth="2" strokeDasharray="8 6"/>
      <path d={`M${latestX},${y(latest)+7} C${latestX+45},${y(latest)+45} ${xFuture-35},${bearishY-30} ${xFuture},${bearishY}`} fill="none" stroke="#ff4d5a" strokeWidth="2" strokeDasharray="8 6"/>
    </svg>
    <div className="legend"><span><i className="orange"/>EMA10</span><span><i className="cyan"/>EMA20</span><span><i className="blue"/>EMA50</span><span>🟡 Entry</span><span>🟢 TP</span><span>🔴 SL</span></div>
  </div>
}

export default function AnalystClient(){
  const [coin,setCoin]=useState('BTC'),[interval,setInterval]=useState('1h'),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/analyze?symbol=${coin}&interval=${interval}`);const j=await r.json();if(!r.ok)throw new Error(j.error||'Xato');setData(j)}catch(e:any){setError(e.message||'Xato')}finally{setLoading(false)}}
  useEffect(()=>{load()},[coin,interval])
  const r=data?.result
  return <main className="analystPage"><div className="analystHeader"><div><div className="brand">Crypto Tahlil <b>UZ</b></div><h1>{coin}/USDT texnik tahlili</h1><p>Avtomatik H1/H4/D1 tahlil • EMA • RSI • MACD • Entry/TP/SL</p></div><div className="controls"><select value={coin} onChange={e=>setCoin(e.target.value)}>{coins.map(c=><option key={c}>{c}</option>)}</select><select value={interval} onChange={e=>setInterval(e.target.value)}>{intervals.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><button onClick={load}>Yangilash</button></div></div>
    {loading?<div className="panel">Tahlil yuklanmoqda...</div>:error?<div className="panel error">{error}</div>:r&&<><div className="panel chartPanel"><Chart candles={data.candles} result={r} coin={coin} interval={interval}/></div><div className="metrics"><div><small>Trend</small><strong className={r.trend.toUpperCase().includes('BULL')?'good':r.trend.toUpperCase().includes('BEAR')?'bad':''}>{r.trend}</strong></div><div><small>RSI</small><strong>{r.rsi.toFixed(1)}</strong></div><div><small>Entry</small><strong>{money(r.entryLow)}–{money(r.entryHigh)}</strong></div><div><small>Invalidation</small><strong>{money(r.invalidation)}</strong></div><div><small>TP1 / TP2 / TP3</small><strong>{r.tp.map((v:number)=>money(v)).join(' / ')}</strong></div></div><div className="analysisGrid"><section className="panel"><h2>📌 Texnik ko‘rsatmalar</h2><p>{r.summary}</p><ul><li>EMA10: <b>{money(r.ema10)}</b></li><li>EMA20: <b>{money(r.ema20)}</b></li><li>EMA50: <b>{money(r.ema50)}</b></li><li>MACD histogram: <b>{r.histogram.toFixed(6)}</b></li><li>Support: <b>{r.support.map((v:number)=>money(v)).join(', ')}</b></li><li>Resistance: <b>{r.resistance.map((v:number)=>money(v)).join(', ')}</b></li></ul></section><section className="panel"><h2>🔮 Ssenariylar</h2><div className="scenario bull"><b>🟢 Bullish</b><p>{r.bullish}</p></div><div className="scenario bear"><b>🔴 Bearish</b><p>{r.bearish}</p></div><p className="note">⚠️ Bu avtomatik texnik tahlil. U kafolatlangan narx prognozi yoki moliyaviy maslahat emas.</p></section></div></>}
  </main>
}
