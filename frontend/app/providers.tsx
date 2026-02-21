"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { OG_CHAIN } from "@/lib/constants";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) return <>{children}</>;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#00ff41",
        },
        defaultChain: OG_CHAIN,
        supportedChains: [OG_CHAIN],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
