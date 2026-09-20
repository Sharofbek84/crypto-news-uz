'use client'

import { Contract, JsonRpcProvider } from 'ethers'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NFT_ABI, NFT_CHAIN_ID, NFT_CHAIN_NAME, NFT_CONTRACT, NFT_RPC_URL } from '../../lib/nft-config'
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

async function readOwnership(address: string) {
  if (!NFT_CONTRACT) return false
  try {
    if (NFT_RPC_URL) {
      const provider = new JsonRpcProvider(NFT_RPC_URL)
      const contract = new Contract(NFT_CONTRACT, NFT_ABI, provider)
      const balance = await contract.balanceOf(address)
      return balance > BigInt(0)
    }
  } catch {
    return false
  }
  return false
}

export default function GoldenWebNFTGate({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState('')
  const [hasNFT, setHasNFT] = useState(false)
  const [wrongNetwork, setWrongNetwork] = useState(false)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState('')
  const sessionRef = useRef<ConnectResult | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const applySession = useCallback(async (session: ConnectResult) => {
    sessionRef.current = session
    setAddress(session.address)
    setMethod(session.method)
    setWrongNetwork(false)
    setHasNFT(await readOwnership(session.address))

    unsubRef.current?.()
    unsubRef.current = subscribeWalletEvents(session.eip1193, {
      onAccounts: async (accounts) => {
        if (!accounts?.[0]) {
          setAddress('')
          setHasNFT(false)
          setMethod('')
          sessionRef.current = null
        } else {
          setAddress(accounts[0])
          setHasNFT(await readOwnership(accounts[0]))
        }
      },
      onChain: async () => {
        if (sessionRef.current?.address) {
          setHasNFT(await readOwnership(sessionRef.current.address))
        }
      },
      onDisconnect: () => {
        setAddress('')
        setHasNFT(false)
        setMethod('')
        sessionRef.current = null
      },
    })
  }, [])

  useEffect(() => {
    if (!NFT_CONTRACT) return
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

  async function connect(preferred?: 'injected' | 'walletconnect') {
    setLoading(true)
    try {
      const session = await connectWallet(preferred)
      await applySession(session)
    } catch (e: any) {
      if (e?.message?.includes('Chain ID') || e?.message?.includes('o‘ting')) {
        setWrongNetwork(true)
      }
      setHasNFT(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    setLoading(true)
    try {
      await disconnectWallet(method)
    } catch {
      /* ignore */
    }
    sessionRef.current = null
    unsubRef.current?.()
    setAddress('')
    setHasNFT(false)
    setMethod('')
    setWrongNetwork(false)
    setLoading(false)
  }

  if (!NFT_CONTRACT) {
    return (
      <section className="nftGate">
        <div className="nftGateIcon">◆</div>
        <h2>GoldenWeb NFT Premium</h2>
        <p>Premium NFT access hali blockchain contract bilan sozlanmoqda.</p>
        <small>NEXT_PUBLIC_GOLDENWEB_NFT_CONTRACT kiritilgach bu himoya avtomatik ishlaydi.</small>
      </section>
    )
  }

  if (!address) {
    return (
      <section className="nftGate">
        <div className="nftGateIcon">◆</div>
        <h2>GoldenWeb Premium</h2>
        <p>Premium sahifaga kirish uchun GoldenWeb NFT egasi ekaningizni wallet orqali tasdiqlang.</p>
        <div className="nftConnectStack" style={{ maxWidth: 320, margin: '0 auto' }}>
          {hasInjectedWallet() && (
            <button className="planBtn" onClick={() => connect('injected')} disabled={loading}>
              {loading ? 'Tekshirilmoqda...' : 'MetaMask / Browser wallet'}
            </button>
          )}
          {(hasWalletConnectConfig() || !hasInjectedWallet()) && (
            <button
              className="planBtn nftWcBtn"
              onClick={() => connect('walletconnect')}
              disabled={loading}
              style={{ marginTop: 10 }}
            >
              {loading ? 'Tekshirilmoqda...' : 'WalletConnect (mobil)'}
            </button>
          )}
        </div>
      </section>
    )
  }

  if (wrongNetwork) {
    return (
      <section className="nftGate">
        <div className="nftGateIcon">!</div>
        <h2>Noto‘g‘ri network</h2>
        <p>
          Walletni {NFT_CHAIN_NAME} ga o‘tkazing (Chain ID: {NFT_CHAIN_ID}).
        </p>
        <button className="planBtn" onClick={() => connect()} disabled={loading}>
          Qayta tekshirish
        </button>
        <button
          type="button"
          className="nftDisconnect"
          onClick={handleDisconnect}
          style={{ marginTop: 12, display: 'inline-block' }}
        >
          Walletni uzish
        </button>
      </section>
    )
  }

  if (!hasNFT) {
    return (
      <section className="nftGate">
        <div className="nftGateIcon">◆</div>
        <h2>GoldenWeb NFT talab qilinadi</h2>
        <p>{shortAddress(address)} walletida GoldenWeb NFT topilmadi.</p>
        <a href="/nft" className="planBtn nftGateLink">
          GoldenWeb NFT olish
        </a>
        <button
          type="button"
          className="nftDisconnect"
          onClick={handleDisconnect}
          style={{ marginTop: 12, display: 'inline-block' }}
        >
          Walletni uzish
        </button>
      </section>
    )
  }

  return <>{children}</>
}
