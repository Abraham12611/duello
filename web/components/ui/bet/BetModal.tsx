"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { betMarketAbi } from "@/abis/betMarket";
import { mantleSepolia } from "@/lib/chains";
import { parseEther } from "viem";

type Props = {
  open: boolean;
  onClose: () => void;
  market: `0x${string}`;
  team: string;
  opponent: string;
  side: 0 | 1; // A=0, B=1
  onConfirmed?: (d: { amount: number; odds: number; payout: number; txHash?: `0x${string}` | undefined }) => void;
};

export function BetModal({ open, onClose, market, team, opponent, side, onConfirmed }: Props) {
  const [amount, setAmount] = useState("");
  const [odds, setOdds] = useState("");
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash, chainId: mantleSepolia.id });
  const amt = useMemo(() => {
    const v = parseFloat(amount || "0");
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  }, [amount]);
  const oddNum = useMemo(() => {
    const v = parseFloat(odds || "0");
    return Number.isFinite(v) ? v : 0;
  }, [odds]);
  const payout = useMemo(() => amt * (1 + oddNum / 100), [amt, oddNum]);
  const profit = useMemo(() => payout - amt, [payout, amt]);
  const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  useEffect(() => {
    if (isConfirmed) {
      onConfirmed?.({ amount: amt, odds: oddNum, payout, txHash });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const wei = parseEther(amount || "0");
      writeContract({
        chainId: mantleSepolia.id,
        address: market,
        abi: betMarketAbi,
        functionName: "deposit",
        args: [side],
        value: wei,
      });
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[92%] max-w-[520px] card p-6">
        <h3 className="text-xl font-semibold">Create Bet - {team}</h3>
        <p className="secondary mb-4">{team} vs {opponent}</p>
        <div className="h-2 rounded bg-[--surfaceElevated] overflow-hidden mb-6">
          <div className="h-full bg-[--primary]" style={{ width: "35%" }} />
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm">
            <div className="mb-1 font-medium">Bet Amount</div>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Enter bet amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-medium">Odds</div>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Enter odds (e.g. 150)"
              inputMode="decimal"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
            />
          </label>

          {/* Potential winnings panel */}
          <div className="rounded-lg p-4" style={{ background: "#14532d" }}>
            <div className="flex items-start justify-between gap-4 text-white">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <span className="text-lg">$</span>
                </div>
                <div>
                  <div className="font-semibold">Potential Winnings</div>
                  <div className="text-sm opacity-90">{fmt(amt)} at {oddNum || 0} odds</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold">{fmt(isFinite(payout) ? payout : 0)}</div>
                <div className="text-sm" style={{ color: "#86efac" }}>
                  {profit >= 0 ? "+" : ""}{fmt(isFinite(profit) ? profit : 0)} profit
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={isPending || isConfirming}>
              {isPending || isConfirming ? "Creating..." : "Create Bet"}
            </button>
          </div>
          {error && <p className="text-sm" style={{ color: "#fda4af" }}>{error.message}</p>}
          {isConfirmed && <p className="text-sm" style={{ color: "#4ade80" }}>Bet placed!</p>}
        </form>
      </div>
    </div>
  );
}
