'use client'

import { BrowserProvider, Eip1193Provider } from 'ethers'
import { NFT_CHAIN_ID, NFT_CHAIN_NAME } from './nft-config'

const STORAGE_KEY = 'goldenweb_wallet_method'
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

type WalletMethod = 'injected' | 'walletconnect'

let wcProvider: any = null

function getInjected(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  return (window as any).ethereum || null
}

export function shortAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

export function hasInjectedWallet() {
  return Boolean(getInjected())
}

export function hasWalletConnectConfig() {
  return Boolean(WC_PROJECT_ID)
}

async function ensureBsc(provider: Eip1193Provider) {
  const chainIdHex = await provider.request({ method: 'eth_chainId' })
  const chainId = Number(chainIdHex)
  if (chainId === NFT_CHAIN_ID) return true

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + NFT_CHAIN_ID.toString(16) }],
    })
    return true
  } catch (e: any) {
    // 4902 = chain not added
    if (e?.code === 4902 || e?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x' + NFT_CHAIN_ID.toString(16),
              chainName: NFT_CHAIN_NAME || 'BNB Smart Chain',
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: ['https://bsc-dataseed.binance.org'],
              blockExplorerUrls: ['https://bscscan.com'],
            },
          ],
        })
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

async function initWalletConnect() {
  if (wcProvider) return wcProvider
  if (!WC_PROJECT_ID) {
    throw new Error('WalletConnect project ID sozlanmagan (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)')
  }
  const { default: EthereumProvider } = await import('@walletconnect/ethereum-provider')
  wcProvider = await EthereumProvider.init({
    projectId: WC_PROJECT_ID,
    chains: [NFT_CHAIN_ID],
    optionalChains: [NFT_CHAIN_ID],
    showQrModal: true,
    metadata: {
      name: 'GOLDENWEB.UZ',
      description: 'GoldenWeb NFT Mint & Premium',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://goldenweb.uz',
      icons: ['https://goldenweb.uz/icons/192'],
    },
  })
  return wcProvider
}

export type ConnectResult = {
  address: string
  provider: BrowserProvider
  method: WalletMethod
  eip1193: Eip1193Provider
}

/** Silent restore — page yuklanganda, foydalanuvchi so‘ramasdan */
export async function tryRestoreWallet(): Promise<ConnectResult | null> {
  if (typeof window === 'undefined') return null
  const method = (localStorage.getItem(STORAGE_KEY) || '') as WalletMethod | ''

  // 1) Injected (MetaMask va h.k.) — eth_accounts silent
  const injected = getInjected()
  if (injected) {
    try {
      const accounts = (await injected.request({ method: 'eth_accounts' })) as string[]
      if (accounts?.[0]) {
        const ok = await ensureBsc(injected)
        if (!ok) return null
        const provider = new BrowserProvider(injected)
        localStorage.setItem(STORAGE_KEY, 'injected')
        return { address: accounts[0], provider, method: 'injected', eip1193: injected }
      }
    } catch {
      /* ignore */
    }
  }

  // 2) WalletConnect session restore
  if (method === 'walletconnect' && WC_PROJECT_ID) {
    try {
      const wc = await initWalletConnect()
      if (wc.session && wc.accounts?.[0]) {
        const provider = new BrowserProvider(wc as Eip1193Provider)
        return {
          address: wc.accounts[0],
          provider,
          method: 'walletconnect',
          eip1193: wc as Eip1193Provider,
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return null
}

/** Explicit connect — tugma bosilganda */
export async function connectWallet(preferred?: 'injected' | 'walletconnect'): Promise<ConnectResult> {
  const injected = getInjected()

  // Prefer injected on desktop if available and not forced WC
  if (preferred !== 'walletconnect' && injected) {
    const accounts = (await injected.request({ method: 'eth_requestAccounts' })) as string[]
    if (!accounts?.[0]) throw new Error('Wallet ulanmadi')
    const ok = await ensureBsc(injected)
    if (!ok) throw new Error(`${NFT_CHAIN_NAME} (Chain ID ${NFT_CHAIN_ID}) ga o‘ting`)
    const provider = new BrowserProvider(injected)
    localStorage.setItem(STORAGE_KEY, 'injected')
    return { address: accounts[0], provider, method: 'injected', eip1193: injected }
  }

  // WalletConnect (mobile / fallback)
  if (!WC_PROJECT_ID) {
    if (!injected) {
      throw new Error(
        'MetaMask o‘rnating yoki WalletConnect uchun NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID qo‘shing'
      )
    }
    // fallback already handled above
  }

  const wc = await initWalletConnect()
  await wc.enable()
  const accounts = (wc.accounts || []) as string[]
  if (!accounts[0]) throw new Error('WalletConnect orqali hisob topilmadi')
  const provider = new BrowserProvider(wc as Eip1193Provider)
  localStorage.setItem(STORAGE_KEY, 'walletconnect')
  return {
    address: accounts[0],
    provider,
    method: 'walletconnect',
    eip1193: wc as Eip1193Provider,
  }
}

export async function disconnectWallet(method?: WalletMethod | string) {
  localStorage.removeItem(STORAGE_KEY)
  const m = method || localStorage.getItem(STORAGE_KEY)

  if (m === 'walletconnect' || wcProvider) {
    try {
      const wc = wcProvider || (await initWalletConnect().catch(() => null))
      if (wc?.disconnect) await wc.disconnect()
    } catch {
      /* ignore */
    }
    wcProvider = null
  }

  // MetaMask: try revoke (optional, not all wallets support)
  const injected = getInjected()
  if (injected) {
    try {
      await injected.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      })
    } catch {
      /* not supported — UI state already cleared */
    }
  }
}

export function subscribeWalletEvents(
  eip1193: Eip1193Provider,
  handlers: {
    onAccounts?: (accounts: string[]) => void
    onChain?: (chainId: string) => void
    onDisconnect?: () => void
  }
) {
  const eth = eip1193 as any
  const onAccounts = (accounts: string[]) => handlers.onAccounts?.(accounts || [])
  const onChain = (chainId: string) => handlers.onChain?.(chainId)
  const onDisconnect = () => handlers.onDisconnect?.()

  eth.on?.('accountsChanged', onAccounts)
  eth.on?.('chainChanged', onChain)
  eth.on?.('disconnect', onDisconnect)

  return () => {
    eth.removeListener?.('accountsChanged', onAccounts)
    eth.removeListener?.('chainChanged', onChain)
    eth.removeListener?.('disconnect', onDisconnect)
  }
}
