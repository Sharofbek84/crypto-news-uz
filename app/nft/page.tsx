'use client'

import Link from 'next/link'
import { BrowserProvider, Contract, formatUnits } from 'ethers'
import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { NFT_PASS_B64 } from '../../lib/nft-pass-b64'
import {
  NFT_ABI,
  NFT_CHAIN_ID,
  NFT_CHAIN_NAME,
  NFT_CONTRACT,
  PRICE_SCHEDULE,
  USDT_ABI,
  USDT_CONTRACT,
  USDT_DECIMALS,
} from '../../lib/nft-config'

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
    if (!NFT_CONTRACT || !(window as any).ethereum) return
    const provider = new BrowserProvider((window as any).ethereum)
    const contract = new Contract(NFT_CONTRACT, NFT_ABI, provider)
    const [p, left] = await Promise.all([contract.mintPrice(), contract.remainingSupply()])
    setPrice(formatUnits(p, USDT_DECIMALS))
    setRemaining(left.toString())
    if (wallet) {
      const balance = await contract.balanceOf(wallet)
      setOwned(balance.toString())
    }
  }

  async function connect() {
    if (!NFT_CONTRACT) {
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

      if (Number(network.chainId) !== NFT_CHAIN_ID) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + NFT_CHAIN_ID.toString(16) }],
          })
        } catch {
          setMessage(`${NFT_CHAIN_NAME} networkiga o‘ting. Chain ID: ${NFT_CHAIN_ID}`)
          return
        }
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
    if (!address || !(window as any).ethereum || !NFT_CONTRACT) return

    try {
      setBusy(true)
      setMessage('')
      const provider = new BrowserProvider((window as any).ethereum)
      const network = await provider.getNetwork()
      if (Number(network.chainId) !== NFT_CHAIN_ID) {
        setMessage(`${NFT_CHAIN_NAME} networkiga o‘ting. Chain ID: ${NFT_CHAIN_ID}`)
        return
      }

      const signer = await provider.getSigner()
      const contract = new Contract(NFT_CONTRACT, NFT_ABI, signer)
      const mintPrice = await contract.mintPrice()
      const total = mintPrice * BigInt(quantity)
      const usdt = new Contract(USDT_CONTRACT, USDT_ABI, signer)
      const allowance = await usdt.allowance(address, NFT_CONTRACT)
      if (allowance < total) {
        setMessage('USDT sarflashiga ruxsat berilmoqda...')
        const approval = await usdt.approve(NFT_CONTRACT, total)
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
    if (!NFT_CONTRACT || !(window as any).ethereum) return
    loadStats().catch(() => {})
  }, [])

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ padding: '28px 18px 70px' }}>
        <section className="nftLanding">
          <div className="nftHeroCopy">
            <div className="nftKicker">LIMITED EDITION</div>
            <h1>
              <span>GOLDENWEB</span> NFT
            </h1>
            <h2>GoldenWeb NFT Pass</h2>
            <p>
              GoldenWeb NFT egasi bo‘lgan wallet GOLDENWEB.UZ Premium imkoniyatlariga lifetime
              access oladi. NFT boshqa walletga o‘tsa, Premium huquqi ham yangi egaga o‘tadi.
            </p>

            <div className="nftStats">
              <div>
                <span>Mint narxi</span>
                <strong>{price === '—' ? '—' : `${price} USDT`}</strong>
              </div>
              <div>
                <span>Jami supply</span>
                <strong>1,000 NFT</strong>
              </div>
              <div>
                <span>Qolgan NFT</span>
                <strong>{remaining}</strong>
              </div>
            </div>

            <div className="nftMintPanel">
              {!address ? (
                <button className="planBtn nftMainBtn" onClick={connect} disabled={busy}>
                  {busy ? 'Ulanmoqda...' : 'Walletni ulash'}
                </button>
              ) : (
                <div className="nftMintArea">
                  <div className="nftWallet">
                    {short(address)}
                    {owned !== '0' ? ` · ${owned} NFT` : ''}
                  </div>
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
            </div>

            <div className="nftBenefits">
              <div>
                <b>♛</b>
                <span>Lifetime Premium</span>
              </div>
              <div>
                <b>▣</b>
                <span>Exclusive Analytics</span>
              </div>
              <div>
                <b>♧</b>
                <span>Traders Community</span>
              </div>
              <div>
                <b>◆</b>
                <span>Special Opportunities</span>
              </div>
            </div>

            <div className="nftMintNote">
              USDT orqali to‘lov · BNB Smart Chain (BSC) · Maksimum 10 NFT / wallet · Tushumlar treasury
              walletga
            </div>
            <p className="nftBack">
              <Link href="/premium">Premium sahifasiga qaytish →</Link>
            </p>
          </div>

          <div className="nftVisual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${NFT_PASS_B64}`}
              alt="GoldenWeb Traders Club NFT Pass"
              width={560}
              height={529}
              className="nftPassImage"
            />
          </div>
        </section>

        <section className="nftPriceTimeline">
          <div>
            <div className="nftKicker">MINT NARXI O‘SISH JADVALI</div>
            <p>Har 30 kunda mint narxi 2 baravar oshadi va 640 USDT darajasida barqarorlashadi.</p>
          </div>
          <div className="nftPriceSteps">
            {PRICE_SCHEDULE.map((p, i) => (
              <div key={p} className={i === 6 ? 'active' : ''}>
                <small>{i < 6 ? `${i + 1}-oy` : '7-oy va keyin'}</small>
                <strong>{p} USDT</strong>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
