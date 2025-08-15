"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { UI_OWNER } from "@/lib/addresses";
import { useMarkets, marketStore, type Tag } from "@/lib/marketStore";
import { betMarketAbi } from "@/abis/betMarket";
import { mantleSepolia } from "@/lib/chains";
import { BetModal } from "./bet/BetModal";

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

function TeamRow(props: { team: string; logo?: string; onCreateBet?: () => void }) {
  const { team, logo, onCreateBet } = props;
  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-md hover:bg-[var(--surfaceElevated)] transition">
      <div className="flex items-center">
        <TeamBadge name={team} logo={logo} />
        <div className="text-[15px] font-medium">{team}</div>
      </div>
      {onCreateBet ? (
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
                  onCreateBet={() => setBetCtx({ market: m.address, team: m.teamA.name, opponent: m.teamB.name, side: 0 })}
                />
                <TeamRow
                  team={m.teamB.name}
                  logo={m.teamB.logoDataUrl}
                  onCreateBet={() => setBetCtx({ market: m.address, team: m.teamB.name, opponent: m.teamA.name, side: 1 })}
                />
                {isOwner && (
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "lock" })}
                    >Lock</button>
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "resolve", args: [0] })}
                    >Resolve A</button>
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "resolve", args: [1] })}
                    >Resolve B</button>
                    <button className="btn btn-ghost text-xs" onClick={() => marketStore.remove(m.address)}>Delete</button>
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
                  onCreateBet={() => setBetCtx({ market: m.address, team: m.teamA.name, opponent: m.teamB.name, side: 0 })}
                />
                <TeamRow
                  team={m.teamB.name}
                  logo={m.teamB.logoDataUrl}
                  onCreateBet={() => setBetCtx({ market: m.address, team: m.teamB.name, opponent: m.teamA.name, side: 1 })}
                />
                {isOwner && (
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "lock" })}
                    >Lock</button>
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "resolve", args: [0] })}
                    >Resolve A</button>
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => writeContract({ chainId: mantleSepolia.id, address: m.address, abi: betMarketAbi, functionName: "resolve", args: [1] })}
                    >Resolve B</button>
                    <button className="btn btn-ghost text-xs" onClick={() => marketStore.remove(m.address)}>Delete</button>
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
        />
      )}
    </div>
  );
}

