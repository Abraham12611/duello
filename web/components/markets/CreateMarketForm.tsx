"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnect, useDisconnect } from "wagmi";
import { betFactoryAbi } from "@/abis/betFactory";
import { FACTORY_ADDRESS } from "@/lib/addresses";
import { mantleSepolia } from "@/lib/chains";
import { marketStore, type Tag } from "@/lib/marketStore";
import { decodeEventLog } from "viem";

type Props = {
  prefillToken?: string;
  prefillStartIso?: string; // YYYY-MM-DDTHH:mm
};

export function CreateMarketForm({ prefillToken, prefillStartIso }: Props) {
  const factory = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  const { address, isConnected } = useAccount();
  const { connectors, connect, status: connectStatus, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const ZERO = "0x0000000000000000000000000000000000000000" as const;

  function handleConnect() {
    try {
      const paraConn = connectors.find((c) => (c as any).id === "para" || c.name?.toLowerCase() === "para") ?? connectors[0];
      if (paraConn) {
        connect({ connector: paraConn });
      }
    } catch {}
  }

  const { data: owner } = useReadContract({
    chainId: mantleSepolia.id,
    address: factory,
    abi: betFactoryAbi,
    functionName: "owner",
    query: { enabled: !!factory },
  });

  const isOwner = useMemo(() => {
    if (!address || !owner) return false;
    return address.toLowerCase() === (owner as string).toLowerCase();
  }, [address, owner]);

  const [useNative, setUseNative] = useState(false);
  const [token, setToken] = useState(prefillToken ?? "");
  const [startIso, setStartIso] = useState(() => {
    if (prefillStartIso) return prefillStartIso;
    const d = new Date(Date.now() + 5 * 60 * 1000);
    // Convert to local datetime string suitable for <input type="datetime-local">
    const tzAdjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return tzAdjusted.toISOString().slice(0, 16);
  });
  const [endIso, setEndIso] = useState(() => {
    const d = new Date(new Date(startIso).getTime() + 2 * 60 * 60 * 1000);
    const tzAdjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return tzAdjusted.toISOString().slice(0, 16);
  });

  // New fields for market metadata
  const [tag, setTag] = useState<Tag>("MLB");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [teamALogo, setTeamALogo] = useState<string | undefined>(undefined);
  const [teamBLogo, setTeamBLogo] = useState<string | undefined>(undefined);
  const [dbSaveError, setDbSaveError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, which: "A" | "B") {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      if (which === "A") setTeamALogo(dataUrl);
      else setTeamBLogo(dataUrl);
    };
    reader.readAsDataURL(f);
  }

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash, chainId: mantleSepolia.id });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factory || !isOwner || !isConnected || !address) return;
    try {
      const startSec = Math.floor(new Date(startIso).getTime() / 1000);
      const endSec = Math.floor(new Date(endIso).getTime() / 1000);
      writeContract({
        chainId: mantleSepolia.id,
        address: factory,
        abi: betFactoryAbi,
        functionName: "createMarket",
        args: [(useNative ? ZERO : (token as `0x${string}`)), BigInt(startSec), BigInt(endSec)],
      });
    } catch {}
  }

  // After confirmation, decode MarketCreated(market, token, startTime) and add to local store
  useEffect(() => {
    if (!isConfirmed || !receipt) return;
    try {
      let createdAddress: `0x${string}` | undefined;
      for (const log of receipt.logs ?? []) {
        try {
          const decoded = decodeEventLog({ abi: betFactoryAbi, data: log.data, topics: log.topics });
          if (decoded.eventName === "MarketCreated") {
            const m = decoded.args?.market as `0x${string}` | undefined;
            if (m) {
              createdAddress = m;
              break;
            }
          }
        } catch {}
      }
      if (!createdAddress) return;
      // Build start time ISO in UTC
      const startIsoUtc = new Date(startIso).toISOString();
      const endIsoUtc = new Date(endIso).toISOString();
      marketStore.add({
        address: createdAddress,
        token: (useNative ? ZERO : (token as `0x${string}`)),
        startIso: startIsoUtc,
        endIso: endIsoUtc,
        tag,
        teamA: { name: teamAName || "Team A", logoDataUrl: teamALogo },
        teamB: { name: teamBName || "Team B", logoDataUrl: teamBLogo },
      });
      // Persist to DB in background
      void (async () => {
        try {
          const res = await fetch("/api/markets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: createdAddress,
              token: useNative ? ZERO : token,
              startIso: startIsoUtc,
              endIso: endIsoUtc,
              tag,
              teamAName: teamAName || "Team A",
              teamALogo,
              teamBName: teamBName || "Team B",
              teamBLogo,
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            console.error("Failed to persist market to DB:", res.status, text);
            setDbSaveError(`Warning: could not save to database (${res.status}). Others may not see this market.`);
          } else {
            setDbSaveError(null);
          }
        } catch (e) {
          console.error("POST /api/markets network error", e);
          setDbSaveError("Warning: network error while saving to database. Others may not see this market.");
        }
      })();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, receipt]);

  if (!factory) {
    return <div className="text-sm text-red-600">NEXT_PUBLIC_FACTORY_ADDRESS is not set.</div>;
  }

  return (
    <div className="card p-4">
      <h3 className="font-medium mb-2">Create Market</h3>
      {!address || !isConnected ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm secondary">Connect to Para to continue.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-primary disabled:opacity-50"
              onClick={handleConnect}
              disabled={connectStatus === "pending"}
            >
              {connectStatus === "pending" ? "Connecting..." : "Connect Para"}
            </button>
            {!!address && (
              <button type="button" className="btn btn-secondary" onClick={() => disconnect()}>Disconnect</button>
            )}
          </div>
          {connectError && <p className="text-sm" style={{ color: "#fda4af" }}>{connectError.message}</p>}
        </div>
      ) : !isOwner ? (
        <p className="text-sm secondary">Only the factory owner can create markets.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block secondary mb-1">Tag</span>
              <select className="border rounded px-2 py-2 w-full" value={tag} onChange={(e) => setTag(e.target.value as Tag)}>
                <option value="MLB">MLB</option>
                <option value="NBA">NBA</option>
                <option value="NHL">NHL</option>
                <option value="PREMIER LEAGUE">PREMIER LEAGUE</option>
                <option value="LA LIGA">LA LIGA</option>
                <option value="UEFA CHAMPIONS LEAGUE">UEFA CHAMPIONS LEAGUE</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block secondary mb-1">Start time (UTC)</span>
              <input
                type="datetime-local"
                className="border rounded px-2 py-2 w-full"
                value={startIso}
                onChange={(e) => setStartIso(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block secondary mb-1">End time (UTC)</span>
              <input
                type="datetime-local"
                className="border rounded px-2 py-2 w-full"
                value={endIso}
                onChange={(e) => setEndIso(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block secondary mb-1">Team A name</span>
              <input className="border rounded px-2 py-2 w-full" value={teamAName} onChange={(e) => setTeamAName(e.target.value)} placeholder="e.g. New York Yankees" />
            </label>
            <label className="text-sm">
              <span className="block secondary mb-1">Team B name</span>
              <input className="border rounded px-2 py-2 w-full" value={teamBName} onChange={(e) => setTeamBName(e.target.value)} placeholder="e.g. Boston Red Sox" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block secondary mb-1">Team A logo</span>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e, "A")} />
              {teamALogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamALogo} alt="Team A" className="mt-2 w-12 h-12 rounded-full object-cover border-2 border-[var(--green)]" />
              )}
            </label>
            <label className="text-sm">
              <span className="block secondary mb-1">Team B logo</span>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e, "B")} />
              {teamBLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamBLogo} alt="Team B" className="mt-2 w-12 h-12 rounded-full object-cover border-2 border-[var(--green)]" />
              )}
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useNative} onChange={(e) => setUseNative(e.target.checked)} />
            <span>Use native MNT (no ERC20 token)</span>
          </label>
          <label className="text-sm">
            <span className="block secondary mb-1">Stake token address (ERC20)</span>
            <input
              className="border rounded px-2 py-2 w-full"
              placeholder="0x..."
              value={useNative ? ZERO : token}
              onChange={(e) => setToken(e.target.value)}
              disabled={useNative}
              required={!useNative}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn btn-primary disabled:opacity-50"
              disabled={isPending || isConfirming || !isConnected}
            >
              {isPending || isConfirming ? "Creating..." : "Create"}
            </button>
            {txHash && (
              <a
                className="text-blue-400 text-sm hover:underline"
                href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                target="_blank"
              >
                View Tx
              </a>
            )}
          </div>
          {writeError && <p className="text-sm" style={{ color: "#fda4af" }}>{writeError.message}</p>}
          {confirmError && <p className="text-sm" style={{ color: "#fda4af" }}>{String(confirmError)}</p>}
          {dbSaveError && <p className="text-sm" style={{ color: "#fda4af" }}>{dbSaveError}</p>}
          {isConfirmed && <p className="text-sm" style={{ color: "#4ade80" }}>Created! The list will update shortly.</p>}
        </form>
      )}
    </div>
  );
}

