import Link from 'next/link'
import HomeAnalyst from './components/HomeAnalyst'
import newsData from '../data/news.json'

async function getPrices() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron&order=market_cap_desc',{ next:{revalidate:60},headers:{Accept:'application/json'} })
    if (!res.ok) return []
    const data = await res.json(); return Array.isArray(data)?data:[]
  } catch { return [] }
}
function fmt(p:number){if(p==null||isNaN(p))return '—';if(p>=1000)return '$'+p.toLocaleString('en-US',{maximumFractionDigits:0});if(p>=1)return '$'+p.toFixed(2);return '$'+p.toFixed(4)}

export default async function Home(){
  const prices=await getPrices(),news=Array.isArray(newsData)?newsData:[]
  return <>
    <header className="header"><div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div className="logo">Crypto <span>Tahlil</span> UZ</div><Link href="/analyst" style={{fontWeight:700}}>To‘liq AI Analyst →</Link></div></header>
    <main className="container">
      <HomeAnalyst />
      <h2 className="section">Top Kriptovalyutalar</h2>
      {prices.length===0?<p style={{color:'#848e9c',marginBottom:24}}>Narxlar vaqtincha yuklanmadi. Keyinroq yangilang.</p>:<div className="prices">{prices.map((c:any)=><div key={c.id} className="card"><img src={c.image} alt={c.name} width={32} height={32}/><div><h3>{c.name}</h3><div className="sym">{c.symbol}</div></div><div className="right"><div className="price">{fmt(c.current_price)}</div><div className={(c.price_change_percentage_24h??0)>=0?'up':'down'}>{(c.price_change_percentage_24h??0)>=0?'+':''}{(c.price_change_percentage_24h??0).toFixed(2)}%</div></div></div>)}</div>}
      <h2 className="section">So‘nggi Yangiliklar</h2>
      <div className="news">{news.map((item:any,i:number)=><article key={i} className="item"><h3><a href={item.url||'#'} target="_blank" rel="noopener noreferrer">{item.title}</a></h3><div className="meta">{item.source||'Crypto Tahlil UZ'}{item.date?` • ${item.date}`:''}</div></article>)}</div>
    </main>
    <footer className="footer">Crypto Tahlil UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}</footer>
  </>
}
