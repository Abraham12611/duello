"use client";

import React, { useMemo } from "react";
import {
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
} from "wagmi";
import { betFactoryAbi } from "@/abis/betFactory";
import { betMarketAbi } from "@/abis/betMarket";
import { FACTORY_ADDRESS } from "@/lib/addresses";
import { mantleSepolia } from "@/lib/chains";

function formatTs(ts?: bigint) {
  if (!ts) return "-";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
}

function stateLabel(v?: bigint) {
  switch (Number(v ?? -1)) {
    case 0:
      return "Open";
    case 1:
      return "Locked";
    case 2:
      return "Resolved";
    case 3:
      return "Voided";
    default:
      return "?";
  }
}

export function MarketsList() {
  const factory = FACTORY_ADDRESS;

  const { data: markets, refetch } = useReadContract({
    chainId: mantleSepolia.id,
    address: factory,
    abi: betFactoryAbi,
    functionName: "allMarkets",
    query: {
      enabled: !!factory,
    },
  });

  useWatchContractEvent({
    chainId: mantleSepolia.id,
    address: factory,
    abi: betFactoryAbi,
    eventName: "MarketCreated",
    enabled: !!factory,
    onLogs: () => {
      refetch();
    },
  });

  const marketAddresses = (markets as `0x${string}`[] | undefined) ?? [];

  const marketReads = useMemo(() => {
    if (!marketAddresses.length) return [] as any[];
    return marketAddresses.flatMap((addr) => [
      { address: addr, abi: betMarketAbi, functionName: "token" as const, chainId: mantleSepolia.id },
      { address: addr, abi: betMarketAbi, functionName: "startTime" as const, chainId: mantleSepolia.id },
      { address: addr, abi: betMarketAbi, functionName: "state" as const, chainId: mantleSepolia.id },
    ]);
  }, [marketAddresses]);

  const { data: details } = useReadContracts({
    allowFailure: true,
    contracts: marketReads,
    query: {
      enabled: marketReads.length > 0,
    },
  });

  const items = useMemo(() => {
    if (!details || !marketAddresses.length) return [] as any[];
    const out: Array<{ address: `0x${string}`; token?: `0x${string}`; start?: bigint; state?: bigint }>= [];
    for (let i = 0; i < marketAddresses.length; i++) {
      const base = i * 3;
      const token = details[base]?.status === "success" ? (details[base]?.result as `0x${string}`) : undefined;
      const start = details[base + 1]?.status === "success" ? (details[base + 1]?.result as bigint) : undefined;
      const state = details[base + 2]?.status === "success" ? (details[base + 2]?.result as bigint) : undefined;
      out.push({ address: marketAddresses[i], token, start, state });
    }
    return out;
  }, [details, marketAddresses]);

  if (!factory) {
    return (
      <div className="text-sm text-red-600">NEXT_PUBLIC_FACTORY_ADDRESS is not set.</div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-medium mb-2">Markets</h3>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-600">No markets yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2 pr-4">Market</th>
                <th className="py-2 pr-4">Token</th>
                <th className="py-2 pr-4">Start</th>
                <th className="py-2 pr-4">State</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.address} className="border-t">
                  <td className="py-2 pr-4">
                    <a
                      className="text-blue-600 hover:underline"
                      href={`https://sepolia.mantlescan.xyz/address/${m.address}`}
                      target="_blank"
                    >
                      {m.address}
                    </a>
                  </td>
                  <td className="py-2 pr-4">
                    {m.token ? (
                      <a
                        className="text-blue-600 hover:underline"
                        href={`https://sepolia.mantlescan.xyz/address/${m.token}`}
                        target="_blank"
                      >
                        {m.token}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-4">{formatTs(m.start)}</td>
                  <td className="py-2 pr-4">{stateLabel(m.state)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
