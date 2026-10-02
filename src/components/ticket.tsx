"use client";
import type { ReactNode } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { eventDate, type EventView } from "@/lib/types";
import { useApp } from "./providers";
export function Ticket({
  event,
  side,
  children,
  stamp,
  className = "",
}: {
  event: EventView;
  side: ReactNode;
  children?: ReactNode;
  stamp?: "Over the cap" | "Yours" | "Transfer blocked";
  className?: string;
}) {
  return (
    <article className={`ticket ${className}`}>
      <div className="ticket-main">
        <p className="ticket-category">General admission</p>
        <h3>{event.name}</h3>
        <p className="ticket-date mono">{eventDate(event.date)}</p>
        <p className="ticket-venue">
          {event.example
            ? event.venue.replace(/\s*·\s*example venue$/i, "")
            : event.venue}
        </p>
        {children}
      </div>
      <div className="ticket-stub">{side}</div>
      {stamp && (
        <div
          className={`stamp ${stamp === "Yours" ? "valid" : "blocked"}`}
          role="status"
        >
          {stamp}
        </div>
      )}
    </article>
  );
}
export function Verify({ signature }: { signature?: string }) {
  const { snapshot } = useApp();
  if (!signature) return null;
  const url = `https://explorer.solana.com/tx/${signature}?cluster=${snapshot.network === "localnet" ? "custom&customUrl=http%3A%2F%2F127.0.0.1%3A8920" : "devnet"}`;
  return (
    <a className="verify-link" href={url} target="_blank" rel="noreferrer">
      Verify on Solana <ArrowUpRight size={13} />
    </a>
  );
}
