"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { UI_OWNER } from "@/lib/addresses";
import { useMarkets, marketStore, type Tag } from "@/lib/marketStore";
import { betMarketAbi } from "@/abis/betMarket";
import { mantleSepolia } from "@/lib/chains";
import { BetModal } from "./bet/BetModal";
import { ResolveModal } from "./owner/ResolveModal";
import { ViewBetModal, type ViewBet } from "./bet/ViewBetModal";

function DayTime({ iso }: { iso: string }) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex flex-col gap-1 min-w-[72px]">
      <div className="text-[13px] secondary">{day}</div>
      <div className="text-[13px] secondary">{time}</div>
    </div>
  );
}

function TeamBadge({ name, logo }: { name: string; logo?: string }) {
  const initials = useMemo(() => name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase(), [name]);
  return (
    <div className="w-8 h-8 rounded-full surface-elev flex items-center justify-center text-xs font-semibold mr-2 overflow-hidden border-2 border-[var(--green)]">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function TeamRow(props: { team: string; logo?: string; onCreateBet?: () => void; onViewBet?: () => void; hasBet?: boolean }) {
  const { team, logo, onCreateBet, onViewBet, hasBet } = props;
  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-md hover:bg-[var(--surfaceElevated)] transition">
      <div className="flex items-center">
        <TeamBadge name={team} logo={logo} />
        <div className="text-[15px] font-medium">{team}</div>
      </div>
      {hasBet && onViewBet ? (
        <button className="btn btn-ghost text-xs" onClick={onViewBet}>View Bet</button>
      ) : onCreateBet ? (
        <button className="btn btn-ghost text-xs" onClick={onCreateBet}>+ Create Bet</button>
      ) : (
        <span className="btn btn-ghost text-xs opacity-60 cursor-not-allowed">+ Create Bet</span>
      )}
    </div>
  );
}

export function GameSchedule({ tag }: { tag: Tag }) {
  const markets = useMarkets();
  // Hydrate from DB on first load (always fetch to sync server -> local)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/markets", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text();
          console.error("GET /api/markets failed:", res.status, text);
          return;
        }
        const data = await res.json();
        const list = (data?.markets ?? []) as Array<{
          address: `0x${string}`;
          token: `0x${string}`;
          startIso: string;
          endIso?: string;
          tag: Tag;
          teamA: { name: string; logoDataUrl?: string };
          teamB: { name: string; logoDataUrl?: string };
        }>;
        for (const m of list) {
          marketStore.add(m);
        }
      } catch (e) {
        console.error("GET /api/markets network error", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const filtered = markets.filter((m) => m.tag === tag);
  // Split into two columns for layout
  const left = filtered.filter((_, i) => i % 2 === 0);
  const right = filtered.filter((_, i) => i % 2 === 1);
  const { address: user, isConnected } = useAccount();
  const isOwner = isConnected && user?.toLowerCase() === UI_OWNER.toLowerCase();
  const { writeContract } = useWriteContract();
  const [betCtx, setBetCtx] = useState<
    | { market: `0x${string}`; team: string; opponent: string; side: 0 | 1 }
    | null
  >(null);
  const [resolveCtx, setResolveCtx] = useState<
    | { market: `0x${string}`; teamA: string; teamB: string }
    | null
  >(null);
  // Remember the last bet placed per market+side for this session
  const [lastBets, setLastBets] = useState<Record<string, { amount: number; odds: number; payout: number; team: string; opponent: string }>>({});
  const [viewBet, setViewBet] = useState<ViewBet | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pb-10">
      {/* Section header */}
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{tag} Games</h2>
          <span className="chip chip-elev">Moneyline</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-[15px] font-semibold">Upcoming Games</h3>
        <span className="chip chip-green">Tap team to bet</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="card p-3">
          {left.map((m) => (
            <div key={m.address} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between px-3 py-2">
                <DayTime iso={m.startIso} />
                <span className="text-xs secondary">Upcoming</span>
              </div>
              <div className="rounded-md overflow-hidden">
                <TeamRow
                  team={m.teamA.name}
                  logo={m.teamA.logoDataUrl}
                  hasBet={!!lastBets[`${m.address}-0`]}
                  onViewBet={lastBets[`${m.address}-0`] ? () => setViewBet({ market: m.address, team: m.teamA.name, opponent: m.teamB.name, amount: lastBets[`${m.address}-0`].amount, odds: lastBets[`${m.address}-0`].odds, payout: lastBets[`${m.address}-0`].payout }) : undefined}
                  onCreateBet={!lastBets[`${m.address}-0`] ? () => setBetCtx({ market: m.address, team: m.teamA.name, opponent: m.teamB.name, side: 0 }) : undefined}
                />
                <TeamRow
                  team={m.teamB.name}
                  logo={m.teamB.logoDataUrl}
                  hasBet={!!lastBets[`${m.address}-1`]}
                  onViewBet={lastBets[`${m.address}-1`] ? () => setViewBet({ market: m.address, team: m.teamB.name, opponent: m.teamA.name, amount: lastBets[`${m.address}-1`].amount, odds: lastBets[`${m.address}-1`].odds, payout: lastBets[`${m.address}-1`].payout }) : undefined}
                  onCreateBet={!lastBets[`${m.address}-1`] ? () => setBetCtx({ market: m.address, team: m.teamB.name, opponent: m.teamA.name, side: 1 }) : undefined}
                />
                {isOwner && (
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "lock" })}
                    >Lock</button>
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => setResolveCtx({ market: m.address, teamA: m.teamA.name, teamB: m.teamB.name })}
                    >Resolve</button>
                    <button className="btn btn-ghost text-xs" onClick={async () => {
                      try {
                        const res = await fetch(`/api/markets?address=${m.address}`, { method: "DELETE" });
                        if (res.ok) {
                          marketStore.remove(m.address);
                        } else {
                          const text = await res.text().catch(() => "");
                          console.error("DELETE /api/markets failed:", res.status, text);
                          alert("Failed to delete market from database. Please try again.");
                        }
                      } catch (e) {
                        console.error("DELETE /api/markets network error", e);
                        alert("Network error deleting market. Please check your connection and try again.");
                      }
                    }}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="card p-3">
          {right.map((m) => (
            <div key={m.address} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between px-3 py-2">
                <DayTime iso={m.startIso} />
                <span className="text-xs secondary">Upcoming</span>
              </div>
              <div className="rounded-md overflow-hidden">
                <TeamRow
                  team={m.teamA.name}
                  logo={m.teamA.logoDataUrl}
                  hasBet={!!lastBets[`${m.address}-0`]}
                  onViewBet={lastBets[`${m.address}-0`] ? () => setViewBet({ market: m.address, team: m.teamA.name, opponent: m.teamB.name, amount: lastBets[`${m.address}-0`].amount, odds: lastBets[`${m.address}-0`].odds, payout: lastBets[`${m.address}-0`].payout }) : undefined}
                  onCreateBet={!lastBets[`${m.address}-0`] ? () => setBetCtx({ market: m.address, team: m.teamA.name, opponent: m.teamB.name, side: 0 }) : undefined}
                />
                <TeamRow
                  team={m.teamB.name}
                  logo={m.teamB.logoDataUrl}
                  hasBet={!!lastBets[`${m.address}-1`]}
                  onViewBet={lastBets[`${m.address}-1`] ? () => setViewBet({ market: m.address, team: m.teamB.name, opponent: m.teamA.name, amount: lastBets[`${m.address}-1`].amount, odds: lastBets[`${m.address}-1`].odds, payout: lastBets[`${m.address}-1`].payout }) : undefined}
                  onCreateBet={!lastBets[`${m.address}-1`] ? () => setBetCtx({ market: m.address, team: m.teamB.name, opponent: m.teamA.name, side: 1 }) : undefined}
                />
                {isOwner && (
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "lock" })}
                    >Lock</button>
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => setResolveCtx({ market: m.address, teamA: m.teamA.name, teamB: m.teamB.name })}
                    >Resolve</button>
                    <button className="btn btn-ghost text-xs" onClick={async () => {
                      try {
                        const res = await fetch(`/api/markets?address=${m.address}`, { method: "DELETE" });
                        if (res.ok) {
                          marketStore.remove(m.address);
                        } else {
                          const text = await res.text().catch(() => "");
                          console.error("DELETE /api/markets failed:", res.status, text);
                          alert("Failed to delete market from database. Please try again.");
                        }
                      } catch (e) {
                        console.error("DELETE /api/markets network error", e);
                        alert("Network error deleting market. Please check your connection and try again.");
                      }
                    }}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {betCtx && (
        <BetModal
          open={!!betCtx}
          onClose={() => setBetCtx(null)}
          market={betCtx.market}
          team={betCtx.team}
          opponent={betCtx.opponent}
          side={betCtx.side}
          onConfirmed={({ amount, odds, payout }) => {
            if (!betCtx) return;
            const key = `${betCtx.market}-${betCtx.side}`;
            setLastBets((prev) => ({
              ...prev,
              [key]: { amount, odds, payout, team: betCtx.team, opponent: betCtx.opponent },
            }));
          }}
        />
      )}

      {resolveCtx && (
        <ResolveModal
          open={!!resolveCtx}
          onClose={() => setResolveCtx(null)}
          market={resolveCtx.market}
          teamA={resolveCtx.teamA}
          teamB={resolveCtx.teamB}
        />
      )}

      {viewBet && (
        <ViewBetModal
          open={!!viewBet}
          onClose={() => setViewBet(null)}
          bet={viewBet}
        />
      )}
    </div>
  );
}

