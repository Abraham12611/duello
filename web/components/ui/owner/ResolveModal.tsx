"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { betMarketAbi } from "@/abis/betMarket";
import { mantleSepolia } from "@/lib/chains";

export type ResolveModalProps = {
  open: boolean;
  onClose: () => void;
  market: `0x${string}`;
  teamA: string;
  teamB: string;
};

export function ResolveModal({ open, onClose, market, teamA, teamB }: ResolveModalProps) {
  const [winner, setWinner] = useState<"A" | "B" | "Void">("A");
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      onClose();
    }
  }, [isConfirmed, onClose]);

  const isVoid = winner === "Void";
  const scoreAParsed = useMemo(() => Math.max(0, Math.min(0xffffffff, Number(scoreA || 0))) >>> 0, [scoreA]);
  const scoreBParsed = useMemo(() => Math.max(0, Math.min(0xffffffff, Number(scoreB || 0))) >>> 0, [scoreB]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isVoid) {
        writeContract({
          chainId: mantleSepolia.id,
          address: market,
          abi: betMarketAbi,
          functionName: "voidByOwner",
        });
      } else {
        const winIdx = winner === "A" ? 0 : 1;
        writeContract({
          chainId: mantleSepolia.id,
          address: market,
          abi: betMarketAbi,
          functionName: "resolveWithScores",
          args: [winIdx, scoreAParsed, scoreBParsed],
        });
      }
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[92%] max-w-[520px] card p-6">
        <h3 className="text-xl font-semibold">Resolve Market</h3>
        <p className="secondary mb-4">{teamA} vs {teamB}</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="text-sm">
            <div className="mb-1 font-medium">Outcome</div>
            <select className="border rounded px-3 py-2 w-full" value={winner} onChange={(e) => setWinner(e.target.value as any)}>
              <option value="A">{teamA} wins</option>
              <option value="B">{teamB} wins</option>
              <option value="Void">Void (refund)</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="mb-1 font-medium">{teamA} score</div>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="0"
                inputMode="numeric"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                disabled={isVoid}
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 font-medium">{teamB} score</div>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="0"
                inputMode="numeric"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                disabled={isVoid}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={isPending || isConfirming}>
              {isPending || isConfirming ? "Submitting..." : isVoid ? "Void Market" : "Resolve"}
            </button>
          </div>
          {error && <p className="text-sm" style={{ color: "#fda4af" }}>{error.message}</p>}
          {isConfirmed && <p className="text-sm" style={{ color: "#4ade80" }}>Success!</p>}
        </form>
      </div>
    </div>
  );
}
