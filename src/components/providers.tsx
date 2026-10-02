"use client";
import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DemoSession, useSession } from "./session";
import type { Snapshot, ActionInput, Prepared, Receipt } from "@/lib/types";
const PrivySession = dynamic(() => import("./privy-session"));
type AppState = {
  snapshot: Snapshot;
  refresh: () => Promise<void>;
  run: (input: ActionInput) => Promise<Receipt & { address?: string }>;
  addCredits: (owner?: string) => Promise<void>;
  busy: string | null;
  message: string | null;
  setMessage: (message: string | null) => void;
};
const AppContext = createContext<AppState | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("App provider is missing.");
  return value;
}
export async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "The ticket request was rejected. Try again.",
    );
  return result as T;
}
export function Providers({
  initial,
  children,
}: {
  initial: Snapshot;
  children: ReactNode;
}) {
  return (
    <DemoSession>
      {process.env.NEXT_PUBLIC_PRIVY_APP_ID ? (
        <PrivySession>
          <State initial={initial}>{children}</State>
        </PrivySession>
      ) : (
        <State initial={initial}>{children}</State>
      )}
    </DemoSession>
  );
}
function State({
  initial,
  children,
}: {
  initial: Snapshot;
  children: ReactNode;
}) {
  const session = useSession(),
    [loadedSnapshot, setSnapshot] = useState(initial),
    [busy, setBusy] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  const snapshot =
    loadedSnapshot.owner === session.address
      ? loadedSnapshot
      : { ...loadedSnapshot, owner: session.address, balance: 0, tickets: {} };
  const address = useRef(session.address);
  const firstRefresh = useRef(true);
  address.current = session.address;
  const refresh = useCallback(async () => {
    const owner = address.current;
    const response = await fetch(
      `/api/state${owner ? `?owner=${owner}` : ""}`,
      { cache: "no-store" },
    );
    const state = await response.json();
    if (owner !== address.current) return;
    if (!response.ok) {
      setMessage(
        state.error || "The ticket ledger is unavailable. Try refreshing.",
      );
      return;
    }
    setSnapshot(state);
  }, []);
  useEffect(() => {
    if (!session.ready) return;
    const first = firstRefresh.current;
    firstRefresh.current = false;
    if (first && initial.ready && session.address === initial.owner) return;
    void refresh().catch((e) => setMessage(e.message));
  }, [session.address, session.ready, refresh, initial.ready, initial.owner]);
  const run = useCallback(
    async (input: ActionInput) => {
      if (!snapshot.ready)
        throw new Error(
          snapshot.message || "The ticket programs are not available yet.",
        );
      setBusy(input.action);
      setMessage(null);
      try {
        const prepared = await post<Prepared>("/api/prepare", input);
        const wire = Uint8Array.from(atob(prepared.transaction), (c) =>
          c.charCodeAt(0),
        );
        const signed = await session.sign(wire);
        const encoded = btoa(String.fromCharCode(...signed));
        const receipt = await post<Receipt>("/api/relay", {
          transaction: encoded,
        });
        await refresh();
        return { ...receipt, address: prepared.address };
      } finally {
        setBusy(null);
      }
    },
    [session, snapshot.ready, snapshot.message, refresh],
  );
  const addCredits = useCallback(
    async (owner?: string) => {
      const target = owner || session.address;
      if (!target) throw new Error("Start a demo account or sign in first.");
      setBusy("credits");
      try {
        await post("/api/faucet", { owner: target });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [session.address, refresh],
  );
  return (
    <AppContext
      value={{ snapshot, refresh, run, addCredits, busy, message, setMessage }}
    >
      {children}
    </AppContext>
  );
}
