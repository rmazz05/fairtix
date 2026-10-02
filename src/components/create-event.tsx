"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useApp } from "./providers";
import { useSession } from "./session";
import { Ticket, Verify } from "./ticket";
import { euros, maxPrice, type EventView, type Receipt } from "@/lib/types";
export function CreateEvent() {
  const app = useApp(),
    session = useSession();
  const [name, setName] = useState(""),
    [venue, setVenue] = useState(""),
    [date, setDate] = useState("2026-11-06T19:00"),
    [price, setPrice] = useState("25.00"),
    [supply, setSupply] = useState("100"),
    [cap, setCap] = useState("10"),
    [royalty, setRoyalty] = useState("5");
  const [receipt, setReceipt] = useState<
      (Receipt & { address?: string }) | null
    >(null),
    [error, setError] = useState<string | null>(null);
  const preview: EventView = {
    address: "preview",
    mint: "",
    organizer: session.address || "",
    name: name || "Your event name",
    venue: venue || "Your venue",
    date: Math.floor(new Date(date || "2026-11-06T19:00").getTime() / 1000),
    facePrice: Math.round(Number(price || "0") * 100),
    capBps: Math.round(Number(cap || "0") * 100),
    royaltyBps: Math.round(Number(royalty || "0") * 100),
    supply: Number(supply),
    sold: 0,
    resales: 0,
    royaltiesEarned: 0,
    eventId: "",
    example: false,
  };
  async function create(e: FormEvent) {
    e.preventDefault();
    setReceipt(null);
    setError(null);
    try {
      if (!session.address && session.emailEnabled) {
        session.login();
        return;
      }
      const owner = session.address || (await session.startDemo());
      const r = await app.run({
        owner,
        action: "create",
        details: {
          name,
          venue,
          date: preview.date,
          facePrice: preview.facePrice,
          supply: preview.supply,
          capBps: preview.capBps,
          royaltyBps: preview.royaltyBps,
        },
      });
      setReceipt(r);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The event could not be created. Check its details and try again.",
      );
    }
  }
  return (
    <div className="container page-content">
      <div className="page-heading">
        <h1>Put your event on sale.</h1>
        <p>
          Set the ticket price, resale cap and your royalty. These rules apply
          to every ticket you sell.
        </p>
      </div>
      <div className="create-layout">
        <form onSubmit={create} className="event-form">
          <fieldset>
            <legend>Event details</legend>
            <label>
              Event name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={96}
                placeholder="Name on the ticket"
              />
            </label>
            <div className="form-pair">
              <label>
                Date and time
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Venue
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                  maxLength={96}
                  placeholder="Where it’s happening"
                />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Ticket rules</legend>
            <div className="form-pair">
              <label>
                Face price (€)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label>
                Number of tickets
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  required
                  value={supply}
                  onChange={(e) => setSupply(e.target.value)}
                />
              </label>
            </div>
            <div className="form-pair">
              <label>
                Resale markup (%)
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="1"
                  required
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                />
                <span>0–25% above the face price.</span>
              </label>
              <label>
                Your royalty (%)
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  required
                  value={royalty}
                  onChange={(e) => setRoyalty(e.target.value)}
                />
                <span>0–10% of each resale.</span>
              </label>
            </div>
          </fieldset>
          <p className="form-fee">
            Fairtix takes 3% of primary sales and 2% of resales. Buyers pay the
            displayed price.
          </p>
          <button
            className="button signal"
            disabled={!!app.busy || receipt?.ok || !app.snapshot.ready}
          >
            {app.busy === "create" ? "Creating event…" : "Create event"}
            <ArrowRight size={18} />
          </button>
          {(receipt || error) && (
            <div
              className={receipt?.ok ? "purchase-confirmation" : "error-text"}
              role="status"
            >
              <p>
                {receipt?.ok
                  ? "Your event is on sale. Share its page to sell tickets."
                  : receipt?.error || error}
              </p>
              <Verify signature={receipt?.signature} />
              {receipt?.ok && (
                <Link
                  href={`/event/${receipt.address}`}
                  className="text-button"
                >
                  Open event page <ArrowRight size={17} />
                </Link>
              )}
            </div>
          )}
        </form>
        <aside className="create-preview">
          <p className="product-caption">Your ticket preview</p>
          <Ticket
            event={preview}
            className="preview-ticket"
            side={
              <>
                <span className="stub-label">Face price</span>
                <strong className="ticket-price mono">
                  {euros(preview.facePrice)}
                </strong>
                <span className="stub-label resale-label">Resale cap</span>
                <strong className="cap-price mono">
                  {euros(maxPrice(preview))}
                </strong>
              </>
            }
          />
          <div className="preview-rule">
            <h3>{euros(maxPrice(preview))} is the limit.</h3>
            <p>
              Higher listings are refused. Every completed resale pays you{" "}
              {Number(royalty || 0)}%.
            </p>
            <p>
              The rules are set when you create the event. Editing them is not
              part of this demo.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
