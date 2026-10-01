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
        <h2>The local demo.</h2>
        <p>
          This 89-second walkthrough shows actual transactions on a local Solana
          validator. It joins captured browser states with cuts. All amounts are
          test credits.
        </p>
        <video
          controls
          playsInline
          preload="metadata"
          poster="/demo-poster.jpg"
          aria-label="Fairtix local demo walkthrough, with captions"
        >
          <source src="/demo.mp4" type="video/mp4" />
        </video>
        <p className="muted">
          An asking price of €60 fails against the €27.50 cap. A signed direct
          transfer fails. A €27.50 resale delivers the ticket and adds €1.37 to
          the organizer’s royalty balance.
        </p>
        <a href="/demo.mp4" className="text-button" download>
          Download the walkthrough →
        </a>
      </section>
      <section className="project-pitch">
        <h2>The pitch.</h2>
        <p>
          Seven slides covering the problem, product, Solana integration, fees,
          first pilot and roadmap. The pilot and revenue figures are
          assumptions; no organizer commitment is claimed.
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
          <a href="/pitch.pptx" className="text-button" download>
            Editable PowerPoint →
          </a>
          <a
            href="https://github.com/rmazz05/fairtix"
            className="text-button"
            target="_blank"
            rel="noreferrer"
          >
            Source and tests →
          </a>
        </div>
      </section>
      <section className="project-status">
        <h2>Before submission.</h2>
        <p>
          The public devnet deployment awaits test SOL. Email sign-in awaits a
          Privy app ID. The product brief also asks for a real club quote, which
          has not been obtained.
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
