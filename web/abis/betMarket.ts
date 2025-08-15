export const betMarketAbi = [
  {
    type: "function",
    name: "token",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "startTime",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "state",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  // placeholders for future interactions - not used in this step
  { type: "function", name: "lock", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "resolve", inputs: [{ name: "winner", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claim", inputs: [], outputs: [], stateMutability: "nonpayable" },
] as const;
