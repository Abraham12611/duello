"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";
import { ConnectPara } from "@/components/wallet/ConnectPara";
import { useAccount } from "wagmi";
import { UI_OWNER } from "@/lib/addresses";

export function HeaderNav() {
  const { address, isConnected } = useAccount();
  const isOwner = isConnected && address?.toLowerCase() === UI_OWNER.toLowerCase();

  return (
    <header className="w-full sticky top-0 z-20">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-neutral-700 bg-[var(--surfaceElevated)]">
          <Image src="/duello-logo.png" alt="Duello logo" width={28} height={28} className="object-contain rounded" />
        </Link>

        {/* Nav icons */}
        <nav className="hidden sm:flex items-center gap-3 text-sm secondary">
          <Link href="/" className="hover:text-white">Home</Link>
        </nav>

        {/* Center: Create Bet pill + Search */}
        <div className="flex-1 flex items-center justify-center gap-3">
          {isOwner && (
            <Link href="/create-market" className="btn btn-primary rounded-full px-4 py-2">+ Create Bet</Link>
          )}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full surface-elev text-sm w-[300px]">
            <span className="opacity-70">🔍</span>
            <input
              className="bg-transparent outline-none flex-1 placeholder:secondary"
              placeholder="Search..."
            />
            <span className="text-xs chip chip-elev">⌘K</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="ml-auto">
          <ConnectPara />
        </div>
      </div>
    </header>
  );
}
