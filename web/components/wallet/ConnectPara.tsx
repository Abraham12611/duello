"use client";

import React from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { mantleSepolia } from "@/lib/chains";

export function ConnectPara() {
  const { address, isConnected, status } = useAccount();
  const { connectors, connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

  const paraConnector = connectors?.[0];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
          disabled={!paraConnector || isConnecting}
          onClick={() => connect({ connector: paraConnector })}
        >
          {isConnecting ? "Connecting..." : "Connect with Para"}
        </button>
        {connectError && <p className="text-sm text-red-600">{connectError.message}</p>}
      </div>
    );
  }

  if (chainId !== mantleSepolia.id) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">Wrong network</span>
        <button
          className="px-3 py-2 rounded-md bg-amber-500 text-white disabled:opacity-50"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: mantleSepolia.id })}
        >
          {isSwitching ? "Switching..." : "Switch to Mantle Sepolia"}
        </button>
        {switchError && <p className="text-sm text-red-600">{switchError.message}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-700">{address}</span>
      <button
        className="px-3 py-2 rounded-md bg-neutral-200 hover:bg-neutral-300"
        onClick={() => disconnect()}
      >
        Disconnect
      </button>
    </div>
  );
}
