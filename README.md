# Fairtix

Tickets with a resale cap, for student clubs and small venues.

The organizer sets a face price, maximum resale markup and royalty. A fan can buy a ticket, list it within the cap, or cancel a listing. A completed resale pays the seller, organizer and platform atomically.

[Public devnet demo](https://fairtix-whu.vercel.app) · [Deck and devnet walkthrough](https://fairtix-whu.vercel.app/project)

This is a Solana test-credit prototype. It does not take real euro payments or admit anyone to a real event.

## Why Solana is part of the product

Every event has a Token-2022 mint. Each whole token is one general-admission ticket. The mint attaches a transfer hook which rejects direct transfers, including signed wallet-to-wallet transactions. Ticket accounts use immutable ownership so changing the token account owner cannot bypass the rule.

The marketplace checks the cap before moving a ticket into a listing’s escrow. Only the marketplace can sign for that escrow. Resale releases the ticket and splits the payment in a single transaction. The hook is a separate program because marketplace → Token-2022 → hook must not re-enter the marketplace.

A normal ticket database can enforce rules inside its own app. Here, an external wallet still encounters the same transfer rule, and anyone can inspect the mint, programs and transaction receipts. Cash side deals remain possible. The development upgrade authority is retained and could change the software in a future upgrade.

## The three proof moments

- A €60 listing fails for the example ticket capped at €27.50. The seller keeps the ticket.
- A direct transfer fails in the Token-2022 hook.
- A €27.50 resale pays €25.58 to the seller, €1.37 to the organizer and €0.55 to Fairtix. The buyer receives the ticket in that transaction.

The organizer dashboard reads actual event counters. Its blocked-attempt log reads failed transaction receipts because a failed transaction cannot change a counter.

## Run locally

Requirements: Node 22, Rust, Agave 4.3.0+, and Anchor CLI 0.32.1. The current Agave feature set requires SBPF v3 for new deployments; the build script specifies it.

```bash
npm ci
cp .env.example .env.local
npm run keys:local
npm run build:chain
npm run validator
```

In another terminal, fund the **public admin address in `chain/program-ids.json`** using the local faucet, then deploy the programs:

```bash
solana airdrop 30 ADMIN_ADDRESS --url http://127.0.0.1:8920
solana program deploy chain/target/deploy/fairtix_market.so --program-id .keys/market.json --keypair .keys/sponsor.json --url http://127.0.0.1:8920
solana program deploy chain/target/deploy/fairtix_hook.so --program-id .keys/hook.json --keypair .keys/sponsor.json --url http://127.0.0.1:8920
npm run seed
npm run test:chain
npm run dev
```

Open http://localhost:3034. The seed creates a clearly labeled example event. Test accounts can receive €100 in test credits; the server sponsors fees. The account drawer switches between two independent demo accounts, allowing one person to test a resale.

`keys:local` changes the public program addresses to match your new local keys. Do not deploy those changed addresses over an existing public instance. Private keys are never committed.

## Email sign-in

Email sign-in is configured on the public app and was confirmed by the project owner on 2 October 2026. See [the setup guide](docs/privy-setup.md). Email users receive an embedded Solana wallet; Phantom is also available through Privy’s Solana connectors. No Privy secret is needed by this frontend.

The app also offers explicitly labeled demo accounts stored in the browser. Signing out clears these test identities. They must never hold real funds.

## Deploy to devnet

Set `SOLANA_NETWORK=devnet` and `SOLANA_RPC_URL=https://api.devnet.solana.com`. The sponsor checks devnet’s genesis hash and refuses other public networks. On Vercel, localnet is always disabled.

The two programs currently reserve about 3.41 test SOL in rent. A deployment needs temporary buffer funding too; about 6 free devnet SOL is sufficient when deploying sequentially. Use a test-only sponsor. Deploy the same binaries with `--url devnet`, run `npm run seed` against devnet, then set the resulting example event in Vercel’s environment.

`FAIRTIX_PREVIEW=1` keeps an explicitly labeled example ticket visible while the programs are unavailable. Purchases and chain actions remain disabled. It does not simulate transactions or counters.

Server variables: `SOLANA_RPC_URL`, `SOLANA_NETWORK`, `SOLANA_SPONSOR_KEY` (a JSON key array, server only), `FAIRTIX_DEMO_EVENT`. `SOLANA_SPONSOR_KEY_PATH` is local development only. `FAIRTIX_EXCLUDED_EVENTS` can exclude specific automated-test event addresses from the public calendar.

Client variables: `NEXT_PUBLIC_PRIVY_APP_ID` and `NEXT_PUBLIC_SITE_URL`. Changing the Privy ID requires a fresh frontend build.

## Verification

`npm run test:chain` checks real token balances, mint supply and transaction failures against the configured deployment. The recorded results in [docs/chain-verification.json](docs/chain-verification.json) now document 13 successful checks on devnet, with transaction signatures. The earlier local run is preserved in [docs/local-chain-verification.json](docs/local-chain-verification.json). Deployed program bytes were compared with the tested binaries; addresses, deployment receipts and SHA-256 hashes are in [docs/devnet-deployment.json](docs/devnet-deployment.json).

`npm run test:http` checks the live state endpoint, origin and input validation, sponsor signatures and unsigned relay rejection. Start the local app before running it. For the public deployment, set `FAIRTIX_TEST_URL=https://fairtix-whu.vercel.app` and `FAIRTIX_TEST_NETWORK=devnet`. Browser checks are recorded in [docs/browser-verification.md](docs/browser-verification.md).

`npx tsx scripts/test-rpc.ts` checks bounded recovery for HTTP and JSON-RPC 429 responses, request serialization and plain retry messages. Transaction confirmation uses HTTP polling to avoid a WebSocket subscription for every serverless request. The public RPC remains a shared service and can still throttle under load.

`npm run typecheck` checks the full app and integration. `npm run build` produces the Next.js deployment. Private keys, environment files and validator ledgers are excluded from Git and Vercel uploads.

## Limits

No organizer testimonial or commitment is claimed. Demo credits have no euro value. There is no check-in, seat map, mainnet deployment, identity verification or real-money payment flow. Faucet throttling is best-effort per server process and is intended only for test credits.

## Challenge

[Build an MVP with Solana at WHU](https://superteam.fun/earn/listing/build-at-whu) closes on 4 October 2026 at 23:59 Berlin time. It requires WHU Hackathon 2026 participation, a pitch-deck link and a public repository. Submission remains a human action.
