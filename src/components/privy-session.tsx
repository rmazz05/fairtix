"use client";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import {
  useWallets,
  useSignTransaction,
  toSolanaWalletConnectors,
} from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { SessionContext, useSession } from "./session";
import type { ReactNode } from "react";

const connectors = toSolanaWalletConnectors();
export default function PrivySession({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#FF4A1C",
          walletChainType: "solana-only",
        },
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } },
        externalWallets: { solana: { connectors } },
        solana: {
          rpcs: {
            "solana:devnet": {
              rpc: createSolanaRpc("https://api.devnet.solana.com"),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                "wss://api.devnet.solana.com",
              ),
            },
          },
        },
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  );
}
function Bridge({ children }: { children: ReactNode }) {
  const demo = useSession(),
    privy = usePrivy(),
    { wallets, ready: walletsReady } = useWallets(),
    { signTransaction } = useSignTransaction();
  const wallet = wallets[0];
  return (
    <SessionContext
      value={{
        ...demo,
        emailEnabled: true,
        ready:
          privy.ready &&
          demo.ready &&
          (!privy.authenticated || (walletsReady && !!wallet)),
        address: privy.authenticated ? wallet?.address || null : demo.address,
        label: privy.authenticated
          ? privy.user?.email?.address || "Your account"
          : demo.label,
        mode: privy.authenticated ? "email" : "demo",
        login: privy.login,
        selectDemo: async (account) => {
          if (privy.authenticated)
            throw new Error("Sign out before switching to a demo account.");
          return demo.selectDemo(account);
        },
        switchDemo: async () => {
          if (privy.authenticated)
            throw new Error("Sign out before switching to a demo account.");
          return demo.switchDemo();
        },
        startDemo: async () => {
          if (!privy.authenticated) return demo.startDemo();
          if (!wallet)
            throw new Error(
              "Your wallet is still being prepared. Try again in a moment.",
            );
          return wallet.address;
        },
        logout: () => {
          demo.logout();
          void privy.logout();
        },
        sign: async (wire) => {
          if (!privy.authenticated) return demo.sign(wire);
          if (!wallet)
            throw new Error(
              "Your wallet is still being prepared. Try again in a moment.",
            );
          const { signedTransaction } = await signTransaction({
            transaction: wire,
            wallet,
            chain: "solana:devnet",
            options: { uiOptions: { showWalletUIs: false } },
          });
          return signedTransaction;
        },
      }}
    >
      {children}
    </SessionContext>
  );
}
