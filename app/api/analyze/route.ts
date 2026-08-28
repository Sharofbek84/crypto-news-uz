import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'
import { calculateSignal, SignalInput } from '@/lib/signal-engine'
import { sendTelegramSignal } from '@/lib/telegram'
import { getRedis } from '@/lib/redis'

const ALIASES: Record<string, string> = {
  BTC:'BTCUSDT',ETH:'ETHUSDT',LTC:'LTCUSDT',SOL:'SOLUSDT',BNB:'BNBUSDT',NEAR:'NEARUSDT',GRAM:'GRAMUSDT',SUI:'SUIUSDT',APT:'APTUSDT',ATOM:'ATOMUSDT',XAUT:'XAUTUSDT',XRP:'XRPUSDT',XLM:'XLMUSDT',TRX:'TRXUSDT',HYPE:'HYPEUSDT',BCH:'BCHUSDT',ZEC:'ZECUSDT',LINK:'LINKUSDT',AVAX:'AVAXUSDT',ONDO:'ONDOUSDT',WLD:'WLDUSDT'
}
const COINBASE_PRODUCTS: Record<string,string> = {BTC:'BTC-USD',ETH:'ETH-USD',LTC:'LTC-USD',SOL:'SOL-USD',BNB:'BNB-USD',NEAR:'NEAR-USD',SUI:'SUI-USD',APT:'APT-USD',ATOM:'ATOM-USD',XRP:'XRP-USD',XLM:'XLM-USD',BCH:'BCH-USD',LINK:'LINK-USD',AVAX:'AVAX-USD'}
const KRAKEN_PAIRS: Record<string,string> = {BTC:'XBTUSD',ETH:'ETHUSD',LTC:'LTCUSD',SOL:'SOLUSD',XRP:'XRPUSD',XLM:'XLMUSD',BCH:'BCHUSD',LINK:'LINKUSD',AVAX:'AVAXUSD',ATOM:'ATOMUSD',NEAR:'NEARUSD',SUI:'SUIUSD',APT:'APTUSD'}
const ALLOWED_INTERVALS = ['15m','1h','4h','1d']

function intervalConfig(interval:string){
  if(interval==='15m') return {coinbase:900,kraken:15,binance:'15m',gate:'15m'}
  if(interval==='1d') return {coinbase:86400,kraken:1440,binance:'1d',gate:'1d'}
  if(interval==='1h') return {coinbase:3600,kraken:60,binance:'1h',gate:'1h'}
  return {coinbase:14400,kraken:240,binance:'4h',gate:'4h'}
}

async function fetchGate(symbol:string,interval:string):Promise<Candle[]>{
  const pair=`${symbol}_USDT`
  const gateInterval=intervalConfig(interval).gate
  const res=await fetch(`https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${encodeURIComponent(pair)}&interval=${gateInterval}&limit=150`,{cache:'no-store',headers:{Accept:'application/json','User-Agent':'Crypto-AI-Analyst/1.0'}})
  if(!res.ok) throw new Error(`Gate ${res.status}`)
  const data=await res.json()
  if(!Array.isArray(data)||data.length<60) throw new Error('Gate insufficient candles')
  return data.map((k:string[])=>({time:+k[0]*1000,volume:+k[1],close:+k[2],high:+k[3],low:+k[4],open:+k[5]})).sort((a,b)=>a.time-b.time)
}

async function fetchCoinbase(symbol:string,interval:string):Promise<Candle[]>{
  const product=COINBASE_PRODUCTS[symbol]; if(!product) throw new Error("Coinbase pair yo'q")
  if(interval==='4h') throw new Error('Coinbase 4h granularity unsupported')
  const res=await fetch(`https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/candles?granularity=${intervalConfig(interval).coinbase}`,{cache:'no-store',headers:{Accept:'application/json','User-Agent':'Crypto-AI-Analyst/1.0'}})
  if(!res.ok) throw new Error(`Coinbase ${res.status}`)
  const data=await res.json(); if(!Array.isArray(data)||data.length<60) throw new Error('Coinbase insufficient candles')
  return data.map((k:number[])=>({time:k[0]*1000,low:+k[1],high:+k[2],open:+k[3],close:+k[4],volume:+k[5]})).sort((a,b)=>a.time-b.time)
}

async function fetchCoinbase4h(symbol:string):Promise<Candle[]>{
  const hourly=await fetchCoinbase(symbol,'1h'); const groups=new Map<number,Candle>()
  for(const candle of hourly){const bucket=Math.floor(candle.time/(4*60*60*1000))*4*60*60*1000;const existing=groups.get(bucket);if(!existing)groups.set(bucket,{time:bucket,open:candle.open,high:candle.high,low:candle.low,close:candle.close,volume:candle.volume});else{existing.high=Math.max(existing.high,candle.high);existing.low=Math.min(existing.low,candle.low);existing.close=candle.close;existing.volume+=candle.volume}}
  const candles=Array.from(groups.values()).sort((a,b)=>a.time-b.time);if(candles.length<60)throw new Error('Coinbase aggregated 4h candles insufficient');return candles
}

async function fetchKraken(symbol:string,interval:string):Promise<Candle[]>{
  const pair=KRAKEN_PAIRS[symbol];if(!pair)throw new Error("Kraken pair yo'q")
  const res=await fetch(`https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${intervalConfig(interval).kraken}`,{cache:'no-store',headers:{Accept:'application/json','User-Agent':'Crypto-AI-Analyst/1.0'}})
  if(!res.ok)throw new Error(`Kraken ${res.status}`)
  const json=await res.json();if(json.error?.length)throw new Error(`Kraken ${json.error.join(', ')}`)
  const key=Object.keys(json.result||{}).find(k=>k!=='last');const data=key?json.result[key]:null
  if(!Array.isArray(data)||data.length<60)throw new Error('Kraken insufficient candles')
  return data.map((k:any[])=>({time:+k[0]*1000,open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[6]})).sort((a,b)=>a.time-b.time)
}

async function fetchBinance(symbol:string,interval:string):Promise<Candle[]>{
  const binanceSymbol=ALIASES[symbol]||`${symbol}USDT`;const res=await fetch(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${intervalConfig(interval).binance}&limit=150`,{cache:'no-store',headers:{Accept:'application/json','User-Agent':'Crypto-AI-Analyst/1.0'}})
  if(!res.ok)throw new Error(`Binance ${res.status}`);const data=await res.json();if(!Array.isArray(data)||data.length<60)throw new Error('Binance insufficient candles')
  return data.map((k:any[])=>({time:+k[0],open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]}))
}

async function fetchMarketData(symbol:string,interval:string){
  const errors:string[]=[]
  const providers = symbol==='GRAM' || (symbol==='BNB' && interval==='4h')
    ? [['Gate',fetchGate],['Binance',fetchBinance],['Coinbase Exchange (1h→4h)',fetchCoinbase4h],['Coinbase Exchange',fetchCoinbase],['Kraken',fetchKraken]] as const
    : interval==='4h'
      ? [['Binance',fetchBinance],['Coinbase Exchange (1h→4h)',fetchCoinbase4h],['Kraken',fetchKraken]] as const
      : [['Coinbase Exchange',fetchCoinbase],['Kraken',fetchKraken],['Binance',fetchBinance]] as const
  for(const [provider,fetcher] of providers){try{return{candles:await fetcher(symbol,interval),provider}}catch(e:any){errors.push(`${provider}: ${e?.message||'error'}`)}}
  throw new Error(`Market data topilmadi. ${errors.join(' | ')}`)
}

function emaSeries(candles:Candle[],period:number){const first=candles[0]?.close||0;const k=2/(period+1);let ema=first;return candles.map((c,i)=>{if(i>0)ema=c.close*k+ema*(1-k);return ema})}
function rsiSeries(candles:Candle[],period=14){const out:number[]=[];let gain=0,loss=0;for(let i=0;i<candles.length;i++){if(i===0){out.push(50);continue}const d=candles[i].close-candles[i-1].close,g=Math.max(d,0),l=Math.max(-d,0);if(i<=period){gain+=g;loss+=l;out.push(i===period?(loss===0?100:100-100/(1+gain/loss)):50)}else{gain=(gain*(period-1)+g)/period;loss=(loss*(period-1)+l)/period;out.push(loss===0?100:100-100/(1+gain/loss))}}return out}
function higherInterval(interval:string){if(interval==='1h')return'4h';if(interval==='4h')return'1d';return null}

async function notifyTelegramForNewSignal(symbol:string,interval:string,candles:Candle[]){
  if(!candles.length||interval==='15m')return;const closed=candles.length>1?candles.slice(0,-1):candles;if(closed.length<60)return
  const ema20=emaSeries(closed,20),ema50=emaSeries(closed,50),rsi=rsiSeries(closed);let higherTimeframe:SignalInput['higherTimeframe']|undefined
  const higher=higherInterval(interval);if(higher){try{const d=await fetchMarketData(symbol,higher),r=analyze(d.candles,higher);higherTimeframe={ema20:r.ema20,ema50:r.ema50,rsi:r.rsi}}catch{higherTimeframe=undefined}}
  const inputs:SignalInput[]=closed.map((c,i)=>({time:c.time,close:c.close,ema20:ema20[i],ema50:ema50[i],rsi:rsi[i],higherTimeframe}));const latest=inputs[inputs.length-1],previous=inputs[inputs.length-2];const latestSignal=calculateSignal(latest),previousSignal=calculateSignal(previous)
  if(!latestSignal||latestSignal.type===previousSignal?.type)return
  const signal={side:latestSignal.type,symbol,timeframe:(interval==='1h'?'H1':interval==='4h'?'H4':'D1') as 'H1'|'H4'|'D1',entryLow:latestSignal.entryLow,entryHigh:latestSignal.entryHigh,tp:[latestSignal.tp1,latestSignal.tp2,latestSignal.tp3],sl:latestSignal.stopLoss}
  const redis=getRedis();if(!redis){console.error('Telegram signal deduplication unavailable: Upstash Redis is not configured');return}
  const redisKey=`goldenweb:telegram-signal:${symbol}:${interval}:${latest.time}:${latestSignal.type}`;const claimed=await redis.set(redisKey,'1',{nx:true,ex:60*60*24*30});if(claimed==null)return
  try{await sendTelegramSignal(signal)}catch(error){await redis.del(redisKey);throw error}
}

export async function GET(req:NextRequest){
  const q=req.nextUrl.searchParams,raw=(q.get('symbol')||'BTC').toUpperCase(),symbol=raw.replace(/[^A-Z0-9]/g,''),requested=q.get('interval')||'1h',interval=ALLOWED_INTERVALS.includes(requested)?requested:'1h'
  try{const {candles,provider}=await fetchMarketData(symbol,interval);const result=analyze(candles,interval);const scannerSecret=process.env.CRON_SECRET,scannerHeader=req.headers.get('x-signal-scanner-secret'),isScannerRequest=Boolean(scannerSecret)&&scannerHeader===scannerSecret;if(isScannerRequest){try{await notifyTelegramForNewSignal(symbol,interval,candles)}catch(e){console.error('Telegram signal notification failed:',e)}}return NextResponse.json({symbol,interval,provider,candles,result,generatedAt:new Date().toISOString()})}catch(e:any){return NextResponse.json({error:e?.message||"Market data serveriga ulanib bo'lmadi."},{status:502})}
}