"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useApp } from "./providers";
import { useSession } from "./session";
import { Ticket, Verify } from "./ticket";
import { euros, maxPrice, type Receipt } from "@/lib/types";
export function EventPage({ address }: { address: string }) {
  const app = useApp(),
    session = useSession(),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [buying, setBuying] = useState<string | null>(null);
  const event = app.snapshot.events.find((e) => e.address === address);
  const [purchasePrice, setPurchasePrice] = useState(0);
  if (!event)
    return (
      <div className="container page-content">
        <div className="page-heading">
          <h1>Event unavailable.</h1>
          <p>
            {app.snapshot.ready
              ? "This event could not be found. Check its link or choose another event."
              : app.snapshot.message}
          </p>
        </div>
        <Link href="/" className="text-button">
          Back to events <ArrowRight size={17} />
        </Link>
      </div>
    );
  const listings = app.snapshot.listings.filter((l) => l.event === address);
  async function buy(listing?: string) {
    if (!event) return;
    setBuying(listing || "primary");
    setReceipt(null);
    setPurchasePrice(
      listing
        ? listings.find((l) => l.address === listing)?.price || event.facePrice
        : event.facePrice,
    );
    try {
      if (!session.address && session.emailEnabled) {
        session.login();
        return;
      }
      const owner = session.address || (await session.startDemo());
      if (
        app.snapshot.balance <
        (listing
          ? listings.find((l) => l.address === listing)?.price || 0
          : event.facePrice)
      )
        await app.addCredits(owner);
      const result = await app.run(
        listing
          ? { owner, action: "resale", listing }
          : { owner, action: "primary", event: address },
      );
      setReceipt(result);
    } catch (e) {
      app.setMessage(
        e instanceof Error
          ? e.message
          : "The purchase could not be completed. Try again.",
      );
    } finally {
      setBuying(null);
    }
  }
  const displayedPrice =
    buying || receipt?.ok ? purchasePrice : event.facePrice;
  return (
    <div className="container page-content">
      <div className="page-heading">
        <Link href="/" className="back-link">
          ← All events
        </Link>
        <h1>{event.name}</h1>
        <p>
          {event.example
            ? "Example event. Test credits only; this ticket does not admit you to a real event."
            : "General admission. This demo uses test credits, with no real event entry."}
        </p>
      </div>
      <div className="event-layout">
        <div>
          <Ticket
            event={event}
            className="purchase-ticket"
            stamp={receipt?.ok ? "Yours" : undefined}
            side={
              <>
                <span className="stub-label">Face price</span>
                <strong className="ticket-price mono">
                  {euros(event.facePrice)}
                </strong>
                <span className="stub-label resale-label">Resale cap</span>
                <strong className="cap-price mono">
                  {euros(maxPrice(event))}
                </strong>
              </>
            }
          >
            <p className="ticket-royalty">
              {app.snapshot.ready
                ? `${event.supply - event.sold} of ${event.supply} primary tickets available.`
                : "Preview ticket. Not on sale yet."}
            </p>
          </Ticket>
          <section className="resale-list">
            <h2>Resale tickets</h2>
            <p className="muted">
              Every asking price is capped at{" "}
              <span className="mono">{euros(maxPrice(event))}</span>.
            </p>
            {listings.length ? (
              listings.map((l) => (
                <div className="listing-row" key={l.address}>
                  <div>
                    <p>General admission</p>
                    <span className="muted">
                      {l.seller === session.address
                        ? "Your listing"
                        : session.mode === "demo" &&
                            l.seller === session.demoAddresses[1]
                          ? "From demo account 1"
                          : session.mode === "demo" &&
                              l.seller === session.demoAddresses[2]
                            ? "From demo account 2"
                            : "From another fan"}
                    </span>
                  </div>
                  <strong className="mono">{euros(l.price)}</strong>
                  <button
                    className="button outline"
                    disabled={
                      !!buying ||
                      l.seller === session.address ||
                      !app.snapshot.ready
                    }
                    onClick={() => void buy(l.address)}
                  >
                    {buying === l.address
                      ? "Buying ticket…"
                      : `Pay ${euros(l.price)}`}
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-copy">
                No resale tickets are listed right now.
              </p>
            )}
          </section>
        </div>
        <aside className="checkout">
          <h2>{receipt?.ok ? "Your ticket." : "One ticket."}</h2>
          <dl>
            <dt>Ticket price</dt>
            <dd className="mono">{euros(displayedPrice)}</dd>
            <dt>Buyer fees</dt>
            <dd className="mono">€0.00</dd>
            <dt className="total">You pay</dt>
            <dd className="total mono">{euros(displayedPrice)}</dd>
          </dl>
          {receipt?.ok ? (
            <Link href="/tickets" className="button signal">
              Open My tickets <ArrowRight size={18} />
            </Link>
          ) : (
            <button
              className="button signal"
              disabled={
                !!buying || event.sold >= event.supply || !app.snapshot.ready
              }
              onClick={() => void buy()}
            >
              {event.sold >= event.supply
                ? "Primary tickets sold out"
                : buying
                  ? "Buying ticket…"
                  : `Pay ${euros(event.facePrice)}`}
              <ArrowRight size={18} />
            </button>
          )}
          <p className="checkout-note">
            Test credits only.{" "}
            {session.address
              ? "We cover the transaction fee."
              : session.emailEnabled
                ? "Sign in with email to buy."
                : "A demo account will be created in this browser."}{" "}
            If needed, we add €100 in test credits.
          </p>
          {receipt && (
            <div
              className={receipt.ok ? "purchase-confirmation" : "error-text"}
              role="status"
            >
              <p>
                {receipt.ok
                  ? "It’s yours. Your ticket is in My tickets."
                  : receipt.error}
              </p>
              <Verify signature={receipt.signature} />
            </div>
          )}
          <div className="checkout-rule">
            <h3>If you resell</h3>
            <p>
              The maximum asking price is{" "}
              <span className="mono">{euros(maxPrice(event))}</span>. The
              organizer receives {event.royaltyBps / 100}% and Fairtix receives
              2% of the resale price.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
