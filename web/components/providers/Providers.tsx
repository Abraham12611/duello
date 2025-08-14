"use client";

import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Environment, ParaProvider, useClient } from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { paraConnector } from "@getpara/wagmi-v2-integration";
import { WagmiProvider, createConfig, http } from "wagmi";
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
    });

    return createConfig({
      chains: [mantleSepolia],
      connectors: [connector],
      transports: {
        [mantleSepolia.id]: http(mantleSepolia.rpcUrls.default.http[0]!),
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
      >
        <WagmiWrapper>{children}</WagmiWrapper>
      </ParaProvider>
    </QueryClientProvider>
  );
}
