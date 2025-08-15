"use client";

import React, { useMemo, useState } from "react";
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
  const { data: state } = useReadContract({
    chainId: mantleSepolia.id,
    address: market,
    abi: betMarketAbi,
    functionName: "state",
    query: { enabled: !!market },
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

  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = Number((startTime as bigint) ?? 0n);
  const canDeposit = isOpen && nowSec < startSec;
  const canLock = isOpen && nowSec >= startSec;
  const depositBoundarySoon = startSec > 0 && startSec - nowSec <= 5; // avoid race near start
  const canDepositUi = canDeposit && !depositBoundarySoon;

  const [side, setSide] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("");

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
  useWatchContractEvent({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, eventName: "Locked" });
  useWatchContractEvent({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, eventName: "Resolved" });
  useWatchContractEvent({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, eventName: "Voided" });
  useWatchContractEvent({ chainId: mantleSepolia.id, address: market, abi: betMarketAbi, eventName: "Claimed" });

  function doDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!canDeposit) return;
    try {
      const value = parseEther((amount || "0").trim());
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

  function doClaim() {
    if (!(isResolved || isVoided)) return;
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
        <div><span className="text-neutral-500">State:</span> {stateLabel(state as bigint)}</div>
        {isResolved && (
          <div><span className="text-neutral-500">Winner:</span> {Number(winning) === 0 ? "Side A" : "Side B"}</div>
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
        <div className="font-medium mb-2">Deposit (MNT)</div>
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
          <input
            className="border rounded px-2 py-2"
            placeholder="Amount in MNT"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
            disabled={!canDepositUi || !isNative || isPending || confirming}
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
          <>
            <button className="px-3 py-2 rounded border" onClick={() => doResolve(0)}>Resolve A</button>
            <button className="px-3 py-2 rounded border" onClick={() => doResolve(1)}>Resolve B</button>
          </>
        )}
        {(isResolved || isVoided) && (
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
          <div>state={Number(state ?? -1)} now={nowSec} start={startSec} isNative={String(isNative)}</div>
        </div>
      </div>
    </div>
  );
}
