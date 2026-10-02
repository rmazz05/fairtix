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
          List a ticket as the seller, then buy it as the buyer. Both sides stay
          on one screen, with links to every Solana transaction.
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
    </div>
  );
}
