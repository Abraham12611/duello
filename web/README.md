# Duello Web (Next.js)

Trustless P2P betting frontend on Mantle with Para wallet integration via Wagmi.

## Prerequisites
- Node.js 18+
- npm 9+

## Setup
1. Copy env example and fill values:
   ```bash
   cp .env.local.example .env.local
   # Set NEXT_PUBLIC_PARA_API_KEY, optionally NEXT_PUBLIC_PARA_ENV=BETA or PROD
   ```

2. Install deps:
   ```bash
   npm install
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

Open http://localhost:3000

## Para + Wagmi
- Providers: `components/providers/Providers.tsx`
  - Wraps `ParaProvider` and `WagmiProvider` using Para Wagmi connector.
- Custom Mantle chains: `lib/chains.ts` (Mantle Sepolia 5003, Mantle 5000)
- Connect UI: `components/wallet/ConnectPara.tsx`

## Notes
- Enforces Mantle Sepolia in UI; shows switch button if on wrong chain.
- Tailwind configured via `tailwind.config.ts` and `postcss.config.js`.
- If types missing, run `npm install` in both `/web` and `/contracts` workspaces.
