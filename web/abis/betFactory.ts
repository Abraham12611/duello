export const betFactoryAbi = [
  {
    type: "function",
    name: "createMarket",
    inputs: [
      { name: "token", type: "address" },
      { name: "startTime", type: "uint256" }
    ],
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allMarkets",
    inputs: [],
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { indexed: true, name: "market", type: "address" },
      { indexed: false, name: "token", type: "address" },
      { indexed: false, name: "startTime", type: "uint256" }
    ],
    anonymous: false,
  },
] as const;
