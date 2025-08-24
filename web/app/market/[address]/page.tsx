"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { betMarketAbi } from "@/abis/betMarket";
import { mantleSepolia } from "@/lib/chains";
import { formatEther, parseEther } from "viem";
import { ResolveModal } from "@/components/ui/owner/ResolveModal";
import { ORACLE_ADDRESS } from "@/lib/addresses";
import { api3ProxyAbi } from "@/abis/api3Proxy";

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

export default function MarketDetailsPage() {
  const params = useParams<{ address: string }>();
  const market = (params?.address as `0x${string}`) ?? ("0x" as const);
  const { address: user } = useAccount();
  // Local refresh key to force refetch of reads when key events occur
  const [refreshKey, setRefreshKey] = useState(0);
  // Local flags in case an event is seen but state read lags
  const [sawResolved, setSawResolved] = useState(false);
  const [sawVoided, setSawVoided] = useState(false);

  // Periodic clock to refresh boundary-dependent UI (start/end/void)
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: token } = useReadContract({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    functionName: "token",
    query: { enabled: !!market },
  });
  const { data: startTime } = useReadContract({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    functionName: "startTime",
    query: { enabled: !!market },
  });
  const { data: endTime } = useReadContract({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    functionName: "endTime",
    query: { enabled: !!market },
  });
  const { data: state } = useReadContract({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    functionName: "state",
    // Scope key to force refetch when refreshKey or clock tick changes
    scopeKey: `state-${refreshKey}-${Math.floor(clock / 1000)}`,
    query: { enabled: !!market, refetchInterval: 1000, staleTime: 0 },
  });
  const { data: totals } = useReadContracts({
    allowFailure: true,
    contracts: [
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "totalA" },
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "totalB" },
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "owner" },
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "winningSide" },
    ],
    query: { enabled: !!market },
  });

  const totalA = totals?.[0]?.status === "success" ? (totals?.[0]?.result as bigint) : 0n;
  const totalB = totals?.[1]?.status === "success" ? (totals?.[1]?.result as bigint) : 0n;
  const owner = totals?.[2]?.status === "success" ? (totals?.[2]?.result as `0x${string}`) : undefined;
  const winning = totals?.[3]?.status === "success" ? (totals?.[3]?.result as bigint) : undefined;

  const { data: scores } = useReadContracts({
    allowFailure: true,
    contracts: [
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "scoreA" },
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "scoreB" },
    ],
    query: { enabled: !!market },
  });
  const scoreAVal = scores?.[0]?.status === "success" ? Number(scores?.[0]?.result as bigint) : undefined;
  const scoreBVal = scores?.[1]?.status === "success" ? Number(scores?.[1]?.result as bigint) : undefined;

  // API3 price feed (USD per MNT, 18 decimals). Only enabled when ORACLE_ADDRESS is set.
  const { data: oracleData } = useReadContract({
    chainId: mantleSepolia.id,
    address: (ORACLE_ADDRESS || market) as `0x${string}`,
    abi: api3ProxyAbi,
    functionName: "read",
    query: { enabled: !!ORACLE_ADDRESS && ORACLE_ADDRESS.length > 0 },
  });
  const oraclePrice = (Array.isArray(oracleData) ? (oracleData[0] as bigint) : undefined);
  const oracleTs = (Array.isArray(oracleData) ? (oracleData[1] as bigint) : undefined);

  const { data: stakes } = useReadContracts({
    allowFailure: true,
    contracts: [
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "stakeOf", args: [user ?? "0x0000000000000000000000000000000000000000", 0] },
      { chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "stakeOf", args: [user ?? "0x0000000000000000000000000000000000000000", 1] },
    ],
    query: { enabled: !!market && !!user },
  });
  const myA = stakes?.[0]?.status === "success" ? (stakes?.[0]?.result as bigint) : 0n;
  const myB = stakes?.[1]?.status === "success" ? (stakes?.[1]?.result as bigint) : 0n;

  const isOwner = useMemo(() => !!owner && !!user && owner.toLowerCase() === user.toLowerCase(), [owner, user]);
  const isOpen = Number(state ?? -1) === 0;
  const isLocked = Number(state ?? -1) === 1;
  const isResolved = Number(state ?? -1) === 2;
  const isVoided = Number(state ?? -1) === 3;

  const nowSec = Math.floor(clock / 1000);
  const startSec = Number((startTime as bigint) ?? 0n);
  const endSec = Number((endTime as bigint) ?? 0n);
  const canDeposit = isOpen && nowSec < startSec;
  const canLock = isOpen && nowSec >= startSec;
  const depositBoundarySoon = startSec > 0 && startSec - nowSec <= 5; // avoid race near start
  const canDepositUi = canDeposit && !depositBoundarySoon;
  const canVoidAfterEnd = endSec > 0 && nowSec >= endSec && !isResolved && !isVoided;

  const [side, setSide] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"MNT" | "USD">("MNT");

  const ONE = 10n ** 18n;
  const depositWei = useMemo(() => {
    try {
      const trimmed = (amount || "0").trim();
      if (inputMode === "MNT") {
        return parseEther(trimmed);
      }
      if (!oraclePrice) return 0n;
      const usdScaled = parseEther(trimmed); // 18 decimals
      return (usdScaled * ONE) / oraclePrice; // floor
    } catch {
      return 0n;
    }
  }, [amount, inputMode, oraclePrice]);

  const { writeContract, data: writeHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed, error: confirmError } = useWaitForTransactionReceipt({ hash: writeHash });

  // Refresh on key events
  useWatchContractEvent({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    eventName: "Deposited",
    onLogs: () => {
      // no-op; read hooks will refetch due to cache invalidation from wagmi v2 when enabled; otherwise, rely on user interactions
    },
  });
  useWatchContractEvent({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    eventName: "Locked",
    onLogs: () => setRefreshKey((k) => k + 1),
  });
  useWatchContractEvent({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    eventName: "Resolved",
    onLogs: () => {
      setSawResolved(true);
      setRefreshKey((k) => k + 1);
    },
  });
  useWatchContractEvent({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    eventName: "Voided",
    onLogs: () => {
      setSawVoided(true);
      setRefreshKey((k) => k + 1);
    },
  });
  useWatchContractEvent({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    eventName: "Claimed",
    onLogs: () => setRefreshKey((k) => k + 1),
  });

  function doDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!canDeposit) return;
    try {
      const value = depositWei;
      if (value <= 0n) return;
      writeContract({
        chainId: mantleSepolia.id,
        address: market,
        abi: betMarketAbi,
        functionName: "deposit",
        args: [side],
        value,
      });
    } catch {}
  }

  function doLock() {
    if (!canLock) return;
    writeContract({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "lock" });
  }

  function doResolve(winner: 0 | 1) {
    if (!isOwner || !isLocked) return;
    writeContract({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "resolve", args: [winner] });
  }

  function doVoidAfterEnd() {
    if (!canVoidAfterEnd) return;
    writeContract({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "voidAfterEnd" });
  }

  function doClaim() {
    if (!(isResolved || isVoided || sawResolved || sawVoided)) return;
    writeContract({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, functionName: "claim" });
  }

  const zero = "0x0000000000000000000000000000000000000000";
  const isNative = (token as string)?.toLowerCase?.() === zero;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-2">Market Details</h2>
      <div className="text-sm text-neutral-700 space-y-1 mb-4">
        <div><span className="text-neutral-500">Address:</span> {market}</div>
        <div><span className="text-neutral-500">Stake Token:</span> {isNative ? "MNT (native)" : (token as string)}</div>
        <div><span className="text-neutral-500">Start:</span> {startTime ? new Date(Number(startTime) * 1000).toLocaleString() : "-"}</div>
        <div><span className="text-neutral-500">End:</span> {endTime ? new Date(Number(endTime) * 1000).toLocaleString() : "-"}</div>
        <div><span className="text-neutral-500">State:</span> {stateLabel(state as bigint)}</div>
        {isResolved && (
          <div><span className="text-neutral-500">Winner:</span> {Number(winning) === 0 ? "Side A" : "Side B"}</div>
        )}
        {isResolved && (
          <div><span className="text-neutral-500">Score:</span> {scoreAVal ?? "-"} - {scoreBVal ?? "-"}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="border rounded p-3">
          <div className="font-medium mb-1">Side A</div>
          <div>Total: {formatEther(totalA)} MNT</div>
          <div>Your stake: {formatEther(myA)} MNT</div>
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-1">Side B</div>
          <div>Total: {formatEther(totalB)} MNT</div>
          <div>Your stake: {formatEther(myB)} MNT</div>
        </div>
      </div>

      <div className="border rounded p-3 mb-3">
        <div className="font-medium mb-2">Deposit</div>
        {!isNative && (
          <p className="text-xs text-amber-700 mb-2">This market expects native MNT for MVP. If a token was set, deposits are disabled.</p>
        )}
        <form onSubmit={doDeposit} className="flex flex-col gap-3">
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" name="side" checked={side === 0} onChange={() => setSide(0)} /> Side A
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="side" checked={side === 1} onChange={() => setSide(1)} /> Side B
            </label>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1">
              <input type="radio" name="unit" checked={inputMode === "MNT"} onChange={() => setInputMode("MNT")} /> MNT
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="unit" checked={inputMode === "USD"} onChange={() => setInputMode("USD")} disabled={!oraclePrice} /> USD
            </label>
            {inputMode === "USD" && !oraclePrice && <span className="secondary">Price loading…</span>}
          </div>
          <input
            className="border rounded px-2 py-2"
            placeholder={inputMode === "USD" ? "Amount in USD" : "Amount in MNT"}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {inputMode === "USD" && oraclePrice && (
            <div className="text-xs text-neutral-600">
              <div>Oracle: ${formatEther(oraclePrice)} per MNT{oracleTs ? ` as of ${new Date(Number(oracleTs) * 1000).toLocaleString()}` : ""}</div>
              <div>Est. deposit: {formatEther(depositWei)} MNT</div>
            </div>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
            disabled={!canDepositUi || !isNative || isPending || confirming || (inputMode === "USD" && !oraclePrice) || depositWei <= 0n}
          >
            {isPending || confirming
              ? "Depositing..."
              : canDepositUi
              ? "Deposit"
              : depositBoundarySoon
              ? "Deposits closing (wait)"
              : "Deposits closed"}
          </button>
          {writeError && (
            <div className="text-sm text-red-600 whitespace-pre-wrap">
              {(() => {
                const e: any = writeError as any;
                return e?.cause?.shortMessage || e?.shortMessage || e?.message || String(e);
              })()}
            </div>
          )}
          {confirmError && <p className="text-sm text-red-600">{String(confirmError)}</p>}
          {confirmed && <p className="text-sm text-green-700">Tx confirmed.</p>}
        </form>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          className="px-3 py-2 rounded border disabled:opacity-50"
          disabled={!canLock || isPending || confirming}
          onClick={doLock}
        >
          Lock (after start)
        </button>
        {isOwner && isLocked && (
          <button className="px-3 py-2 rounded border" onClick={() => setResolveOpen(true)}>Resolve</button>
        )}
        {canVoidAfterEnd && (
          <button className="px-3 py-2 rounded border" onClick={doVoidAfterEnd} disabled={isPending || confirming}>Void (past end)</button>
        )}
        {((isResolved || isVoided) || (sawResolved || sawVoided)) && (
          <button className="px-3 py-2 rounded border" onClick={doClaim} disabled={isPending || confirming}>Claim</button>
        )}
      </div>

      <div className="text-xs text-neutral-500">
        Notes:
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Per Mantle guidance (see docs/mantle-docs.txt), transactions use EIP-1559. Wallet sets fees dynamically.</li>
          <li>Para Wagmi integration is used for wallet and tx flow (see docs/get-para-docs.txt).</li>
        </ul>
        <div className="mt-2">
          <div className="font-medium">Debug</div>
          <div>state={Number(state ?? -1)} now={nowSec} start={startSec} isNative={String(isNative)} sawResolved={String(sawResolved)} sawVoided={String(sawVoided)}</div>
        </div>
      </div>
    </div>
  );
}
