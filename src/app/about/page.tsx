import Link from "next/link";
import ids from "@/lib/program-ids.json";
export default function Page() {
  return (
    <div className="container page-content about-page">
      <div className="page-heading">
        <h1>What this demo proves.</h1>
        <p>
          The resale rules are enforced by the ticket programs. You can check
          the transactions yourself.
        </p>
      </div>
      <div className="about-layout">
        <div>
          <section>
            <h2>The ticket refuses a direct transfer.</h2>
            <p>
              Each event issues general-admission tickets using Solana’s
              Token-2022 transfer hook. Token-2022 calls the hook whenever a
              ticket moves. It permits transfers into a valid listing’s escrow,
              or out of it during a sale or cancellation.
            </p>
            <p>
              A signed wallet-to-wallet transfer still reaches the hook and is
              refused. Associated ticket accounts have immutable owners,
              preventing an account-ownership change from becoming an alternate
              transfer route.
            </p>
          </section>
          <section>
            <h2>The marketplace checks the price.</h2>
            <p>
              The organizer sets a cap of 0–25% above the face price and a
              resale royalty of 0–10%. A listing above the cap fails before the
              ticket can enter escrow.
            </p>
            <p>
              A completed resale pays the seller, organizer and platform in the
              same transaction that delivers the ticket. If one part fails, the
              whole transaction rolls back.
            </p>
          </section>
          <section>
            <h2>The fees are visible.</h2>
            <p>
              On a primary sale, the organizer receives 97% of the face price;
              Fairtix receives 3%. On resale, Fairtix receives 2%, the organizer
              receives their chosen royalty, and the seller receives the
              remainder. The buyer pays the displayed asking price.
            </p>
          </section>
          <section>
            <h2>The limits matter.</h2>
            <p>
              This uses test credits, with no real euro payments or event
              admission. Door check-in, identity checks and seated tickets are
              outside the MVP.
            </p>
            <p>
              Cash side deals remain possible. Fairtix only enforces the price
              recorded in its marketplace.
            </p>
            <p>
              Event rules cannot be edited through the current program. The
              development upgrade authority is retained, so future program
              upgrades could change behavior. This demo does not claim immutable
              software.
            </p>
            <p>
              Demo accounts are stored in your browser. They are suitable for
              test credits only. Email sign-in requires a configured Privy
              application.
            </p>
          </section>
        </div>
        <aside>
          <h3>Try the three checks.</h3>
          <p>On the home page, ask €60 for a ticket capped at €27.50.</p>
          <p>In My tickets, try sending the ticket directly.</p>
          <p>
            Then list it within the cap and buy it from another account. Check
            the organizer’s royalty.
          </p>
          <Link href="/" className="text-button">
            Open the demo →
          </Link>
          <details className="program-details">
            <summary>Program details</summary>
            <p>Marketplace</p>
            <code>{ids.market}</code>
            <p>Transfer hook</p>
            <code>{ids.hook}</code>
          </details>
        </aside>
      </div>
    </div>
  );
}
