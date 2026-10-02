import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "WHU project" };
export default function Page() {
  return (
    <div className="container page-content project-page">
      <div className="page-heading">
        <h1>Fairtix at WHU.</h1>
        <p>
          Tickets with an organizer-set resale cap. A direct transfer is
          refused; a resale within the cap pays the seller and organizer
          together.
        </p>
      </div>
      <section className="project-demo">
        <h2>The interactive demo.</h2>
        <p>
          Use two demo accounts to buy a ticket, test the resale cap and
          complete a resale. All amounts are test credits.
        </p>
        <p className="muted">
          An asking price of €60 fails against the €27.50 cap. A signed direct
          transfer fails. A €27.50 resale delivers the ticket and adds €1.37 to
          the organizer’s royalty balance.
        </p>
        <Link href="/demo" className="button outline">
          Try the demo yourself →
        </Link>
      </section>
      <section className="project-pitch">
        <h2>The pitch.</h2>
        <p>
          The resale problem, the organizer’s price cap and how the Solana
          programs enforce it. Includes links to the deployed programs and
          actual devnet transactions.
        </p>
        <div className="project-links">
          <a
            href="/pitch.pdf"
            className="button"
            target="_blank"
            rel="noreferrer"
          >
            Read the deck →
          </a>
        </div>
      </section>
      <section className="project-status">
        <h2>The proposed pilot.</h2>
        <p>
          The first pilot would be a WHU student club. Its organizer would
          choose the ticket price, resale cap and royalty. No club has committed
          to a pilot, and we have not collected organizer feedback yet.
        </p>
        <p>
          Cash side deals remain possible. Program upgrade authority is
          retained. This prototype does not accept euro payments or admit anyone
          to an event.
        </p>
        <Link href="/" className="text-button">
          Open the ticket app →
        </Link>
      </section>
    </div>
  );
}
