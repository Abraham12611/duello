"use client";

import React, { useMemo } from "react";

export type ViewBet = {
  market: `0x${string}`;
  team: string;
  opponent: string;
  amount: number; // in native units per current UI convention
  odds: number; // e.g., +150
  payout: number; // computed client-side for display
};

type Props = {
  open: boolean;
  onClose: () => void;
  bet: ViewBet;
};

export function ViewBetModal({ open, onClose, bet }: Props) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/market/${bet.market}`;
  }, [bet.market]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[92%] max-w-[520px] card p-6">
        <h3 className="text-xl font-semibold">Your Bet - {bet.team}</h3>
        <p className="secondary mb-4">{bet.team} vs {bet.opponent}</p>

        <div className="rounded-lg p-4 mb-4" style={{ background: "#0f172a" }}>
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-80">Amount</div>
            <div className="font-semibold">{fmt(bet.amount)}</div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm opacity-80">Odds</div>
            <div className="font-semibold">{bet.odds}</div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm opacity-80">Potential Winnings</div>
            <div className="font-extrabold">{fmt(isFinite(bet.payout) ? bet.payout : 0)}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium mb-1">Share this market</div>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-3 py-2 flex-1 bg-transparent"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                } catch {}
              }}
            >Copy</button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
