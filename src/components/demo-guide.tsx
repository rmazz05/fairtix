"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useApp } from "./providers";
import { useSession } from "./session";
import { euros, maxPrice } from "@/lib/types";

export function DemoGuide() {
  const app = useApp(),
    session = useSession();
  const [switching, setSwitching] = useState(false);
  const event = app.snapshot.events.find(
    (e) => e.address === app.snapshot.demoEvent,
  );
  const active = session.mode === "demo" && !!session.address;
  async function select(account: 1 | 2) {
    setSwitching(true);
    try {
      await session.selectDemo(account);
      app.setMessage(null);
    } catch (error) {
      app.setMessage(
        error instanceof Error
          ? error.message
          : "The demo account could not be opened. Try again.",
      );
    } finally {
      setSwitching(false);
    }
  }
  return (
    <div className="container page-content demo-guide">
      <div className="page-heading">
        <h1>Try a ticket resale.</h1>
        <p>
          Play both sides in one browser. No email, wallet extension or real
          money needed.
        </p>
      </div>
      <section className="demo-accounts" aria-labelledby="demo-accounts-title">
        <h2 id="demo-accounts-title">Choose your account</h2>
        {session.mode === "email" ? (
          <>
            <p>
              You are signed in with your own account. Sign out to use the two
              demo accounts, or open this page in a private window.
            </p>
            <button
              className="button outline"
              disabled={!!app.busy}
              onClick={() => session.logout()}
            >
              Sign out for the demo
            </button>
          </>
        ) : (
          <>
            <p>
              Account 1 sells the ticket. Account 2 buys it. You can switch here
              at any time; both accounts keep their tickets and test credits.
            </p>
            <div className="demo-account-actions">
              {([1, 2] as const).map((account) => (
                <button
                  key={account}
                  className={`button ${active && session.demoAccount === account ? "signal" : "outline"}`}
                  aria-pressed={active && session.demoAccount === account}
                  disabled={
                    !session.ready ||
                    switching ||
                    !!app.busy ||
                    !app.snapshot.ready
                  }
                  onClick={() => void select(account)}
                >
                  {account === 1
                    ? "Use account 1 · Seller"
                    : "Use account 2 · Buyer"}
                </button>
              ))}
            </div>
            <p className="demo-account-status" role="status">
              {switching
                ? "Opening account…"
                : active
                  ? `Account ${session.demoAccount} is active. ${session.demoAccount === 1 ? "You are the seller." : "You are the buyer."}`
                  : "Choose the seller account to start."}
            </p>
          </>
        )}
      </section>
      {event && (
        <ol className="demo-steps">
          <li>
            <h2>Buy the example ticket</h2>
            <p>
              Use account 1. Open the example event and pay{" "}
              {euros(event.facePrice)}. If needed, checkout adds test credits
              automatically. Your ticket appears in My tickets.
            </p>
            <Link href={`/event/${event.address}`} className="text-button">
              Open the example event <ArrowRight size={17} />
            </Link>
          </li>
          <li>
            <h2>Check what the ticket refuses</h2>
            <p>
              In My tickets, select “Resell this ticket” and ask €60. The
              program refuses the listing because the cap is{" "}
              {euros(maxPrice(event))}. Your ticket stays in account 1.
            </p>
            <p>
              Then open “Test the transfer rule” and try sending it directly.
              That signed transfer is refused too. Each result links to its
              Solana transaction.
            </p>
            <Link href="/tickets" className="text-button">
              Open My tickets <ArrowRight size={17} />
            </Link>
          </li>
          <li>
            <h2>Complete a resale within the cap</h2>
            <p>
              Still in account 1, list the ticket at {euros(maxPrice(event))}.
              Return here and switch to account 2. Open the example event and
              buy the resale ticket marked “From demo account 1” at that price,
              rather than a new primary ticket.
            </p>
            <p>
              The ticket moves to account 2 while the seller, organizer and
              platform are paid in the same transaction. Open the organizer view
              to check the royalty increase.
            </p>
            <div className="demo-step-links">
              <Link href={`/event/${event.address}`} className="text-button">
                Open resale tickets <ArrowRight size={17} />
              </Link>
              <Link href="/organizer" className="text-button">
                Check organizer royalties <ArrowRight size={17} />
              </Link>
            </div>
          </li>
        </ol>
      )}
      <p className="log-note">
        Demo keys stay in this browser. Signing out clears them. These accounts
        and credits are for testing only. No ticket admits you to an event.
      </p>
    </div>
  );
}
