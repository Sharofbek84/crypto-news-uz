'use client'

import { useEffect, useState } from 'react'

type Candle={time:number;open:number;high:number;low:number;close:number;volume:number}
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

const coins=['BTC','ETH','LTC','SOL','BNB','NEAR','GRAM','SUI','APT','ATOM']
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
  const W=1400,H=800,left=65,right=125,gap=105,top=48,mainBottom=505,rsiTop=555,rsiBottom=715
  const plotRight=W-right-gap
  const plotWidth=plotRight-left
  const highs=candles.map(c=>c.high), lows=candles.map(c=>c.low)
  const tradeLevels=[result.entryLow,result.entryHigh,result.invalidation,...result.tp.slice(0,3)].filter(Number.isFinite)
  const rawMin=Math.min(...lows,...tradeLevels),rawMax=Math.max(...highs,...tradeLevels),pad=(rawMax-rawMin)*.09
  const min=rawMin-pad, max=rawMax+pad
  const x=(i:number)=>left+i*plotWidth/Math.max(1,candles.length-1)
  const y=(v:number)=>mainBottom-((v-min)/(max-min))*(mainBottom-top)
  const ry=(v:number)=>rsiBottom-((Math.max(0,Math.min(100,v))/100)*(rsiBottom-rsiTop))
  const ema=(period:number)=>{let a=candles[0]?.close||0,k=2/(period+1);return candles.map((c,i)=>{if(i)a=c.close*k+a*(1-k);return a})}
  const e10=ema(10),e20=ema(20),e50=ema(50),rs=rsiSeries(candles)
  const poly=(arr:number[])=>arr.map((v,i)=>`${x(i)},${y(v)}`).join(' ')
  const last=candles[candles.length-1]?.close||0
  const lx=x(candles.length-1)
  const cw=Math.max(2,Math.min(10,plotWidth/candles.length*.65))
  const level=(price:number,label:string,color:string,bg:string,dash='6 5')=>(
    <g key={label}>
      <line x1={left} x2={plotRight} y1={y(price)} y2={y(price)} stroke={color} strokeWidth={1.5} strokeDasharray={dash}/>
      <rect x={plotRight+8} y={y(price)-12} width={right-16} height={24} rx={4} fill={bg}/>
      <text x={plotRight+(right/2)} y={y(price)+5} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>{label} {money(price)}</text>
    </g>
  )
  return <div className="chartWrap"><svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img">
    <rect width={W} height={H} fill="#0b1220"/>
    <rect x={0} y={rsiTop-20} width={W} height={rsiBottom-rsiTop+40} fill="#111827"/>
    {[0,.25,.5,.75,1].map(v=><line key={v} x1={left} x2={plotRight} y1={top+v*(mainBottom-top)} y2={top+v*(mainBottom-top)} stroke="#1f2937"/>)}
    <text x={left} y={28} fill="#e5e7eb" fontSize={16} fontWeight={700}>{coin}/USDT · {interval}</text>
    {candles.map((c,i)=>{const up=c.close>=c.open;return <g key={c.time}>
      <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={up?'#22c55e':'#ef4444'} strokeWidth={1}/>
      <rect x={x(i)-cw/2} y={Math.min(y(c.open),y(c.close))} width={cw} height={Math.max(1,Math.abs(y(c.open)-y(c.close)))} fill={up?'#22c55e':'#ef4444'}/>
    </g>})}
    <polyline points={poly(e10)} fill="none" stroke="#f59e0b" strokeWidth={1.6}/>
    <polyline points={poly(e20)} fill="none" stroke="#06b6d4" strokeWidth={1.6}/>
    <polyline points={poly(e50)} fill="none" stroke="#3b82f6" strokeWidth={1.6}/>
    {level(result.entryHigh,'ENTRY','#22c55e','#166534')}
    {result.entryHigh!==result.entryLow && level(result.entryLow,'ENTRY','#22c55e','#166534')}
    {result.tp[0] && level(result.tp[0],'TP1','#16a34a','#14532d')}
    {result.tp[1] && level(result.tp[1],'TP2','#16a34a','#14532d')}
    {result.tp[2] && level(result.tp[2],'TP3','#16a34a','#14532d')}
    {level(result.invalidation,'SL','#ef4444','#7f1d1d')}
    <line x1={lx} x2={plotRight} y1={y(last)} y2={y(last)} stroke="#38bdf8" strokeDasharray="3 4"/>
    <text x={left} y={rsiTop-4} fill="#e5e7eb" fontSize={13} fontWeight={700}>RSI 14 · {result.rsi.toFixed(2)}</text>
    <polyline points={rs.map((v,i)=>`${x(i)},${ry(v)}`).join(' ')} fill="none" stroke="#a78bfa" strokeWidth={1.8}/>
  </svg></div>
}

export default function AnalystClient(){
  const [coin,setCoin]=useState('BTC'),[interval,setInterval]=useState('1h'),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/analyze?symbol=${coin}&interval=${interval}`);const j=await r.json();if(!r.ok)throw new Error(j.error||'Xato');setData(j)}catch(e:any){setError(e.message||'Xato')}finally{setLoading(false)}}
  useEffect(()=>{load()},[coin,interval])
  const r=data?.result
  return <div className="analystPage">
    <div className="analystHeader">
      <div><div className="brand">GOLDENWEB<b>.UZ</b></div><h1>AI Analyst</h1><p>Texnik tahlil · Entry · TP · SL</p></div>
      <div className="controls">
        <select value={coin} onChange={e=>setCoin(e.target.value)}>{coins.map(c=><option key={c}>{c}</option>)}</select>
        <select value={interval} onChange={e=>setInterval(e.target.value)}>{intervals.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <button onClick={load}>Yangilash</button>
      </div>
    </div>
    {loading?<div className="panel">Yuklanmoqda...</div>:error?<div className="panel error">{error}</div>:r&&<>
      <div className="panel chartPanel"><Chart candles={data.candles} result={r} coin={coin} interval={interval}/></div>
      <div className="metrics">
        <div><small>Trend</small><strong>{r.trend}</strong></div>
        <div><small>RSI</small><strong>{r.rsi.toFixed(2)}</strong></div>
        <div><small>EMA10</small><strong>{money(r.ema10)}</strong></div>
        <div><small>EMA20</small><strong>{money(r.ema20)}</strong></div>
        <div><small>EMA50</small><strong>{money(r.ema50)}</strong></div>
      </div>
      <div className="analysisGrid">
        <div className="panel"><h2>Xulosa</h2><p>{r.summary}</p></div>
        <div className="panel"><h2>Ssenariylar</h2><div className="scenario bull">{r.bullish}</div><div className="scenario bear">{r.bearish}</div></div>
      </div>
    </>}
  </div>
}
