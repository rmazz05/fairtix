"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Keypair, Transaction } from "@solana/web3.js";

export type Session = {
  address: string | null;
  label: string;
  mode: "demo" | "email";
  ready: boolean;
  emailEnabled: boolean;
  login: () => void;
  logout: () => void;
  startDemo: () => Promise<string>;
  switchDemo: () => Promise<string>;
  sign: (wire: Uint8Array) => Promise<Uint8Array>;
};
export const SessionContext = createContext<Session | null>(null);
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session provider is missing.");
  return value;
}
const STORAGE_KEY = "fairtix-demo-v1";
const ACCOUNTS_KEY = "fairtix-demo-v2";
export function DemoSession({ children }: { children: ReactNode }) {
  const key = useRef<Keypair | null>(null),
    [address, setAddress] = useState<string | null>(null),
    [ready, setReady] = useState(false);
  const accounts = useRef<Partial<Record<1 | 2, Keypair>>>({}),
    current = useRef<1 | 2>(1),
    [account, setAccount] = useState<1 | 2>(1);
  const persist = useCallback(() => {
    const keys = Object.fromEntries(
      Object.entries(accounts.current).map(([name, value]) => [
        name,
        [...value.secretKey],
      ]),
    );
    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify({ current: current.current, keys }),
    );
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTS_KEY),
        legacy = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        current.current = data.current === 2 ? 2 : 1;
        for (const n of [1, 2] as const)
          if (data.keys[n])
            accounts.current[n] = Keypair.fromSecretKey(
              Uint8Array.from(data.keys[n]),
            );
        key.current = accounts.current[current.current] || null;
        setAccount(current.current);
      } else if (legacy) {
        key.current = Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(legacy)),
        );
        accounts.current[1] = key.current;
        persist();
        localStorage.removeItem(STORAGE_KEY);
      }
      if (key.current) setAddress(key.current.publicKey.toBase58());
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACCOUNTS_KEY);
    }
    setReady(true);
  }, [persist]);
  const startDemo = useCallback(async () => {
    key.current ??= Keypair.generate();
    accounts.current[current.current] = key.current;
    persist();
    const value = key.current.publicKey.toBase58();
    setAddress(value);
    return value;
  }, [persist]);
  const switchDemo = useCallback(async () => {
    if (key.current) accounts.current[current.current] = key.current;
    current.current = current.current === 1 ? 2 : 1;
    accounts.current[current.current] ??= Keypair.generate();
    key.current = accounts.current[current.current]!;
    persist();
    const value = key.current.publicKey.toBase58();
    setAddress(value);
    setAccount(current.current);
    return value;
  }, [persist]);
  const sign = useCallback(async (wire: Uint8Array) => {
    if (!key.current)
      throw new Error("Start a demo account before buying a ticket.");
    const tx = Transaction.from(wire);
    tx.partialSign(key.current);
    return new Uint8Array(tx.serialize());
  }, []);
  return (
    <SessionContext
      value={{
        address,
        label: `Demo account ${account}`,
        mode: "demo",
        ready,
        emailEnabled: false,
        login: () => {
          void startDemo();
        },
        logout: () => {
          key.current = null;
          accounts.current = {};
          current.current = 1;
          setAccount(1);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(ACCOUNTS_KEY);
          setAddress(null);
        },
        startDemo,
        switchDemo,
        sign,
      }}
    >
      {children}
    </SessionContext>
  );
}
