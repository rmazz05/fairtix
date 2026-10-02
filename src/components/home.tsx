"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useApp } from "./providers";
import { useSession } from "./session";
import { Ticket, Verify } from "./ticket";
import { euros, maxPrice, type Receipt } from "@/lib/types";

export function Home() {
  const app = useApp(),
    session = useSession(),
    event =
      app.snapshot.events.find((e) => e.address === app.snapshot.demoEvent) ||
      app.snapshot.events[0];
  const [receipt, setReceipt] = useState<Receipt | null>(null),
    [attempting, setAttempting] = useState(false),
    [stage, setStage] = useState<string | null>(null),
    [price, setPrice] = useState("60.00");
  const attempt = useRef<HTMLDivElement>(null);
  async function tryResale(askingPrice = price) {
    if (!event || !app.snapshot.ready) return;
    setAttempting(true);
    setReceipt(null);
    try {
      const owner = session.address || (await session.startDemo());
      const current = await fetch(`/api/state?owner=${owner}`).then((r) =>
        r.json(),
      );
      if (!current.tickets?.[event.address]) {
        setStage("Preparing your demo ticket…");
        await app.addCredits(owner);
        const bought = await app.run({
          owner,
          action: "primary",
          event: event.address,
        });
        if (!bought.ok) throw new Error(bought.error);
      }
      setStage("Checking the asking price…");
      const result = await app.run({
        owner,
        action: "list",
        event: event.address,
        price: Math.round(Number(askingPrice) * 100),
      });
      setReceipt(result);
      if (result.ok)
        app.setMessage(
          `Your ticket is listed at ${euros(Math.round(Number(askingPrice) * 100))}. You can cancel it in My tickets.`,
        );
    } catch (e) {
      app.setMessage(
        e instanceof Error
          ? e.message
          : "The resale test could not be completed. Try again.",
      );
    } finally {
      setAttempting(false);
      setStage(null);
    }
  }
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Tickets with
            <br />a resale cap.
          </h1>
          <p>
            Organizers set the maximum resale price. If your plans change, sell
            your ticket within that cap.
          </p>
          <Link href="/create" className="button signal">
            Create an event <ArrowRight size={18} />
          </Link>
          <Link href="/demo" className="hero-secondary text-button">
            Try the full demo, no email needed <ArrowRight size={17} />
          </Link>
          <button
            className="hero-secondary text-button"
            onClick={() => {
              setPrice("60.00");
              attempt.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              void tryResale("60.00");
            }}
            disabled={attempting || !app.snapshot.ready}
          >
            Try reselling a ticket at €60 <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-product" ref={attempt}>
          <div className="product-caption">
            <p>Try the resale rule</p>
            <span>Test credits only</span>
          </div>
          {event ? (
            <>
              <Ticket
                event={event}
                className="hero-ticket"
                stamp={receipt?.code === "OverCap" ? "Over the cap" : undefined}
                side={
                  <>
                    <span className="stub-label">Face price</span>
                    <strong className="ticket-price signal-text mono">
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
                  {event.royaltyBps / 100}% of every resale goes to the
                  organizer.
                </p>
              </Ticket>
              <div className="resale-test">
                <label htmlFor="try-price">Your asking price</label>
                <div className="price-control">
                  <span aria-hidden="true">€</span>
                  <input
                    id="try-price"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setReceipt(null);
                    }}
                    aria-describedby="cap-help"
                  />
                  <button
                    className="button"
                    onClick={() => void tryResale()}
                    disabled={attempting || !!app.busy || !app.snapshot.ready}
                  >
                    {stage || "Try this price"}
                    <ArrowRight size={18} />
                  </button>
                </div>
                <p
                  id="cap-help"
                  className={
                    receipt?.code === "OverCap" ? "error-text" : "muted"
                  }
                  aria-live="polite"
                >
                  {!app.snapshot.ready
                    ? "Preview ticket. The live demo is awaiting devnet deployment."
                    : receipt?.code === "OverCap"
                      ? `The organizer caps resale at ${euros(maxPrice(event))} for this event. Lower your price to list it.`
                      : receipt?.ok
                        ? "Within the cap. Your ticket is now listed."
                        : `A €${(event.facePrice / 100).toFixed(0)} ticket. At most ${euros(maxPrice(event))} on resale.`}
                </p>
                <Verify signature={receipt?.signature} />
              </div>
            </>
          ) : (
            <div className="deployment-note">
              <h2>The demo is being prepared.</h2>
              <p>
                {app.snapshot.message ||
                  "The example event will appear after the ticket programs are deployed."}
              </p>
            </div>
          )}
        </div>
      </section>
      <section className="events-section" id="events">
        <div className="section-heading">
          <h2>On the calendar</h2>
          <p>
            Example events use test credits.
            <br />
            No real entry is included.
          </p>
        </div>
        <div className="event-list">
          {app.snapshot.events.length ? (
            app.snapshot.events.map((e) => (
              <Ticket
                key={e.address}
                event={e}
                className="event-row"
                side={
                  <>
                    <span className="stub-label">From</span>
                    <strong className="ticket-price mono">
                      {euros(e.facePrice)}
                    </strong>
                    <Link href={`/event/${e.address}`} className="text-button">
                      See tickets <ArrowRight size={17} />
                    </Link>
                  </>
                }
              >
                <p className="ticket-rule">
                  Resale capped at{" "}
                  <span className="mono">{euros(maxPrice(e))}</span>
                </p>
              </Ticket>
            ))
          ) : (
            <p className="empty-copy">No events have been created yet.</p>
          )}
        </div>
      </section>
      <section className="explainer">
        <h2>
          The price cap
          <br />
          stays with the ticket.
        </h2>
        <div>
          <p>
            A ticket can only move through the resale marketplace. The asking
            price is checked before it leaves the seller’s account.
          </p>
          <p>
            When it sells, the seller and organizer are paid in the same
            transaction as the ticket changes hands.
          </p>
          <Link href="/about" className="text-button">
            See what the demo proves <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="faq">
        <h2>Before you buy</h2>
        <div>
          <details>
            <summary>Can I sell my ticket if I can’t go?</summary>
            <p>
              Yes. List it in My tickets at any price up to the organizer’s cap.
              You can cancel the listing while it’s unsold.
            </p>
          </details>
          <details>
            <summary>Do I need a wallet extension?</summary>
            <p>
              No. The demo account works in this browser.
              {session.emailEnabled
                ? " You can also sign in with email."
                : " Email sign-in is awaiting its Privy app configuration."}{" "}
              We cover the transaction fees.
            </p>
          </details>
          <details>
            <summary>Can the ticket be sent around the cap?</summary>
            <p>
              No. A direct transfer to another account is refused by the
              ticket’s transfer hook. The resale marketplace checks the price
              before accepting a listing.
            </p>
          </details>
          <details>
            <summary>Does this stop all scalping?</summary>
            <p>
              No. Two people could still agree on a cash side deal. Fairtix
              enforces the price of the recorded resale; it cannot inspect
              payments made elsewhere.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
