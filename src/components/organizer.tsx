"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useSession } from "./session";
import { useApp } from "./providers";
import { Verify } from "./ticket";
import { euros, type Proof } from "@/lib/types";
export function Organizer() {
  const app = useApp(),
    session = useSession(),
    [proofs, setProofs] = useState<Proof[]>([]),
    [loading, setLoading] = useState(false);
  const own = app.snapshot.events.filter(
    (e) => e.organizer === session.address,
  );
  const events = own.length
    ? own
    : app.snapshot.events.filter((e) => e.example);
  const example = !own.length;
  async function loadProofs() {
    setLoading(true);
    try {
      const state = await fetch(
        `/api/state?proof=1${session.address ? `&owner=${session.address}` : ""}`,
      ).then((r) => r.json());
      setProofs(state.proofs || []);
    } catch {
      app.setMessage("The attempt log could not be loaded. Try refreshing it.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadProofs();
  }, [session.address]);
  const sold = events.reduce((n, e) => n + e.sold, 0),
    resales = events.reduce((n, e) => n + e.resales, 0),
    royalties = events.reduce((n, e) => n + e.royaltiesEarned, 0);
  return (
    <div className="container page-content">
      <div className="page-heading dashboard-heading">
        <div>
          <h1>{example ? "Example organizer" : "Your events"}</h1>
          <p>
            {!app.snapshot.ready
              ? "Preview of the organizer view. No sales have been recorded here."
              : example
                ? "Live results from the example event. All amounts are test credits."
                : "Sales and royalties recorded by your events. All amounts are test credits."}
          </p>
        </div>
        <Link href="/create" className="button">
          Create an event <ArrowRight size={17} />
        </Link>
      </div>
      <div className="dashboard-layout" hidden={!app.snapshot.ready}>
        <section className="organizer-ledger">
          <h2>{example ? "Example event results" : "Sales & royalties"}</h2>
          <dl className="ledger-totals">
            <div>
              <dt>Tickets sold</dt>
              <dd className="mono">{sold}</dd>
            </div>
            <div>
              <dt>Completed resales</dt>
              <dd className="mono">{resales}</dd>
            </div>
            <div>
              <dt>Your resale royalties</dt>
              <dd className="mono">{euros(royalties)}</dd>
            </div>
          </dl>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Sold</th>
                  <th>Resales</th>
                  <th>Royalties</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.address}>
                    <td>
                      <Link href={`/event/${e.address}`}>{e.name}</Link>
                      {e.example && <small>Example event</small>}
                    </td>
                    <td className="mono">
                      {e.sold} / {e.supply}
                    </td>
                    <td className="mono">{e.resales}</td>
                    <td className="mono">{euros(e.royaltiesEarned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!events.length && (
            <p className="empty-copy">
              Create an event to start selling tickets.
            </p>
          )}
        </section>
        <aside className="royalty-note">
          <h3>A resale pays you.</h3>
          <p>
            For the example €25.00 ticket, a €27.50 resale pays the organizer
            €1.37 at a 5% royalty. Amounts are rounded down to the nearest cent.
          </p>
          <p>
            The seller receives €25.58. Fairtix receives €0.55. All three
            payments happen with the ticket transfer.
          </p>
          <Link href="/about" className="text-button">
            See the fee rules <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
      <section className="attempt-log" hidden={!app.snapshot.ready}>
        <div className="section-heading">
          <div>
            <h2>Blocked attempts</h2>
            <p>Recent failed transactions for the example event.</p>
          </div>
          <button
            className="text-button"
            onClick={() => void loadProofs()}
            disabled={loading}
          >
            {loading ? "Loading attempts…" : "Refresh log"}
          </button>
        </div>
        {proofs.length ? (
          <ul>
            {proofs.map((p) => (
              <li key={p.signature}>
                <span className="error-text">
                  {p.kind === "over-cap"
                    ? "Over-cap listing refused"
                    : "Direct transfer refused"}
                </span>
                <span className="mono muted">
                  {new Date(p.date * 1000).toLocaleTimeString("en-GB", {
                    timeZone: "Europe/Berlin",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <Verify signature={p.signature} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">
            No blocked attempts are recorded in the recent log. Try the €60
            resale on the home page.
          </p>
        )}
        <p className="log-note">
          A failed transaction cannot update the event’s counters. This log
          reads the transaction receipts directly.
        </p>
      </section>
    </div>
  );
}
