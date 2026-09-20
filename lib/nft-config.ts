/** GoldenWeb NFT — shared config (BSC mainnet) */

export const NFT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_GOLDENWEB_CHAIN_ID || '56')
export const NFT_CHAIN_NAME = process.env.NEXT_PUBLIC_GOLDENWEB_CHAIN_NAME || 'BNB Smart Chain'
export const NFT_CONTRACT = process.env.NEXT_PUBLIC_GOLDENWEB_NFT_CONTRACT || ''
/** Binance-Peg USDT on BSC — 18 decimals */
export const USDT_CONTRACT =
  process.env.NEXT_PUBLIC_GOLDENWEB_USDT_CONTRACT || '0x55d398326f99059fF775485246999027B3197955'
export const USDT_DECIMALS = 18
export const NFT_RPC_URL =
  process.env.NEXT_PUBLIC_GOLDENWEB_RPC_URL || 'https://bsc-dataseed.binance.org'
/** Treasury — mint proceeds */
export const NFT_TREASURY = '0x29a58dAb7deBa13CD07eEdCd273Ec1062C439fd3'

export const NFT_ABI = [
  'function mint(uint256 quantity)',
  'function mintPrice() view returns (uint256)',
  'function maxSupply() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function remainingSupply() view returns (uint256)',
  'function mintedByWallet(address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function treasury() view returns (address)',
  'function saleStart() view returns (uint256)',
] as const

export const USDT_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const

/** UI price schedule (matches on-chain: 10 * 2^month, cap 640) */
export const PRICE_SCHEDULE = ['10', '20', '40', '80', '160', '320', '640'] as const

/** 30 days in seconds — matches contract PRICE_STEP_SECONDS */
export const PRICE_STEP_SECONDS = 30 * 24 * 60 * 60

export function formatDateDDMMYYYY(tsSec: number): string {
  const d = new Date(tsSec * 1000)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

/** Build schedule rows from on-chain saleStart */
export function buildPriceSchedule(saleStartSec: number) {
  const now = Math.floor(Date.now() / 1000)
  return PRICE_SCHEDULE.map((price, i) => {
    const from = saleStartSec + i * PRICE_STEP_SECONDS
    const to = saleStartSec + (i + 1) * PRICE_STEP_SECONDS
    const isCap = i === PRICE_SCHEDULE.length - 1
    const active =
      isCap ? now >= from : now >= from && now < to
    return {
      price,
      label: isCap ? '7-oy va keyin' : `${i + 1}-oy`,
      fromLabel: formatDateDDMMYYYY(from),
      toLabel: isCap ? null : formatDateDDMMYYYY(to),
      rangeLabel: isCap
        ? `${formatDateDDMMYYYY(from)} dan`
        : `${formatDateDDMMYYYY(from)} — ${formatDateDDMMYYYY(to)}`,
      active,
      isCap,
    }
  })
}
