# Duello Contracts

Networks:
- Mantle Sepolia (5003): https://rpc.sepolia.mantle.xyz
- Mantle Mainnet (5000): https://rpc.mantle.xyz

Setup:
1. Copy `.env.example` to `.env` and set `ACCOUNT_PRIVATE_KEY` and `API_KEY`.
2. Install deps: `npm install`.
3. Compile: `npm run build`.
4. Deploy to Mantle Sepolia: `npm run deploy:sepolia`.

Notes:
- Recommended EIP-1559: `maxPriorityFeePerGas = 0`, `maxFeePerGas ~ 20_000_000` wei when specifying per-transaction.
- Verify on Mantlescan via Hardhat Etherscan plugin with custom chain config.
