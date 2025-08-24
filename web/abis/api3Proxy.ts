export const api3ProxyAbi = [
  {
    type: "function",
    name: "read",
    inputs: [],
    // Most API3 proxy feeds return (int224 value, uint256 timestamp)
    outputs: [
      { type: "int224" },
      { type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;
