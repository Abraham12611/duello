# Duello

A trustless, peer‑to‑peer sports betting dApp built on the Mantle Network. Duello lets anyone create and join two‑sided markets (Side A vs Side B) for live sporting events, escrow funds on‑chain, and settle outcomes via an optimistic result oracle. The frontend integrates Para wallet (via Wagmi) and targets Mantle Sepolia first, with a path to Mantle mainnet.


## What Duello does

- __Create two‑sided markets__: An owner deploys a `BetMarket` for an event/time window via `BetFactory`.
- __Deposit and take sides__: Users escrow native MNT into Side A or Side B while the market is Open.
- __Auto‑lock at start__: Markets can be locked at or after the configured start time; no deposits after lock.
- __Resolve or void__: Owner resolves the winner (A or B). If one side had zero liquidity at lock, the market is voided and everyone is refunded.
- __Claim payouts__: After resolution, winners claim principal + pro‑rata share of the losing pool. A configurable platform fee (bps) applies to the winnings portion only.


## What Duello is built with (frontend)

- __Next.js 14 + React 18__ for the web app (`web/`).
- __Wagmi v2 + Viem__ for contract reads/writes and wallet state.
- __Para wallet integration__ via `@getpara/react-sdk` and `@getpara/wagmi-v2-integration`.
- __Tailwind CSS__ for styling.

Key files and routes:
- `web/app/page.tsx`: home, category tabs and schedule.
- `web/app/create-market/page.tsx`: gated UI for factory owner to create markets.
- `web/app/market/[address]/page.tsx`: market details (deposit, lock, resolve, claim, void-after-end, price display).
- `web/lib/addresses.ts`: environment‑driven addresses (factory, oracle) and UI owner.
- `web/next.config.mjs`: bundler aliases and relaxed type/eslint build constraints.


## What Duello is built upon (contracts & chain)

- __Mantle Network__
  - Testnet: Mantle Sepolia (chainId 5003, RPC `https://rpc.sepolia.mantle.xyz`)
  - Mainnet: Mantle (chainId 5000, RPC `https://rpc.mantle.xyz`)
  - EIP‑1559 fee model; Mantle guidance favors `maxPriorityFeePerGas = 0` and base ≈ 0.02 gwei.
- __Solidity 0.8.19__ with OpenZeppelin primitives.
- __Hardhat__ for compile, test, deploy, and Mantlescan verification.

Smart contracts (`contracts/contracts/`):
- `BetFactory.sol`: Ownable factory that deploys `BetMarket` instances and tracks all markets.
- `BetMarket.sol`: Two‑sided escrow market with states Open → Locked → Resolved/Voided; native MNT deposits in MVP; fee bps on winnings; pro‑rata claims; pause and reentrancy guards.
- `OptimisticResultOracle.sol`: Simple optimistic oracle with propose → dispute window → finalize flow; suitable for testnet/MVP usage.


## Repository layout

- `contracts/` – Hardhat workspace for Solidity contracts
  - `contracts/BetFactory.sol`, `contracts/BetMarket.sol`, `contracts/OptimisticResultOracle.sol`
  - `scripts/deploy.ts` and helper scripts
  - `hardhat.config.ts`
  - `README.md` with network notes and commands
- `web/` – Next.js frontend
  - Para + Wagmi provider setup, Mantle chain config, UI components and routes
- `project-files/` – product overview and build plan
- `docs/` – Mantle and Para doc excerpts for reference


## Quick start

Prereqs: Node.js 18+, npm 9+, test MNT on Mantle Sepolia.

1) Contracts
- Copy `contracts/.env.example` → `contracts/.env` and set `ACCOUNT_PRIVATE_KEY` and `API_KEY` (Mantlescan).
- Install and compile:
  ```bash
  cd contracts
  npm install
  npm run build
  ```
- Deploy (Mantle Sepolia):
  ```bash
  npm run deploy:sepolia
  ```

2) Web
- Copy `web/.env.local.example` → `web/.env.local` and set:
  - `NEXT_PUBLIC_FACTORY_ADDRESS` – deployed `BetFactory` address
  - `NEXT_PUBLIC_ORACLE_ADDRESS` –
  - `NEXT_PUBLIC_PARA_API_KEY` – your Para key; optionally `NEXT_PUBLIC_PARA_ENV`
- Install and run:
  ```bash
  cd web
  npm install
  npm run dev
  # open http://localhost:3000
  ```


## How it works (high‑level)

- __Escrow__: Users deposit native MNT into Side A or B while the market is Open. Totals are tracked per side.
- __Lock__: At or after `startTime`, anyone can lock. If one side total is zero, the market is voided and all funds are refundable.
- __Resolve__: Owner declares the winner (or uses the optimistic oracle’s finalized result in future iterations).
- __Claim__: Winners claim principal plus pro‑rata share of the losing pool; fee bps are taken from winnings only to the fee recipient.
- __Safety__: Uses `ReentrancyGuard`, `Pausable`, capped fee bps, and simple state guards.


## Networks & fees

- Testnet: Mantle Sepolia (5003) – default during development.
- Mainnet: Mantle (5000).
- EIP‑1559: prefer base fee ≈ 0.02 gwei and priority fee 0 as per Mantle guidance (tooling may auto‑estimate).



## Acknowledgements

- Mantle Network for performant L2 and clear EIP‑1559 guidance.
- Para wallet team for Wagmi v2 integration and developer tooling.
- OpenZeppelin for secure contract building blocks.
