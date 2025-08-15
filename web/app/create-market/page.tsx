"use client";

import React, { useMemo } from "react";
import { useAccount } from "wagmi";
import { UI_OWNER } from "@/lib/addresses";
import { ConnectPara } from "@/components/wallet/ConnectPara";
import { CreateFromGame } from "@/components/markets/CreateFromGame";

export default function CreateMarketPage() {
  const { address, isConnected } = useAccount();
  const isOwner = useMemo(() => {
    if (!address) return false;
    return address.toLowerCase() === UI_OWNER.toLowerCase();
  }, [address]);

  if (!isConnected) {
    return (
      <main className="max-w-[900px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-2">Create Market</h1>
        <p className="secondary mb-4">Connect Para to continue.</p>
        <div className="surface-elev inline-block rounded-md p-3">
          <ConnectPara />
        </div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="max-w-[900px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-2">Create Market</h1>
        <div className="card p-4">
          <p className="text-sm">Only the factory owner can access this page.</p>
          <p className="text-xs secondary mt-2 break-all">Required owner: {UI_OWNER}</p>
          <p className="text-xs secondary mt-1 break-all">Connected: {address}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[900px] mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Create Market</h1>
      <CreateFromGame />
    </main>
  );
}
