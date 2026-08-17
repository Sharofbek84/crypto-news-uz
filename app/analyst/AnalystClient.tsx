'use client'

import { useEffect, useMemo, useState } from 'react'

type Candle={time:number;open:number;high:number;low:number;close:number;volume:number}
type Result={ema10:number;ema20:number;ema50:number;rsi:number;macd:number;signal:number;histogram:number;trend:string;support:number[];resistance:number[];entryLow:number;entryHigh:number;invalidation:number;tp:number[];bullish:string;bearish:string;summary:string}

const coins=['BTC','ETH','SOL','SUI','APT','XRP','BNB','CORE','MYX','ALEO']
const intervals=[['4h','H4'],['1d','D1'],['1h','H1']]

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
  const W=1400,H=800,left=65,right=125,top=48,mainBottom=505,rsiTop=555,rsiBottom=715
  const highs=candles.map(c=>c.high), lows=candles.map(c=>c.low)
  const rawMin=Math.min(...lows,...result.support),rawMax=Math.max(...highs,...result.resistance),pad=(rawMax-rawMin)*.09
  const min=rawMin-pad,max=rawMax+pad
  const x=(i:number)=>left+i*((W-left-right)/(Math.max(1,candles.length-1)))
  const y=(v:number)=>mainBottom-(v-min)/(max-min)*(mainBottom-top)
  const ry=(v:number)=>rsiBottom-(Math.max(0,Math.min(100,v))/100)*(rsiBottom-rsiTop)
  const ema=(period:number)=>{let a=candles[0]?.close||0,k=2/(period+1);return candles.map((c,i)=>{if(i>0)a=c.close*k+a*(1-k);return `${x(i)},${y(a)}`}).join(' ')}
  const rsis=rsiSeries(candles)
  const rsiPoints=rsis.map((v,i)=>`${x(i)},${ry(v)}`).join(' ')
  const latest=candles[candles.length-1]?.close||0
  const latestX=x(candles.length-1)
  const trend=result.trend.toUpperCase().includes('BULL')?'NEUTRAL → BULLISH MOMENTUM':result.trend.toUpperCase().includes('BEAR')?'BEARISH MOMENTUM':'NEUTRAL'
  const candleW=Math.max(3,Math.min(12,(W-left-right)/candles.length*.72))
  const fmtTime=(t:number)=>new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})
  const xFuture=Math.min(W-right,latestX+155)
  const bullishY=y(result.tp[0]||latest*1.02), bearishY=y(result.invalidation)
  const callout=(x0:number,y0:number,w:number,h:number,title:string,lines:string[],stroke:string,fill='#0d1520')=><g><rect x={x0} y={y0} width={w} height={h} rx="8" fill={fill} stroke={stroke} strokeWidth="1.5"/><text x={x0+14} y={y0+25} fill={stroke} fontSize="16" fontWeight="800">{title}</text>{lines.map((s,i)=><text key={i} x={x0+14} y={y0+49+i*21} fill="#d6dee8" fontSize="14">{s}</text>)}</g>
  return <div className="chartWrap">
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`${coin} ${interval} texnik tahlil grafigi`}>
      <defs>
        <marker id="bullArrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#23d18b"/></marker>
        <marker id="bearArrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#ff4d5a"/></marker>
      </defs>
      <rect width={W} height={H} fill="#080d15"/>
      <rect x="0" y="0" width={W} height={mainBottom+18} fill="#0b111b"/>
      <rect x="0" y={rsiTop-18} width={W} height={rsiBottom-rsiTop+45} fill="#111326"/>
      {[0,.25,.5,.75,1].map(t=><line key={t} x1={left} x2={W-right} y1={top+t*(mainBottom-top)} y2={top+t*(mainBottom-top)} stroke="#1d2734" strokeWidth="1"/>)}
      {[30,50,70].map(v=><line key={v} x1={left} x2={W-right} y1={ry(v)} y2={ry(v)} stroke="#4b5563" strokeDasharray="5 6" strokeWidth="1"/>)}
      <text x={left} y="27" fill="#e6edf3" fontSize="18" fontWeight="800">{coin}/USDT ({coin==='BTC'?'Bitcoin':coin}), {interval==='4h'?'4 soatlik (H4)':interval==='1d'?'1 kunlik (D1)':'1 soatlik (H1)'} grafik</text>
      <text x={left} y="48" fill="#9aa7b5" fontSize="13">EMA 10 / 20 / 50 • RSI (14) • Support / Resistance • Ssenariylar</text>
      {candles.map((c,i)=>{const up=c.close>=c.open;return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={up?'#37d66f':'#ff4d5a'} strokeWidth="1.2"/><rect x={x(i)-candleW/2} y={Math.min(y(c.open),y(c.close))} width={candleW} height={Math.max(1.5,Math.abs(y(c.open)-y(c.close)))} rx=".8" fill={up?'#37d66f':'#ff4d5a'}/></g>})}
      <polyline points={ema(10)} fill="none" stroke="#ff9f0a" strokeWidth="2.2"/><polyline points={ema(20)} fill="none" stroke="#00bcd4" strokeWidth="2.2"/><polyline points={ema(50)} fill="none" stroke="#49b6ff" strokeWidth="2.2"/>
      {result.support.slice(0,2).map((v,i)=><g key={'s'+i}><line x1={left} x2={W-right} y1={y(v)} y2={y(v)} stroke="#2f8cff" strokeDasharray="8 7" strokeWidth="1.5"/><rect x={W-right+6} y={y(v)-13} width="88" height="26" rx="4" fill="#103d8a"/><text x={W-right+50} y={y(v)+5} textAnchor="middle" fill="#dcecff" fontSize="13" fontWeight="700">{money(v)}</text></g>)}
      {result.resistance.slice(0,3).map((v,i)=><g key={'r'+i}><line x1={left} x2={W-right} y1={y(v)} y2={y(v)} stroke="#ff4d5a" strokeDasharray="8 7" strokeWidth="1.5"/><rect x={W-right+6} y={y(v)-13} width="88" height="26" rx="4" fill="#8f202a"/><text x={W-right+50} y={y(v)+5} textAnchor="middle" fill="#ffe3e5" fontSize="13" fontWeight="700">{money(v)}</text></g>)}
      <line x1={latestX} x2={W-right} y1={y(latest)} y2={y(latest)} stroke="#55d6ff" strokeDasharray="3 5"/><rect x={W-right+6} y={y(latest)-15} width="88" height="30" rx="5" fill="#20a85a"/><text x={W-right+50} y={y(latest)+5} textAnchor="middle" fill="white" fontSize="14" fontWeight="800">{money(latest)}</text>
      <text x={left} y={rsiTop+4} fill="#e6edf3" fontSize="16" fontWeight="800">RSI (14) = {result.rsi.toFixed(2)}</text><text x={W-right-5} y={ry(70)-6} textAnchor="end" fill="#8f9baa" fontSize="12">70</text><text x={W-right-5} y={ry(50)-6} textAnchor="end" fill="#8f9baa" fontSize="12">50</text><text x={W-right-5} y={ry(30)-6} textAnchor="end" fill="#8f9baa" fontSize="12">30</text>
      <polyline points={rsiPoints} fill="none" stroke="#a78bfa" strokeWidth="2.2"/>
      {candles.filter((_,i)=>i%Math.max(1,Math.floor(candles.length/7))===0).map((c,i)=><text key={i} x={x(candles.indexOf(c))} y={rsiBottom+27} textAnchor="middle" fill="#7f8b99" fontSize="12">{fmtTime(c.time)}</text>)}
      {callout(90,70,330,125,'TREND: '+trend,[`• Narx: ${money(latest)}`,`• RSI: ${result.rsi.toFixed(2)} — momentum`, `• EMA 10/20/50: trend filtri`, `• Support zona: ${money(result.entryLow)}–${money(result.entryHigh)}`],'#58a6ff')}
      {callout(W-500,70,390,118,'BULLISH SSENARIY',[`Agar ${money(result.tp[0]||result.resistance[0])} ustida H4 close bo‘lsa,`,`keyingi resistance'lar: ${result.tp.slice(1).map(money).join(' / ')}`,`Momentum saqlansa, yuqoriga davom ehtimoli oshadi.`],'#23d18b')}
      {callout(W-520,mainBottom-145,410,126,'KIRISH ZONASI (BUY)',[`Entry: ${money(result.entryLow)} – ${money(result.entryHigh)}`,`Stop-loss: ${money(result.invalidation)}`,`TP: ${result.tp.slice(0,3).map(money).join(' / ')}`],'#ffd43b','#111720')}
      {callout(105,rsiTop+35,330,105,'RSI MOMENTUM',[`Hozirgi RSI: ${result.rsi.toFixed(2)}`,result.rsi>=50?'• 50 dan yuqori — bullish momentum':'• 50 dan past — bearish momentum',result.rsi<=35?'• Oversold zonasiga yaqin':'• Haddan tashqari overbought emas'],'#a78bfa','#111326')}
      <text x={W-right-280} y={y(result.tp[0]||latest)-22} fill="#23d18b" fontSize="14" fontWeight="800">TP1</text>
      <path d={`M${latestX},${y(latest)-4} C${latestX+45},${y(latest)-45} ${xFuture-40},${bullishY+40} ${xFuture},${bullishY}`} fill="none" stroke="#23d18b" strokeWidth="2" strokeDasharray="8 6" markerEnd="url(#bullArrow)"/>
      <path d={`M${latestX},${y(latest)+7} C${latestX+45},${y(latest)+45} ${xFuture-35},${bearishY-30} ${xFuture},${bearishY}`} fill="none" stroke="#ff4d5a" strokeWidth="2" strokeDasharray="8 6" markerEnd="url(#bearArrow)"/>
      <rect x={left} y={H-55} width={W-right-left} height="38" rx="7" fill="#0d1520" stroke="#263445"/><text x={left+15} y={H-30} fill="#ffd43b" fontSize="14" fontWeight="800">XULOSA:</text><text x={left+92} y={H-30} fill="#d6dee8" fontSize="13">{result.summary.slice(0,155)}{result.summary.length>155?'…':''}</text>
    </svg>
    <div className="legend"><span><i className="orange"/>EMA10</span><span><i className="cyan"/>EMA20</span><span><i className="blue"/>EMA50</span><span>🔵 Support</span><span>🔴 Resistance</span><span>🟢 Bullish</span><span>🔻 Bearish</span></div>
  </div>
}

export default function AnalystClient(){
  const [coin,setCoin]=useState('BTC'),[interval,setInterval]=useState('4h'),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');try{const r=await fetch(`/api/analyze?symbol=${coin}&interval=${interval}`);const j=await r.json();if(!r.ok)throw new Error(j.error||'Xato');setData(j)}catch(e:any){setError(e.message||'Xato')}finally{setLoading(false)}}
  useEffect(()=>{load()},[coin,interval])
  const r=data?.result
  return <main className="analystPage"><div className="analystHeader"><div><div className="brand">Crypto Tahlil <b>UZ</b></div><h1>{coin}/USDT texnik tahlili</h1><p>Avtomatik H4/D1 tahlil • EMA • RSI • MACD • Support/Resistance</p></div><div className="controls"><select value={coin} onChange={e=>setCoin(e.target.value)}>{coins.map(c=><option key={c}>{c}</option>)}</select><select value={interval} onChange={e=>setInterval(e.target.value)}>{intervals.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><button onClick={load}>Yangilash</button></div></div>
    {loading?<div className="panel">Tahlil yuklanmoqda...</div>:error?<div className="panel error">{error}</div>:r&&<><div className="panel chartPanel"><Chart candles={data.candles} result={r} coin={coin} interval={interval}/></div><div className="metrics"><div><small>Trend</small><strong className={r.trend.toUpperCase().includes('BULL')?'good':r.trend.toUpperCase().includes('BEAR')?'bad':''}>{r.trend}</strong></div><div><small>RSI</small><strong>{r.rsi.toFixed(1)}</strong></div><div><small>Entry</small><strong>{money(r.entryLow)}–{money(r.entryHigh)}</strong></div><div><small>Invalidation</small><strong>{money(r.invalidation)}</strong></div><div><small>TP1 / TP2 / TP3</small><strong>{r.tp.map((v:number)=>money(v)).join(' / ')}</strong></div></div><div className="analysisGrid"><section className="panel"><h2>📌 Texnik ko‘rsatmalar</h2><p>{r.summary}</p><ul><li>EMA10: <b>{money(r.ema10)}</b></li><li>EMA20: <b>{money(r.ema20)}</b></li><li>EMA50: <b>{money(r.ema50)}</b></li><li>MACD histogram: <b>{r.histogram.toFixed(6)}</b></li><li>Support: <b>{r.support.map((v:number)=>money(v)).join(', ')}</b></li><li>Resistance: <b>{r.resistance.map((v:number)=>money(v)).join(', ')}</b></li></ul></section><section className="panel"><h2>🔮 Ssenariylar</h2><div className="scenario bull"><b>🟢 Bullish</b><p>{r.bullish}</p></div><div className="scenario bear"><b>🔴 Bearish</b><p>{r.bearish}</p></div><p className="note">⚠️ Bu avtomatik texnik tahlil. U kafolatlangan narx prognozi yoki moliyaviy maslahat emas.</p></section></div></>}
  </main>
}
