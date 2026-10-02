# Fairtix

**Event tickets with an organizer-set resale cap.**

Fairtix lets a student club or small venue sell general-admission tickets, set the maximum resale price, and receive a royalty when a ticket changes hands. A buyer whose plans change can list their ticket within that cap or cancel an unsold listing.

[Try the app](https://fairtix-whu.vercel.app) · [Try a resale](https://fairtix-whu.vercel.app/demo) · [Pitch deck](https://fairtix-whu.vercel.app/pitch.pdf)

This is a working **Solana devnet prototype** built for the WHU challenge. All displayed euro amounts represent valueless test credits. There are no real payments or event admissions.

## The problem

An organizer can publish a resale policy, but a ticket that can be transferred freely can leave the marketplace where that policy is checked. A fan then has little assurance that the advertised cap governs the next sale. Organizers also lose visibility into those transfers and receive no share of a resale.

Fairtix puts the transfer restriction on the ticket itself. A normal signed wallet-to-wallet transfer fails. A permitted resale must pass the marketplace's price check and pay the seller, organizer and platform together.

For the example event, the face price is €25, the cap is €27.50 and the organizer's resale royalty is 5%:

| Action                             | Result                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| Ask €60 for the ticket             | The listing fails; the seller keeps the ticket.                                                   |
| Send it directly to another wallet | The transfer hook refuses it.                                                                     |
| Resell it for €27.50               | The buyer receives the ticket; the seller receives €25.58, the organizer €1.37 and Fairtix €0.55. |
| Cancel an unsold listing           | The escrowed ticket returns to the seller.                                                        |

Royalties and platform fees round down to whole cents; the seller receives the remainder. On a primary purchase, the organizer receives 97% and Fairtix receives 3%. Buyers pay the displayed price without an additional buyer fee.

## Try the working demo

Open [the resale demo](https://fairtix-whu.vercel.app/demo). Seller and buyer appear on one screen; no sign-in or wallet extension is required.

1. On the **Seller** side, leave the asking price at €60 and click **List ticket**. The program rejects it and the ticket stays with the seller.
2. Click **Use €27.50**, then **List ticket**. The listing appears on the **Buyer** side.
3. Click **Buy ticket for €27.50**. The buyer receives the ticket; the payment breakdown and Solana transaction links appear below.

The seller can also open **Test a direct transfer** to attempt a signed wallet-to-wallet transfer. It is refused by the transfer hook. The demo prepares its two browser-owned accounts, funds them with test credits and covers network fees. Both sides sign their own real devnet transactions. A pending signed transaction is saved before submission so a lost response or page refresh can resume without signing a duplicate purchase. These demo keys are separate from the app's email account and should never receive real assets.

Email sign-in remains available in the ticket app through Privy and creates an embedded Solana wallet.

An organizer can use **Create an event** to choose a name, venue, date, supply, face price, resale markup and royalty. The markup is bounded to 0–25%; the royalty to 0–10%. These event rules cannot be edited through the current program.

## How Solana is used

**Token-2022 tickets.** Each event has one mint with zero decimals. One whole token represents one general-admission ticket. Tickets are minted on purchase, and the event's supply bounds the number that can be sold. These are interchangeable admission units, not individual seat NFTs.

**Transfer hook.** The mint attaches a separate program that is called by Token-2022 when a ticket moves. It allows movement into a valid marketplace listing's escrow and out during a resale or cancellation. It rejects a direct transfer even when the ticket owner signs it. Ticket token accounts have immutable ownership, closing the token-account-owner change route.

**Marketplace escrow and atomic settlement.** The marketplace program checks the organizer's cap before accepting a listing. A program-derived account controls the escrow. A resale releases the ticket and splits the payment in a single transaction; if any part fails, all balance changes roll back. The hook is separate to avoid re-entering the marketplace during its Token-2022 transfer.

A database and Stripe could enforce a cap inside one application. Here, the ticket owner controls a Solana token, yet an external wallet still encounters the transfer restriction. The mint, program source and receipts can be inspected independently of the website. Solana's role is the enforceable transfer path and atomic settlement, rather than a crypto payment button added to checkout.

The application uses a two-decimal Token-2022 test-credit mint for payment. The server prepares transactions and signs only as the fee sponsor; the user signs as the ticket owner or buyer. The relay verifies all required signatures before submission. Event counters, listings and ownership are read from chain accounts. Failed-attempt logs read transaction receipts, since failed transactions cannot update counters. There is no application database.

Public addresses and deployed binary hashes are recorded in [the deployment report](docs/devnet-deployment.json). The runtime verifies devnet's genesis hash before sponsoring any public-network transaction and refuses mainnet.

## Run the interface locally

You only need **Node.js 22 and npm** to inspect the interface:

```bash
git clone https://github.com/rmazz05/fairtix.git
cd fairtix
npm ci
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3034**. The default configuration is explicitly labeled **Interface preview**. It shows the example ticket but disables purchases, transfers and creation. It needs no API key, sponsor key or blockchain installation. It does not simulate transactions.

To test actual transactions, use the public devnet demo or follow the full local setup below.

## Run the complete app on a local validator

Install **Rust**, **Agave 4.3.0 or newer** (including `solana`, `solana-test-validator` and `cargo-build-sbf`), and **Anchor CLI 0.32.1**, and place them on `PATH`.

Use a separate checkout for this setup. It generates local keys and changes program addresses in the Rust source, Anchor configuration and client files. These addresses belong to your deployment; they must not replace the deployed public app's addresses.

```bash
npm ci
npm run setup:local
npm run build:chain
npm run validator
```

Leave the validator running. In another terminal in the same directory:

```bash
solana airdrop 30 --keypair .keys/sponsor.json --url http://127.0.0.1:8920
solana program deploy chain/target/deploy/fairtix_market.so --program-id .keys/market.json --keypair .keys/sponsor.json --url http://127.0.0.1:8920
solana program deploy chain/target/deploy/fairtix_hook.so --program-id .keys/hook.json --keypair .keys/sponsor.json --url http://127.0.0.1:8920
npm run seed
npm run test:chain
npm run dev
```

The setup command configures `.env.local` for the local RPC and creates ignored test keys under `.keys/`. The build generates the program binaries and refreshes the Anchor IDL used by the frontend. The seed creates the credit mint and example event and saves their addresses in `.env.local`. Restart the web server after seeding if it was already running. To start a new empty ledger, stop the validator, remove the old `FAIRTIX_DEMO_EVENT` value, restart with `npm run validator -- --reset`, and seed again.

For devnet hosting, RPC configuration and email authentication, see [deployment setup](docs/deployment.md).

## Checks

```bash
npm run typecheck      # App, chain client and scripts
npm test               # RPC, read/error and demo recovery; no ledger needed
npm run build          # Next.js production build
npm run test:chain     # Requires your funded, seeded deployment
npm run test:http      # Requires the app running at localhost:3034
```

The recorded [13 devnet chain checks](docs/chain-verification.json) cover bounded supply, primary settlement, immutable token ownership, over-cap and direct-transfer rejection, escrow, cancellation authorization, ticket recovery, insufficient-payment rollback and resale payout. [Local chain results](docs/local-chain-verification.json) are retained separately.

The HTTP suite checks state, input and origin validation, sponsor signatures, unsigned relay rejection, metadata and the attempt-log endpoint. The RPC and resilience suites check HTTP/JSON-RPC throttling, serialized calls, coalesced reads, cache expiry/invalidation, failed-read recovery and errors that must not be mistaken for empty logs. The demo suite checks signed participants, separate listing and purchase, and recovery after a refresh or lost response without duplicate transactions. [Browser verification](docs/browser-verification.md) records actual app flows and responsive checks.

To run HTTP checks against the public deployment:

```bash
FAIRTIX_TEST_URL=https://fairtix-whu.vercel.app FAIRTIX_TEST_NETWORK=devnet npm run test:http
```

## Repository map

| Path                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `src/app/`                       | Pages, styling and server-side HTTP routes                                 |
| `src/components/`                | Ticket, checkout, organizer, account and demo interfaces                   |
| `src/lib/chain.ts`               | Anchor instructions and token account derivation                           |
| `src/lib/server.ts`              | Chain reads, devnet guard, sponsorship and transaction relay               |
| `chain/programs/fairtix_market/` | Event creation, bounded issuance, capped listings, cancellation and resale |
| `chain/programs/fairtix_hook/`   | Token-2022 transfer restriction                                            |
| `scripts/`                       | Local setup, builds, seed and verification suites                          |
| `docs/`                          | Setup instructions, verification records and editable pitch deck           |
| `public/`                        | Final pitch PDF and application assets                                     |

Private keys, environment files, dependencies, validator ledgers and build output are excluded from Git. The PDF has one canonical copy under `public/`. The [editable deck](docs/Fairtix-pitch.pptx) stays in the repository and is excluded from the website deployment.

## Current limits

- Test credits only. No real euro checkout, event admission, check-in, refunds, seated tickets or identity verification.
- Cash side deals and private-key sharing remain possible. The program enforces the recorded resale; it cannot inspect outside payments.
- Program upgrade authority is retained for development. An upgrade could change the software; immutability is not claimed.
- The prototype has not received an independent security audit. Sponsor and faucet throttling are best-effort within a server process.
- Public reads are shared briefly within a server process: up to two seconds for event/listing data and one second for attempt logs. Confirmed transactions invalidate those local caches. Owner balances are read separately. The shared public RPC can still throttle; an account-scoped devnet endpoint is recommended for hosted use.
- No organizer endorsement, paid customer, interview result or committed pilot is claimed. The first proposed pilot is a WHU student club.

The [WHU challenge](https://superteam.fun/earn/listing/build-at-whu) requires a working Solana prototype, a pitch-deck link, a public repository and participant eligibility. The public app and submission materials are linked at the top of this README.
