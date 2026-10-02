# Browser and setup verification

Verified on 2 October 2026. Chain outcomes below come from actual transactions, not simulated UI state.

## Public deployment

Both programs are deployed on Solana devnet. Their deployed bytes match the binaries used by the recorded [13-check chain suite](chain-verification.json); addresses and binary hashes are in [the deployment report](devnet-deployment.json).

The project owner confirmed email login and a transaction signed with the embedded wallet. The rejected transaction was independently visible in the attempt log.

After the reported RPC 429, server calls were serialized, retries added for HTTP and JSON-RPC throttling, and confirmation moved to HTTP polling. Public purchases, rejected listings, signed direct-transfer attempts, permitted listings and cancellation were retested. Receipts are in [the public HTTP/browser report](devnet-http-verification.json).

The shared standard devnet RPC is retained for this submission at the project owner's request. It can still throttle under load. Event/listing reads are shared for up to two seconds within a server process; owner balances are fetched separately. Attempt-log reads use their own endpoint and a one-second cache. Confirmed transactions invalidate both caches in the process that confirms them. Errors are not cached.

## Two-account walkthrough

The new `/demo` route was tested in a local browser interface connected to the actual public devnet deployment, with Privy configured. An anonymous visitor could select the seller account without an email wallet, buy the example ticket, attempt a €60 listing, attempt a signed direct transfer, list at €27.50, switch to the buyer account and purchase the seller's listing. The organizer royalty total rose from €1.37 to €2.74. The listing is labeled by its demo account so concurrent visitors' listings are distinguishable.

Verified transaction receipts:

- Primary purchase: `4v545adzDvPnkLxVs9eBe1fT6BLSJ5brwMPp9pFWn2gS4TusEB7EgWAefgp922d8DP3zBM4DEkjxQXYFAT9sFrpj`.
- Rejected €60 listing: `2iXm5UigJ2JhgtFj8yDqRdpwgQGuDVEGxVgZW52y2Hds9vF3jhjQh3C5neMySk6dX7r9odjrbaGSTC66Qypxpcwu`.
- Rejected direct transfer: `33GCbYNPFE7EBGggbLqErzKvDja1mKzhwW3H9E3dP9PbQdiUucWDdHvkiNRHNyFmbzFKSinaWBWZa6onXeVMBQUU`.
- Permitted listing: `4sYMNAaaWkyLp7Bp4Z3gwoNdzacLXZduQFZczNCJAheekP9Sth4VqwXCsY4HE6CmnGwpbbFWkVfjgYDyRBEQ6g8X`.
- Completed resale: `3FYCU8uRkaFYN1YuDtE8dA1QbjDjoguZj67NMZHvXiAzG9riQh86aZpVQMPcUwV8pRgHpceuN2WuKJfaLgSVEzQb`.

The attempt log showed both new rejected transactions with Explorer links. Its response handling distinguishes a failed HTTP request from an actual empty log, retains previously loaded proofs on failure, and provides a retry action. The regression suite covers HTTP 503 and non-JSON responses explicitly.

## Clean checkout

A separate directory contained only repository files and a fresh `npm ci` install. The README's default interface-preview configuration served an explicitly disabled example with `ready: false`, no ownership and no connected ledger. TypeScript, the ten RPC/resilience checks and the production build passed.

The full local procedure was then executed with newly generated keys, Agave 4.3.0 and Anchor CLI 0.32.1. Both programs compiled, deployed to a fresh validator and seeded successfully. All 13 chain checks and all nine HTTP checks passed. These local program addresses are separate from the public deployment's addresses.

An intermittent consumed-response error found during the clean run was corrected by draining each upstream RPC response once and returning a fresh response body to the Solana client.

The final public guide was checked at 1280px and 390px, and the home page at 390px. In each case document width matched viewport width. Public buyer selection without email worked. Final captures and the check summary are in `docs/screenshots` and [submission verification](submission-verification.json).

## Submission materials

The final PDF, editable PowerPoint, MP4 and poster have a single canonical copy under `public/`. Their previously verified byte hashes are in [the material verification report](devnet-materials-verification.json).

The 89-second video shows a local browser interface connected to real devnet transactions, with cuts between captured states and captions. It is not a continuous recording. The eight-slide deck contains no invented organizer endorsement or pilot commitment. Native PowerPoint and Google Slides application behavior has not been tested. The PDF is public; the editable PowerPoint stays in the repository.
