import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.19',
  defaultNetwork: 'mantleSepolia',
  networks: {
    mantle: {
      url: 'https://rpc.mantle.xyz',
      accounts: [process.env.ACCOUNT_PRIVATE_KEY ?? ''],
    },
    mantleSepolia: {
      url: 'https://rpc.sepolia.mantle.xyz',
      accounts: [process.env.ACCOUNT_PRIVATE_KEY ?? ''],
      gasPrice: 20_000_000, // 0.02 gwei
      // EIP-1559 style can also be set per-tx: maxFeePerGas, maxPriorityFeePerGas (0)
    },
  },
  etherscan: {
    apiKey: process.env.API_KEY,
    customChains: [
      {
        network: 'mantle',
        chainId: 5000,
        urls: {
          apiURL: 'https://api.mantlescan.xyz/api',
          browserURL: 'https://mantlescan.xyz',
        },
      },
      {
        network: 'mantleSepolia',
        chainId: 5003,
        urls: {
          apiURL: 'https://api-sepolia.mantlescan.xyz/api',
          browserURL: 'https://sepolia.mantlescan.xyz/',
        },
      },
    ],
  },
};

export default config;
