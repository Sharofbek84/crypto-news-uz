'use client'

import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers'
import { useEffect, useState } from 'react'
import { NFT_ABI, NFT_CHAIN_ID, NFT_CHAIN_NAME, NFT_CONTRACT, NFT_RPC_URL } from '../../lib/nft-config'

function shortAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

async function readOwnership(address: string) {
  if (!NFT_CONTRACT) return false

  try {
    if (NFT_RPC_URL) {
      const provider = new JsonRpcProvider(NFT_RPC_URL)
      const contract = new Contract(NFT_CONTRACT, NFT_ABI, provider)
      const balance = await contract.balanceOf(address)
      return balance > BigInt(0)
    }

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = new BrowserProvider((window as any).ethereum)
      const network = await provider.getNetwork()
      if (Number(network.chainId) !== NFT_CHAIN_ID) return false
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

  async function connect() {
    if (!(window as any).ethereum) {
      alert('MetaMask yoki boshqa Web3 wallet kerak.')
      return
    }

    setLoading(true)
    try {
      const provider = new BrowserProvider((window as any).ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const wallet = accounts[0]
      const network = await provider.getNetwork()
      let chainId = Number(network.chainId)

      if (chainId !== NFT_CHAIN_ID) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + NFT_CHAIN_ID.toString(16) }],
          })
          chainId = NFT_CHAIN_ID
        } catch {
          setAddress(wallet)
          setWrongNetwork(true)
          setHasNFT(false)
          return
        }
      }

      setAddress(wallet)
      setWrongNetwork(false)
      setHasNFT(await readOwnership(wallet))
    } catch {
      setHasNFT(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!NFT_CONTRACT) return
    const ethereum = (window as any).ethereum
    if (!ethereum) return

    const onAccounts = (accounts: string[]) => {
      if (accounts?.[0]) connect()
      else {
        setAddress('')
        setHasNFT(false)
      }
    }
    const onChain = () => connect()

    ethereum.on?.('accountsChanged', onAccounts)
    ethereum.on?.('chainChanged', onChain)
    return () => {
      ethereum.removeListener?.('accountsChanged', onAccounts)
      ethereum.removeListener?.('chainChanged', onChain)
    }
  }, [])

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
        <button className="planBtn" onClick={connect} disabled={loading}>
          {loading ? 'Tekshirilmoqda...' : 'Wallet ulash'}
        </button>
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
        <button className="planBtn" onClick={connect}>
          Qayta tekshirish
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
      </section>
    )
  }

  return <>{children}</>
}
