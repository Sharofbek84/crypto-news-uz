'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BrowserProvider, Contract, formatUnits, JsonRpcProvider, type Provider } from 'ethers'
import { useCallback, useEffect, useRef, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import {
  buildPriceSchedule,
  NFT_ABI,
  NFT_CHAIN_ID,
  NFT_CHAIN_NAME,
  NFT_CONTRACT,
  NFT_RPC_URL,
  USDT_ABI,
  USDT_CONTRACT,
  USDT_DECIMALS,
} from '../../lib/nft-config'
import {
  connectWallet,
  disconnectWallet,
  hasInjectedWallet,
  hasWalletConnectConfig,
  shortAddress,
  subscribeWalletEvents,
  tryRestoreWallet,
  type ConnectResult,
} from '../../lib/wallet-client'

type ScheduleRow = ReturnType<typeof buildPriceSchedule>[number]

export default function GoldenWebNFTPage() {
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('—')
  const [remaining, setRemaining] = useState('—')
  const [owned, setOwned] = useState('0')
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [method, setMethod] = useState('')
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const sessionRef = useRef<ConnectResult | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const loadStats = useCallback(async (wallet?: string, provider?: Provider) => {
    if (!NFT_CONTRACT) return
    try {
      let p: Provider | null = provider || sessionRef.current?.provider || null
      if (!p) {
        if (NFT_RPC_URL) {
          p = new JsonRpcProvider(NFT_RPC_URL)
        } else if (typeof window !== 'undefined' && (window as any).ethereum) {
          p = new BrowserProvider((window as any).ethereum)
        }
      }
      if (!p) return
      const contract = new Contract(NFT_CONTRACT, NFT_ABI, p)
      const [mintP, left, start] = await Promise.all([
        contract.mintPrice(),
        contract.remainingSupply(),
        contract.saleStart(),
      ])
      setPrice(formatUnits(mintP, USDT_DECIMALS))
      setRemaining(left.toString())
      setSchedule(buildPriceSchedule(Number(start)))
      if (wallet) {
        const balance = await contract.balanceOf(wallet)
        setOwned(balance.toString())
      }
    } catch {
      /* RPC xatosi — silent */
    }
  }, [])

  const applySession = useCallback(
    async (session: ConnectResult) => {
      sessionRef.current = session
      setAddress(session.address)
      setMethod(session.method)
      setMessage('')
      await loadStats(session.address, session.provider)

      unsubRef.current?.()
      unsubRef.current = subscribeWalletEvents(session.eip1193, {
        onAccounts: (accounts) => {
          if (!accounts?.[0]) {
            setAddress('')
            setMethod('')
            sessionRef.current = null
            setOwned('0')
          } else {
            setAddress(accounts[0])
            loadStats(accounts[0], session.provider)
          }
        },
        onChain: () => {
          loadStats(sessionRef.current?.address, sessionRef.current?.provider)
        },
        onDisconnect: () => {
          setAddress('')
          setMethod('')
          sessionRef.current = null
          setOwned('0')
        },
      })
    },
    [loadStats]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const restored = await tryRestoreWallet()
      if (cancelled || !restored) return
      await applySession(restored)
    })()
    return () => {
      cancelled = true
      unsubRef.current?.()
    }
  }, [applySession])

  useEffect(() => {
    if (!NFT_CONTRACT) return
    loadStats().catch(() => {})
  }, [loadStats])

  async function handleConnect(preferred?: 'injected' | 'walletconnect') {
    if (!NFT_CONTRACT) {
      setMessage('NFT contract address hali Vercel environment variable sifatida kiritilmagan.')
      return
    }
    try {
      setBusy(true)
      setMessage('')
      const session = await connectWallet(preferred)
      await applySession(session)
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.message || 'Wallet ulashda xatolik.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    setBusy(true)
    try {
      await disconnectWallet(method)
    } catch {
      /* ignore */
    }
    sessionRef.current = null
    unsubRef.current?.()
    unsubRef.current = null
    setAddress('')
    setMethod('')
    setOwned('0')
    setMessage('')
    setBusy(false)
  }

  async function mint() {
    const session = sessionRef.current
    if (!session?.address || !NFT_CONTRACT) return

    try {
      setBusy(true)
      setMessage('')
      const network = await session.provider.getNetwork()
      if (Number(network.chainId) !== NFT_CHAIN_ID) {
        setMessage(`${NFT_CHAIN_NAME} networkiga o‘ting. Chain ID: ${NFT_CHAIN_ID}`)
        return
      }

      const signer = await session.provider.getSigner()
      const contract = new Contract(NFT_CONTRACT, NFT_ABI, signer)
      const mintPrice = await contract.mintPrice()
      const total = mintPrice * BigInt(quantity)
      const usdt = new Contract(USDT_CONTRACT, USDT_ABI, signer)
      const allowance = await usdt.allowance(session.address, NFT_CONTRACT)
      if (allowance < total) {
        setMessage('USDT sarflashiga ruxsat berilmoqda...')
        const approval = await usdt.approve(NFT_CONTRACT, total)
        await approval.wait()
      }
      const tx = await contract.mint(quantity)
      setMessage('Transaction yuborildi. Blockchain tasdiqlanishi kutilmoqda...')
      await tx.wait()
      setMessage('Tabriklaymiz! GoldenWeb NFT muvaffaqiyatli olindi.')
      await loadStats(session.address, session.provider)
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.reason || e?.message || 'Mint xatoligi.')
    } finally {
      setBusy(false)
    }
  }

  const showWc = hasWalletConnectConfig() || !hasInjectedWallet()

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ padding: '28px 18px 70px' }}>
        <section className="nftLanding">
          <div className="nftHeroCopy">
            <div className="nftKicker">LIMITED EDITION</div>
            <h1 className="nftTitle">GOLDENWEB NFT</h1>
            <h2 className="nftSubtitle">Erta foydalanuvchilar uchun eksklyuziv imkoniyat!</h2>
            <div className="nftIntro">
              <p>Ushbu Goldenweb NFT egasi quyidagi imkoniyatlarga ega bo‘ladi:</p>
              <ul>
                <li>Goldenweb.uz Premium imkoniyatlaridan cheksiz foydalanish;</li>
                <li>Goldenweb Traderlar Clubi VIP guruhi a’zosi bo‘lish;</li>
                <li>NFT dan foydalanish huquqini mustaqil boshqarish.</li>
              </ul>
              <p className="nftIntroNote">
                Goldenweb NFT qiymati har oyda ikki barobarga o‘sib boradi, shunday ekan, uni dastlabki
                oylarda discount narxlarda mint qilish imkoniyatini o‘tkazib yubormang!
              </p>
            </div>

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
                <div className="nftConnectStack">
                  {hasInjectedWallet() && (
                    <button
                      className="planBtn nftMainBtn"
                      onClick={() => handleConnect('injected')}
                      disabled={busy}
                    >
                      {busy ? 'Ulanmoqda...' : 'MetaMask / Browser wallet'}
                    </button>
                  )}
                  {showWc && (
                    <button
                      className="planBtn nftMainBtn nftWcBtn"
                      onClick={() => handleConnect('walletconnect')}
                      disabled={busy}
                    >
                      {busy ? 'Ulanmoqda...' : 'WalletConnect (mobil)'}
                    </button>
                  )}
                  {!hasInjectedWallet() && !hasWalletConnectConfig() && (
                    <p className="nftHint">
                      MetaMask o‘rnating yoki mobil uchun WalletConnect Project ID qo‘shing.
                    </p>
                  )}
                </div>
              ) : (
                <div className="nftMintArea">
                  <div className="nftWallet">
                    {shortAddress(address)}
                    {owned !== '0' ? ` · ${owned} NFT` : ''}
                    {method === 'walletconnect' ? ' · WC' : ''}
                  </div>
                  <button
                    type="button"
                    className="nftDisconnect"
                    onClick={handleDisconnect}
                    disabled={busy}
                    title="Walletni uzish"
                  >
                    Uzish
                  </button>
                  <div className="nftQuantity">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                      −
                    </button>
                    <strong>{quantity}</strong>
                    <button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))}>
                      +
                    </button>
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
              USDT orqali to‘lov · BNB Smart Chain (BSC) · Maksimum 10 NFT / wallet
            </div>
            <p className="nftBack">
              <Link href="/premium">Premium sahifasiga qaytish →</Link>
            </p>
          </div>

          <div className="nftVisual">
            <Image
              src="/goldenweb-nft-pass.png"
              alt="GoldenWeb Traders Club NFT Pass"
              width={1290}
              height={1219}
              priority
              quality={95}
              className="nftPassImage"
            />
          </div>
        </section>

        <section className="nftPriceTimeline">
          <div>
            <div className="nftKicker">MINT NARXI O‘SISH JADVALI</div>
            <p>
              Narx kontrakt deploy qilingan kundan boshlab har 30 kunda 2 baravar oshadi va 640 USDT
              da to‘xtaydi. Hozirgi bosqich sariq bilan belgilangan.
            </p>
          </div>
          <div className="nftPriceSteps">
            {(schedule.length
              ? schedule
              : [
                  { label: '1-oy', price: '10', rangeLabel: '…', active: false, isCap: false },
                  { label: '2-oy', price: '20', rangeLabel: '…', active: false, isCap: false },
                  { label: '3-oy', price: '40', rangeLabel: '…', active: false, isCap: false },
                  { label: '4-oy', price: '80', rangeLabel: '…', active: false, isCap: false },
                  { label: '5-oy', price: '160', rangeLabel: '…', active: false, isCap: false },
                  { label: '6-oy', price: '320', rangeLabel: '…', active: false, isCap: false },
                  {
                    label: '7-oy va keyin',
                    price: '640',
                    rangeLabel: '…',
                    active: false,
                    isCap: true,
                  },
                ]
            ).map((row) => (
              <div key={row.label} className={row.active ? 'active' : ''}>
                <small>{row.label}</small>
                <strong>{row.price} USDT</strong>
                <span className="nftPriceRange">{row.rangeLabel}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
