'use client'

import Link from 'next/link'
import { BrowserProvider, Contract, formatUnits } from 'ethers'
import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

const ABI = [
  'function mint(uint256 quantity)',
  'function mintPrice() view returns (uint256)',
  'function maxSupply() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function remainingSupply() view returns (uint256)',
  'function mintedByWallet(address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]

const USDT_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GOLDENWEB_NFT_CONTRACT || ''
const USDT_ADDRESS = process.env.NEXT_PUBLIC_GOLDENWEB_USDT_CONTRACT || '0x55d398326f99059fF775485246999027B3197955'
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_GOLDENWEB_CHAIN_ID || '56')
const CHAIN_NAME = process.env.NEXT_PUBLIC_GOLDENWEB_CHAIN_NAME || 'BNB Smart Chain'

function short(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

export default function GoldenWebNFTPage() {
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('—')
  const [remaining, setRemaining] = useState('—')
  const [owned, setOwned] = useState('0')
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function loadStats(wallet?: string) {
    if (!CONTRACT_ADDRESS || !(window as any).ethereum) return
    const provider = new BrowserProvider((window as any).ethereum)
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider)
    const [p, left] = await Promise.all([contract.mintPrice(), contract.remainingSupply()])
    setPrice(formatUnits(p, 6))
    setRemaining(left.toString())
    if (wallet) {
      const balance = await contract.balanceOf(wallet)
      setOwned(balance.toString())
    }
  }

  async function connect() {
    if (!CONTRACT_ADDRESS) {
      setMessage('NFT contract address hali Vercel environment variable sifatida kiritilmagan.')
      return
    }
    if (!(window as any).ethereum) {
      setMessage('MetaMask yoki boshqa Web3 wallet kerak.')
      return
    }

    try {
      setBusy(true)
      setMessage('')
      const provider = new BrowserProvider((window as any).ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const network = await provider.getNetwork()

      if (Number(network.chainId) !== CHAIN_ID) {
        setMessage(`${CHAIN_NAME} networkiga o‘ting. Chain ID: ${CHAIN_ID}`)
        return
      }

      const wallet = accounts[0]
      setAddress(wallet)
      await loadStats(wallet)
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.message || 'Wallet ulashda xatolik.')
    } finally {
      setBusy(false)
    }
  }

  async function mint() {
    if (!address || !(window as any).ethereum || !CONTRACT_ADDRESS) return

    try {
      setBusy(true)
      setMessage('')
      const provider = new BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const contract = new Contract(CONTRACT_ADDRESS, ABI, signer)
      const mintPrice = await contract.mintPrice()
      const total = mintPrice * BigInt(quantity)
      const usdt = new Contract(USDT_ADDRESS, USDT_ABI, signer)
      const allowance = await usdt.allowance(address, CONTRACT_ADDRESS)
      if (allowance < total) {
        setMessage('USDT sarflashiga ruxsat berilmoqda...')
        const approval = await usdt.approve(CONTRACT_ADDRESS, total)
        await approval.wait()
      }
      const tx = await contract.mint(quantity)
      setMessage('Transaction yuborildi. Blockchain tasdiqlanishi kutilmoqda...')
      await tx.wait()
      setMessage('Tabriklaymiz! GoldenWeb NFT muvaffaqiyatli olindi.')
      await loadStats(address)
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.reason || e?.message || 'Mint xatoligi.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!CONTRACT_ADDRESS || !(window as any).ethereum) return
    loadStats().catch(() => {})
  }, [])

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ padding: '40px 18px 70px' }}>
        <section className="nftHero">
          <div className="nftKicker">GOLDENWEB NFT</div>
          <h1>GoldenWeb NFT Pass</h1>
          <p>
            GoldenWeb NFT egasi bo‘lgan wallet GOLDENWEB.UZ Premium imkoniyatlariga
            lifetime access oladi. NFT boshqa walletga o‘tsa, Premium huquqi ham yangi egaga o‘tadi.
          </p>

          <div className="nftStats">
            <div><span>Mint narxi</span><strong>{price === '—' ? '—' : `${price} USDT`}</strong></div>
            <div><span>Qolgan NFT</span><strong>{remaining}</strong></div>
            <div><span>Sizdagi NFT</span><strong>{owned}</strong></div>
          </div>

          {!address ? (
            <button className="planBtn nftMainBtn" onClick={connect} disabled={busy}>
              {busy ? 'Ulanmoqda...' : 'Wallet ulash'}
            </button>
          ) : (
            <div className="nftMintArea">
              <div className="nftWallet">{short(address)}</div>
              <div className="nftQuantity">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <strong>{quantity}</strong>
                <button onClick={() => setQuantity(Math.min(10, quantity + 1))}>+</button>
              </div>
              <button className="planBtn nftMainBtn" onClick={mint} disabled={busy}>
                {busy ? 'Mint qilinmoqda...' : 'GoldenWeb NFT mint qilish'}
              </button>
            </div>
          )}

          {message && <div className="nftMessage">{message}</div>}

          <div className="nftBenefits">
            <div><b>∞</b><span>Lifetime Premium</span></div>
            <div><b>◆</b><span>On-chain ownership</span></div>
            <div><b>↗</b><span>Transfer qilinadi</span></div>
          </div>

          <p className="nftBack"><Link href="/premium">Premium sahifasiga qaytish →</Link></p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
