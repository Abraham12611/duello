"use client";

import React, { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { betFactoryAbi } from "@/abis/betFactory";
import { FACTORY_ADDRESS } from "@/lib/addresses";
import { mantleSepolia } from "@/lib/chains";

type Props = {
  prefillToken?: string;
  prefillStartIso?: string; // YYYY-MM-DDTHH:mm
};

export function CreateMarketForm({ prefillToken, prefillStartIso }: Props) {
  const factory = FACTORY_ADDRESS;
  const { address } = useAccount();

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

  const [token, setToken] = useState(prefillToken ?? "");
  const [startIso, setStartIso] = useState(
    () => prefillStartIso ?? new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
  );

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factory || !isOwner) return;
    try {
      const startSec = Math.floor(new Date(startIso).getTime() / 1000);
      writeContract({
        chainId: mantleSepolia.id,
        address: factory,
        abi: betFactoryAbi,
        functionName: "createMarket",
        args: [token as `0x${string}`, BigInt(startSec)],
      });
    } catch {}
  }

  if (!factory) {
    return <div className="text-sm text-red-600">NEXT_PUBLIC_FACTORY_ADDRESS is not set.</div>;
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-medium mb-2">Create Market</h3>
      {!isOwner ? (
        <p className="text-sm text-neutral-600">Only the factory owner can create markets.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="block text-neutral-600 mb-1">Stake token address (ERC20)</span>
            <input
              className="border rounded px-2 py-2 w-full"
              placeholder="0x..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-600 mb-1">Start time (UTC)</span>
            <input
              type="datetime-local"
              className="border rounded px-2 py-2 w-full"
              value={startIso}
              onChange={(e) => setStartIso(e.target.value)}
              required
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
              disabled={isPending || isConfirming}
            >
              {isPending || isConfirming ? "Creating..." : "Create"}
            </button>
            {txHash && (
              <a
                className="text-blue-600 text-sm hover:underline"
                href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                target="_blank"
              >
                View Tx
              </a>
            )}
          </div>
          {writeError && <p className="text-sm text-red-600">{writeError.message}</p>}
          {confirmError && <p className="text-sm text-red-600">{String(confirmError)}</p>}
          {isConfirmed && <p className="text-sm text-green-700">Created! The list will update shortly.</p>}
        </form>
      )}
    </div>
  );
}
