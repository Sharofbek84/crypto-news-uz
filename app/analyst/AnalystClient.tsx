'use client'

import { useEffect, useMemo, useState } from 'react'

type Candle={time:number;open:number;high:number;low:number;close:number;volume:number}
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

const coins=['BTC','ETH','SOL','SUI','APT','XRP','BNB','CORE','MYX','ALEO']
const intervals=[['4h','H4'],['1d','D1'],['1h','H1']]

function money(n:number){if(n>=1000)return '$'+n.toLocaleString('en-US',{maximumFractionDigits:0});if(n>=1)return '$'+n.toFixed(2);return '$'+n.toFixed(5)}

function Chart({candles,result}:{candles:Candle[];result:Result}){
  const w=1000,h=440,pad=35, min=Math.min(...candles.map(c=>c.low),...result.support)-((Math.max(...candles.map(c=>c.high))-Math.min(...candles.map(c=>c.low)))*.04), max=Math.max(...candles.map(c=>c.high),...result.resistance)+((Math.max(...candles.map(c=>c.high))-Math.min(...candles.map(c=>c.low)))*.04)
  const x=(i:number)=>pad+i*((w-pad*2)/(candles.length-1)); const y=(v:number)=>h-pad-(v-min)/(max-min)*(h-pad*2)
  const line=(key:'ema10'|'ema20'|'ema50')=>candles.map((_,i)=>{const slice=candles.slice(0,i+1).map(c=>c.close);let a=slice[0],k=2/((key==='ema10'?10:key==='ema20'?20:50)+1);for(let j=1;j<slice.length;j++)a=slice[j]*k+a*(1-k);return `${x(i)},${y(a)}`}).join(' ')
  const latest=candles.at(-1)?.close||0
  return <div className="chartWrap"><svg viewBox={`0 0 ${w} ${h}`} className="chart"><rect width={w} height={h} fill="#0d1117"/>
    {[0,.25,.5,.75,1].map(t=><line key={t} x1={pad} x2={w-pad} y1={pad+t*(h-pad*2)} y2={pad+t*(h-pad*2)} stroke="#202938"/>) }
    {candles.map((c,i)=>{const up=c.close>=c.open;const bw=Math.max(2,(w-pad*2)/candles.length*.7);return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={up?'#35c759':'#ff4d5a'} /><rect x={x(i)-bw/2} y={Math.min(y(c.open),y(c.close))} width={bw} height={Math.max(1,Math.abs(y(c.open)-y(c.close)))} fill={up?'#35c759':'#ff4d5a'}/></g>})}
    <polyline points={line('ema10')} fill="none" stroke="#ff9f0a" strokeWidth="2"/><polyline points={line('ema20')} fill="none" stroke="#22b8cf" strokeWidth="2"/><polyline points={line('ema50')} fill="none" stroke="#5ac8fa" strokeWidth="2"/>
    {result.support.slice(0,2).map((v,i)=><g key={'s'+i}><line x1={pad} x2={w-pad} y1={y(v)} y2={y(v)} stroke="#3ddc84" strokeDasharray="7 6"/><text x={w-pad-5} y={y(v)-6} textAnchor="end" fill="#3ddc84" fontSize="14">S {money(v)}</text></g>)}
    {result.resistance.slice(0,2).map((v,i)=><g key={'r'+i}><line x1={pad} x2={w-pad} y1={y(v)} y2={y(v)} stroke="#ff6b6b" strokeDasharray="7 6"/><text x={w-pad-5} y={y(v)-6} textAnchor="end" fill="#ff6b6b" fontSize="14">R {money(v)}</text></g>)}
    <line x1={x(candles.length-1)} x2={w-pad} y1={y(latest)} y2={y(latest)} stroke="#8be9fd" strokeDasharray="3 4"/><text x={pad} y={24} fill="#e6edf3" fontSize="16">{result.trend} • RSI {result.rsi.toFixed(1)} • EMA 10/20/50</text>
  </svg><div className="legend"><span><i className="orange"/>EMA10</span><span><i className="cyan"/>EMA20</span><span><i className="blue"/>EMA50</span><span>🟢 Support</span><span>🔴 Resistance</span></div></div>
}

export default function AnalystClient(){
  const [coin,setCoin]=useState('BTC'),[interval,setInterval]=useState('4h'),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/analyze?symbol=${coin}&interval=${interval}`);const j=await r.json();if(!r.ok)throw new Error(j.error||'Xato');setData(j)}catch(e:any){setError(e.message||'Xato')}finally{setLoading(false)}}
  useEffect(()=>{load()},[coin,interval])
  const r=data?.result
  return <main className="analystPage"><div className="analystHeader"><div><div className="brand">Crypto AI Analyst <b>UZ</b></div><h1>{coin}/USDT texnik tahlili</h1><p>Avtomatik H4/D1 tahlil • EMA • RSI • MACD • Support/Resistance</p></div><div className="controls"><select value={coin} onChange={e=>setCoin(e.target.value)}>{coins.map(c=><option key={c}>{c}</option>)}</select><select value={interval} onChange={e=>setInterval(e.target.value)}>{intervals.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><button onClick={load}>Yangilash</button></div></div>
    {loading?<div className="panel">Tahlil yuklanmoqda...</div>:error?<div className="panel error">{error}</div>:r&&<><div className="panel"><Chart candles={data.candles} result={r}/></div><div className="metrics"><div><small>Trend</small><strong className={r.trend==='BULLISH'?'good':r.trend==='BEARISH'?'bad':''}>{r.trend}</strong></div><div><small>RSI</small><strong>{r.rsi.toFixed(1)}</strong></div><div><small>Entry</small><strong>{money(r.entryLow)}–{money(r.entryHigh)}</strong></div><div><small>Invalidation</small><strong>{money(r.invalidation)}</strong></div><div><small>TP1 / TP2 / TP3</small><strong>{r.tp.map((v:number)=>money(v)).join(' / ')}</strong></div></div><div className="analysisGrid"><section className="panel"><h2>📌 Texnik ko‘rsatmalar</h2><p>{r.summary}</p><ul><li>EMA10: <b>{money(r.ema10)}</b></li><li>EMA20: <b>{money(r.ema20)}</b></li><li>EMA50: <b>{money(r.ema50)}</b></li><li>MACD histogram: <b>{r.histogram.toFixed(6)}</b></li><li>Support: <b>{r.support.map((v:number)=>money(v)).join(', ')}</b></li><li>Resistance: <b>{r.resistance.map((v:number)=>money(v)).join(', ')}</b></li></ul></section><section className="panel"><h2>🔮 Ssenariylar</h2><div className="scenario bull"><b>🟢 Bullish</b><p>{r.bullish}</p></div><div className="scenario bear"><b>🔴 Bearish</b><p>{r.bearish}</p></div><p className="note">⚠️ Bu avtomatik texnik tahlil. U kafolatlangan narx prognozi yoki moliyaviy maslahat emas.</p></section></div></>}
  </main>
}
