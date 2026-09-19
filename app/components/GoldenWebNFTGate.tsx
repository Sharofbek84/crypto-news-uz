'use client'

import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers'
import { useEffect, useState } from 'react'

const ABI = ['function balanceOf(address owner) view returns (uint256)']

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_GOLDENWEB_CHAIN_ID || '84532')
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GOLDENWEB_NFT_CONTRACT || ''

function shortAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

async function readOwnership(address: string) {
  if (!CONTRACT_ADDRESS) return false

  const rpc = process.env.NEXT_PUBLIC_GOLDENWEB_RPC_URL
  if (rpc) {
    const provider = new JsonRpcProvider(rpc)
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider)
    const balance = await contract.balanceOf(address)
    return balance > 0n
  }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    const provider = new BrowserProvider((window as any).ethereum)
    const network = await provider.getNetwork()
    if (Number(network.chainId) !== CHAIN_ID) return false
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider)
    const balance = await contract.balanceOf(address)
    return balance > 0n
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
      const chainId = Number(network.chainId)
      setAddress(wallet)
      setWrongNetwork(chainId !== CHAIN_ID)

      if (chainId === CHAIN_ID) {
        setHasNFT(await readOwnership(wallet))
      } else {
        setHasNFT(false)
      }
    } catch {
      setHasNFT(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!CONTRACT_ADDRESS) return
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

  if (!CONTRACT_ADDRESS) {
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
        <p>Walletni GoldenWeb NFT uchun sozlangan networkka o‘tkazing.</p>
        <button className="planBtn" onClick={connect}>Qayta tekshirish</button>
        <small>Chain ID: {CHAIN_ID}</small>
      </section>
    )
  }

  if (!hasNFT) {
    return (
      <section className="nftGate">
        <div className="nftGateIcon">◆</div>
        <h2>GoldenWeb NFT talab qilinadi</h2>
        <p>{shortAddress(address)} walletida GoldenWeb NFT topilmadi.</p>
        <a href="/nft" className="planBtn nftGateLink">GoldenWeb NFT olish</a>
      </section>
    )
  }

  return <>{children}</>
}
