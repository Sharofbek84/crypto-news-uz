# GoldenWeb NFT (BSC)

## Xususiyatlar
- ERC-721, max supply **1000**
- Wallet uchun max **10** NFT
- To‘lov: **USDT** (BSC, 18 decimals)
- Barcha USDT → treasury: `0x29a58dAb7deBa13CD07eEdCd273Ec1062C439fd3`
- Narx: 10 → 20 → 40 → 80 → 160 → 320 → **640** USDT (har 30 kunda 2×)

## Deploy (Remix yoki Hardhat)

Constructor:
1. `usdt_` = `0x55d398326f99059fF775485246999027B3197955`
2. `treasury_` = `0x29a58dAb7deBa13CD07eEdCd273Ec1062C439fd3`
3. `baseURI_` = metadata base URL (masalan `https://goldenweb.uz/api/nft/`)

Deploydan keyin Vercel env:
```
NEXT_PUBLIC_GOLDENWEB_NFT_CONTRACT=<deployed address>
NEXT_PUBLIC_GOLDENWEB_CHAIN_ID=56
NEXT_PUBLIC_GOLDENWEB_USDT_CONTRACT=0x55d398326f99059fF775485246999027B3197955
NEXT_PUBLIC_GOLDENWEB_RPC_URL=https://bsc-dataseed.binance.org
```
