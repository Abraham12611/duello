"use client";

import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Environment, ParaProvider, useClient } from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { paraConnector } from "@getpara/wagmi-v2-integration";
import { WagmiProvider, createConfig } from "wagmi";
import type { CreateConnectorFn } from "wagmi";
import { http, fallback } from "viem";
import { mantleSepolia } from "@/lib/chains";

const queryClient = new QueryClient();

function getParaEnv(): Environment {
  const v = process.env.NEXT_PUBLIC_PARA_ENV?.toUpperCase();
  switch (v) {
    case "PROD":
    case "PRODUCTION":
      return Environment.PROD as Environment;
    case "BETA":
    default:
      return Environment.BETA as Environment;
  }
}

function WagmiWrapper({ children }: { children: React.ReactNode }) {
  const para = useClient();

  const wagmiConfig = useMemo(() => {
    if (!para) return null;
    const connector = paraConnector({
      para,
      chains: [mantleSepolia],
      appName: process.env.NEXT_PUBLIC_APP_NAME || "Duello",
      idOverride: "para",
      nameOverride: "Para",
      options: {},
      queryClient,
    }) as unknown as CreateConnectorFn;

    const defaultUrl = mantleSepolia.rpcUrls.default.http[0]!;
    const envUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const urls = Array.from(new Set([envUrl, defaultUrl].filter(Boolean))) as string[];
    return createConfig({
      chains: [mantleSepolia],
      connectors: [connector],
      transports: {
        // Increase timeout & retries and use fallback across provided URLs
        [mantleSepolia.id]: urls.length > 1
          ? fallback(urls.map((u) => http(u, { timeout: 30_000, retryCount: 3 })))
          : http(urls[0]!, { timeout: 30_000, retryCount: 3 }),
      },
    });
  }, [para]);

  if (!wagmiConfig) return <>{children}</>;
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY || "",
          env: getParaEnv(),
        }}
        config={{
          appName: process.env.NEXT_PUBLIC_APP_NAME || "Duello",
        }}
        // Enable Para Modal with payment flows (Buy/Receive/Withdraw)
        paraModalConfig={{
          // You can jump to a specific step using openModal({ currentStepOverride: "ADD_FUNDS_BUY" | "ADD_FUNDS_RECEIVE" | "ADD_FUNDS_WITHDRAW" })
        }}
      >
        <WagmiWrapper>{children}</WagmiWrapper>
      </ParaProvider>
    </QueryClientProvider>
  );
}
