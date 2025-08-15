import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { HeaderNav } from "@/components/ui/HeaderNav";

export const metadata: Metadata = {
  title: "Duello",
  description: "Trustless P2P betting on Mantle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <HeaderNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
