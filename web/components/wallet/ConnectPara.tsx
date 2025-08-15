"use client";

import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId, useBalance } from "wagmi";
import { mantleSepolia } from "@/lib/chains";
import { useModal } from "@getpara/react-sdk";

export function ConnectPara() {
  const { address, isConnected, status } = useAccount();
  const { connectors, connect, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const { data: nativeBal } = useBalance({
    address,
    chainId: mantleSepolia.id,
    // Only fetch when connected to the target chain
    query: { enabled: Boolean(address) && chainId === mantleSepolia.id },
  });
  const mntText = nativeBal ? `${Number(nativeBal.formatted).toFixed(4)} ${nativeBal.symbol}` : "—";
  const usdText = "$0.00"; // TODO: replace with Para fiat balance if available
  const { openModal } = useModal();

  const [open, setOpen] = useState(false);

  const onCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setOpen(false);
  };
  const onDeposit = () => { openModal(); setOpen(false); };
  const onWithdraw = () => { openModal(); setOpen(false); };
  const onBuy = () => { openModal(); setOpen(false); };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
          disabled={!connectors?.[0] || isConnecting}
          onClick={() => connect({ connector: connectors?.[0] })}
        >
          {isConnecting ? "Connecting..." : "Connect with Para"}
        </button>
        {connectError && <p className="text-sm text-red-600">{connectError.message}</p>}
      </div>
    );
  }

  if (chainId !== mantleSepolia.id) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">Wrong network</span>
        <button
          className="px-3 py-2 rounded-md bg-amber-500 text-white disabled:opacity-50"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: mantleSepolia.id })}
        >
          {isSwitching ? "Switching..." : "Switch to Mantle Sepolia"}
        </button>
        {switchError && <p className="text-sm text-red-600">{switchError.message}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-neutral-800 text-white hover:bg-neutral-700 focus:outline-none"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="font-semibold">{usdText}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-black text-white shadow-xl border border-neutral-800 py-2 z-50">
          <div className="px-4 pb-2 pt-1 text-sm text-neutral-300">Mantle Sepolia • {mntText}</div>
          <button className="w-full text-left px-4 py-2 hover:bg-neutral-800 flex items-center gap-2" onClick={onDeposit}>⬇️ Deposit</button>
          <button className="w-full text-left px-4 py-2 hover:bg-neutral-800 flex items-center gap-2" onClick={onWithdraw}>⬆️ Withdraw</button>
          <button className="w-full text-left px-4 py-2 hover:bg-neutral-800 flex items-center gap-2" onClick={onBuy}>💳 Buy</button>
          <div className="my-2 h-px bg-neutral-800" />
          <button className="w-full text-left px-4 py-2 hover:bg-neutral-800" onClick={() => { disconnect(); setOpen(false); }}>Logout</button>
          <button className="w-full text-left px-4 py-2 hover:bg-neutral-800" onClick={onCopy}>Copy wallet address</button>
        </div>
      )}
    </div>
  );
}
