"use client";
import Link from "next/link";
import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import { ArrowRight } from "@phosphor-icons/react";
import { Dialog } from "./shell";
import { useApp, post } from "./providers";
import { useSession } from "./session";
import { Ticket, Verify } from "./ticket";
import { euros, maxPrice, type EventView, type Receipt } from "@/lib/types";

export function MyTickets() {
  const app = useApp(),
    session = useSession(),
    [reselling, setReselling] = useState<EventView | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [testing, setTesting] = useState(false);
  const owned = app.snapshot.events.filter(
      (e) => app.snapshot.tickets[e.address] > 0,
    ),
    listings = app.snapshot.listings.filter(
      (l) => l.seller === session.address,
    );
  async function direct(event: EventView) {
    if (!session.address) return;
    setTesting(true);
    setReceipt(null);
    try {
      const destination = Keypair.generate().publicKey.toBase58();
      await post("/api/recipient", { destination, event: event.address });
      setReceipt(
        await app.run({
          owner: session.address,
          action: "direct",
          event: event.address,
          destination,
        }),
      );
    } catch (e) {
      app.setMessage(
        e instanceof Error
          ? e.message
          : "The transfer test could not be completed.",
      );
    } finally {
      setTesting(false);
    }
  }
  return (
    <div className="container page-content">
      <div className="page-heading">
        <h1>My tickets</h1>
        <p>
          {session.address
            ? "Tickets in your account, and the ones you’ve listed for resale."
            : "Your tickets will be here after you buy one."}
        </p>
      </div>
      {!session.address && (
        <button
          className="button"
          onClick={() =>
            session.emailEnabled ? session.login() : void session.startDemo()
          }
        >
          {session.emailEnabled ? "Sign in with email" : "Start demo account"}
        </button>
      )}
      {session.address && !owned.length && !listings.length && (
        <div className="empty-state">
          <h2>No tickets yet.</h2>
          <p>Events near WHU are listed on the home page.</p>
          <Link href="/" className="text-button">
            See events <ArrowRight size={17} />
          </Link>
        </div>
      )}
      <div className="owned-list">
        {owned.map((e) => (
          <div key={e.address}>
            <Ticket
              event={e}
              className="owned-ticket"
              side={
                <>
                  <strong className="owned-count mono">
                    {app.snapshot.tickets[e.address]}
                  </strong>
                  <span className="stub-label">
                    {app.snapshot.tickets[e.address] === 1
                      ? "Ticket in your account"
                      : "Tickets in your account"}
                  </span>
                  <div className="entry-placeholder">
                    Entry code
                    <br />
                    <span>Not issued</span>
                  </div>
                </>
              }
            >
              <div className="ticket-actions">
                <button className="text-button" onClick={() => setReselling(e)}>
                  Resell this ticket <ArrowRight size={17} />
                </button>
                <Link href={`/event/${e.address}`} className="text-button">
                  Event details
                </Link>
              </div>
            </Ticket>
            <p className="checkin-note">
              Check-in is not available in this demo.
            </p>
            <details className="proof-details">
              <summary>Test the transfer rule</summary>
              <p>
                A direct transfer should fail, even when you sign it. Your
                ticket stays in this account.
              </p>
              <button
                className="button outline"
                disabled={testing || !!app.busy}
                onClick={() => void direct(e)}
              >
                {testing ? "Testing transfer…" : "Try sending it directly"}
              </button>
              {receipt && (
                <div className="transfer-result" role="status">
                  <p
                    className={
                      receipt.code === "TransferNotAllowed"
                        ? "error-text"
                        : "muted"
                    }
                  >
                    {receipt.code === "TransferNotAllowed"
                      ? "Transfer blocked. This ticket can only change hands through Fairtix, so the price cap holds."
                      : receipt.error ||
                        "The transfer completed. Review the receipt."}
                  </p>
                  <Verify signature={receipt.signature} />
                </div>
              )}
            </details>
          </div>
        ))}
      </div>
      {listings.length > 0 && (
        <section className="listed-section">
          <h2>Listed for resale</h2>
          {listings.map((l) => {
            const event = app.snapshot.events.find(
              (e) => e.address === l.event,
            );
            if (!event) return null;
            return (
              <Ticket
                key={l.address}
                event={event}
                className="listed-ticket"
                side={
                  <>
                    <span className="stub-label">Asking price</span>
                    <strong className="ticket-price mono">
                      {euros(l.price)}
                    </strong>
                    <button
                      className="text-button"
                      disabled={!!app.busy}
                      onClick={() => {
                        void app
                          .run({
                            owner: session.address!,
                            action: "cancel",
                            listing: l.address,
                          })
                          .then((r) => {
                            setReceipt(r);
                            if (!r.ok)
                              app.setMessage(
                                r.error ||
                                  "The listing could not be cancelled.",
                              );
                            else
                              app.setMessage(
                                "Listing cancelled. Your ticket is back in your account.",
                              );
                          })
                          .catch((e) => app.setMessage(e.message));
                      }}
                    >
                      Cancel listing
                    </button>
                  </>
                }
              >
                <p className="ticket-royalty">
                  Held in resale escrow until it sells or you cancel.
                </p>
              </Ticket>
            );
          })}
        </section>
      )}
      {reselling && (
        <ResellDialog event={reselling} onClose={() => setReselling(null)} />
      )}
    </div>
  );
}
function ResellDialog({
  event,
  onClose,
}: {
  event: EventView;
  onClose: () => void;
}) {
  const app = useApp(),
    session = useSession(),
    [price, setPrice] = useState((event.facePrice / 100).toFixed(2)),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [error, setError] = useState<string | null>(null);
  async function list() {
    setReceipt(null);
    setError(null);
    try {
      const r = await app.run({
        owner: session.address!,
        action: "list",
        event: event.address,
        price: Math.round(Number(price) * 100),
      });
      setReceipt(r);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The listing could not be sent.",
      );
    }
  }
  return (
    <Dialog title="Resell your ticket" onClose={onClose}>
      <Ticket
        event={event}
        className="dialog-ticket"
        stamp={receipt?.code === "OverCap" ? "Over the cap" : undefined}
        side={
          <>
            <span className="stub-label">Resale cap</span>
            <strong className="cap-price mono">{euros(maxPrice(event))}</strong>
          </>
        }
      />
      <div className="resale-test">
        <label htmlFor="resale-price">Your asking price</label>
        <div className="price-control">
          <span aria-hidden="true">€</span>
          <input
            id="resale-price"
            disabled={receipt?.ok || !!app.busy}
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setReceipt(null);
            }}
          />
          <button
            className="button"
            disabled={!!app.busy || receipt?.ok}
            onClick={() => void list()}
          >
            {app.busy === "list" ? "Listing…" : "List ticket"}
          </button>
        </div>
        <p
          role="status"
          className={
            receipt?.ok
              ? "success-text"
              : receipt || error
                ? "error-text"
                : "muted"
          }
        >
          {receipt?.code === "OverCap"
            ? `The organizer caps resale at ${euros(maxPrice(event))} for this event. Lower your price to list it.`
            : receipt?.ok
              ? `Listed at ${euros(Math.round(Number(price) * 100))}. You can cancel while it’s unsold.`
              : receipt?.error ||
                error ||
                `You receive the asking price minus ${event.royaltyBps / 100}% for the organizer and 2% for Fairtix.`}
        </p>
        <Verify signature={receipt?.signature} />
        {receipt?.ok && (
          <Link
            className="text-button"
            href={`/event/${event.address}`}
            onClick={onClose}
          >
            See your listing <ArrowRight size={17} />
          </Link>
        )}
      </div>
    </Dialog>
  );
}
