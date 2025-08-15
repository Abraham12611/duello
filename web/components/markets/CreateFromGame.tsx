"use client";

import React, { useMemo, useState } from "react";
import data from "@/data/demo-game-data.json";
import { CreateMarketForm } from "@/components/markets/CreateMarketForm";

// Types based on the demo JSON shape
type Match = {
  id: string;
  startTimeUTC: string;
  venue?: string;
  homeTeam: { name: string; code: string };
  awayTeam: { name: string; code: string };
};

export function CreateFromGame() {
  const [defaultToken, setDefaultToken] = useState("");
  const [query, setQuery] = useState("");
  const [selectedStartIso, setSelectedStartIso] = useState<string | undefined>(undefined);

  const items = useMemo(() => {
    const out: Array<{
      id: string;
      label: string;
      startIso: string; // YYYY-MM-DDTHH:mm (UTC formatted)
      extra?: string;
    }> = [];

    if (!data || !Array.isArray((data as any).sports)) return out;

    for (const s of (data as any).sports as any[]) {
      const sport = s.sport as string;
      const league = s.league as string | undefined;
      const stage = s.stage as string | undefined;
      const matches: Match[] = s.matches || [];
      for (const m of matches) {
        const whenIso = new Date(m.startTimeUTC).toISOString().slice(0, 16);
        const label = `${league ?? sport}: ${m.homeTeam.code} vs ${m.awayTeam.code} — ${whenIso}Z`;
        out.push({ id: m.id, label, startIso: whenIso, extra: stage });
      }
    }

    return out;
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((it) => it.label.toLowerCase().includes(q) || it.id.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="card p-4 flex flex-col gap-3">
      <h3 className="font-medium">Create From Game</h3>
      <p className="text-sm secondary">Pick a match to prefill the start time. Optionally set a default stake token.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block secondary mb-1">Default stake token (ERC20)</span>
          <input
            className="border rounded px-2 py-2 w-full"
            placeholder="0x..."
            value={defaultToken}
            onChange={(e) => setDefaultToken(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="block secondary mb-1">Search matches</span>
          <input
            className="border rounded px-2 py-2 w-full"
            placeholder="Search by league/teams/id"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="max-h-64 overflow-auto rounded surface-elev">
        <ul className="divide-y">
          {filtered.map((it) => (
            <li key={it.id} className="p-2 flex items-center justify-between gap-2">
              <div className="text-sm">
                <div className="font-medium">{it.label}</div>
                {it.extra && <div className="text-neutral-500">{it.extra}</div>}
              </div>
              <button className="btn btn-ghost text-xs" onClick={() => setSelectedStartIso(it.startIso)} title="Prefill start time">Prefill</button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="p-3 text-sm text-neutral-500">No matches found.</li>
          )}
        </ul>
      </div>

      <CreateMarketForm prefillToken={defaultToken || undefined} prefillStartIso={selectedStartIso} />
    </div>
  );
}
