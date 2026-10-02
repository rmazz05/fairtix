"use client";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useApp } from "./providers";
import { Ticket } from "./ticket";
import { euros, maxPrice } from "@/lib/types";

export function Home() {
  const { snapshot } = useApp();
  return (
    <div className="container">
      <section className="hero hero-centered">
        <h1>
          Tickets with
          <br />a resale cap.
        </h1>
        <p>Let fans resell tickets at a price you decide.</p>
        <Link href="/demo" className="button signal">
          Try the demo <ArrowRight size={18} />
        </Link>
        <Link href="/create" className="text-button">
          Create an event
        </Link>
      </section>
      <section className="events-section" id="events">
        <div className="section-heading">
          <h2>Events</h2>
        </div>
        <div className="event-list">
          {snapshot.events.length ? (
            snapshot.events.map((event) => (
              <Ticket
                key={event.address}
                event={event}
                className="event-row"
                side={
                  <>
                    <span className="stub-label">From</span>
                    <strong className="ticket-price mono">
                      {euros(event.facePrice)}
                    </strong>
                    <Link
                      href={`/event/${event.address}`}
                      className="text-button"
                    >
                      See tickets <ArrowRight size={17} />
                    </Link>
                  </>
                }
              >
                <p className="ticket-rule">
                  Resale capped at{" "}
                  <span className="mono">{euros(maxPrice(event))}</span>
                </p>
              </Ticket>
            ))
          ) : (
            <p className="empty-copy">No events have been created yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
